// ─────────────────────────────────────────────
// SYNC — logical clocks for offline-first merge.
//
// There is no network here yet. This file exists so that by the time a backend
// lands, every edit already carries a timestamp saying when this device made
// it — retrofitting that later would leave all pre-existing progress
// indistinguishable from "never touched".
//
// The unit is a FIELD, not a blob. localStorage stores progress in five
// buckets (state/ctrs/cur/chartRow/grows), but a clock per bucket would call
// it a conflict whenever two devices touched any two steps. So each clock key
// names one field:
//
//   s:<stepId>     a step's done-flag (including '<stepId>__b<i>' sub-steps)
//   c:<stepId>     a step's row counter
//   cur            which phase is open
//   cr:<phaseId>   that chart phase's current row
//   global_rows    the project-wide row tally
//
// Ticking three Materials steps on a phone while an iPad sits on chart row 31
// touches disjoint keys, so both survive with nothing to ask the user about.
// ─────────────────────────────────────────────

// Chart rows are per-phase (see chartRows in state.js): a pattern can have
// several charts, each with its own position. The clock key has to match that
// granularity — one shared key would make a device on the gauge swatch and a
// device on the raglan look like they were fighting over the same row.
function chartRowKey(phaseId) { return 'cr:' + phaseId; }

// Difference between this device's clock and the server's, learned once per
// session in a later phase. Zero until then — but every stamp goes through
// syncNow() from the start, so switching it on is a one-line change rather
// than an audit of every call site.
let serverSkew = 0;

// A phone whose clock is three days fast would otherwise win every merge
// forever, and there is no way to repair timestamps already written. Clamping
// caps the damage at an hour.
const MAX_SKEW_MS = 60 * 60 * 1000;

function syncNow() {
  const skew = Math.max(-MAX_SKEW_MS, Math.min(MAX_SKEW_MS, serverSkew));
  return Date.now() + skew;
}

// Record that this device just changed `key`.
//
// Called at the mutation site rather than inside save(), which writes all five
// buckets every time and so cannot tell which field actually moved. The write
// to localStorage is left to the save() that each mutator already performs —
// stamping is a memory update, adding nothing to the chart-row tap path.
function stampClock(key) {
  if (!activeProjectId) return;
  clocks[key] = syncNow();
}

function stampClocks(keys) {
  keys.forEach(stampClock);
}

// True if `key` has been changed on this device since the last successful
// sync. Absent from `clocks` means never touched; absent from `baseClocks`
// means never synced, so any clock at all counts as a local edit.
function isDirty(key) {
  return (clocks[key] || 0) > (baseClocks[key] || 0);
}

// ─────────────────────────────────────────────
// OUTBOX — which entities have unpushed changes.
//
// (Lives here rather than in storage.js, where the original plan put it: it is
// read only by the flush path, alongside the clocks above, and keeping the
// whole sync state machine in one file beats matching a file assignment made
// before any of this existed.)
//
// It stores POINTERS, never bodies — an entry says "project X's progress has
// changed", not what it changed to. Two consequences, both wanted:
//
//   * Coalescing is free. A second change to the same entity is already
//     described by the entry that is there, so 60 chart-row taps leave exactly
//     one entry of a few dozen bytes rather than 60 snapshots.
//   * A replay always sends current data. flush() reads localStorage at send
//     time, so an op queued twenty rows ago pushes the twentieth row, not the
//     first. A body-carrying queue would push a stale snapshot and then have to
//     reconcile it against the newer one behind it.
// ─────────────────────────────────────────────
const OUTBOX_KEY = 'pt3_outbox';

function loadOutbox() {
  try { outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '{}') || {}; } catch(e) { outbox = {}; }
}
function saveOutbox() {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); } catch(e) {}
}

// kind is 'project' (the registry record) or 'progress' (that project's rows).
function enqueue(kind, id) {
  if (!id) return;
  const key = kind + ':' + id;
  // Already pending: there is nothing to update. `at` is deliberately the
  // FIRST time this entity went dirty ("has had unpushed changes since…"), not
  // the latest — which also means the common case costs one property read and
  // no localStorage write at all, keeping the chart-row tap path cheap.
  if (outbox[key]) return;
  outbox[key] = { k: kind, id: id, at: syncNow() };
  saveOutbox();
}

function dequeue(kind, id) {
  const key = kind + ':' + id;
  if (!outbox[key]) return;
  delete outbox[key];
  saveOutbox();
}

// Pending ops in send order: project upserts, then progress, then deletes.
//
// Upserts first because a progress row references its project, so pushing
// progress for a project the server has never seen would fail. Deletes last so
// a queued upsert cannot resurrect a row the same flush is about to tombstone.
function pendingOps() {
  const ops = Object.keys(outbox).map(k => outbox[k]);
  const rank = op => {
    if (op.k === 'project') return isDeleted(op.id) ? 2 : 0;
    return 1; // progress
  };
  return ops.sort((a, b) => rank(a) - rank(b) || a.at - b.at);
}

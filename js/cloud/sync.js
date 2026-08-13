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
// FIELD-KEY ADAPTERS
//
// Three representations of the same progress, and everything below converts
// between them:
//
//   localStorage   five buckets — state / ctrs / cur / chartRows / grows
//   field keys     one flat map, {'s:collar-1': true, 'cr:yoke': 31, …}
//   server columns steps / counters / cur / chart_rows / global_rows
//
// The flat form is the only one the merge can work in — a clock per bucket
// would call it a conflict whenever two devices touched any two steps — while
// the other two are fixed by what already exists on disk and in Postgres. So
// the conversion is not incidental plumbing; it is the seam that lets the
// merge stay per-field without rewriting how the app saves.
//
// Values are compared with === in diffProgress(), so the types have to survive
// a JSON round trip through Postgres unchanged: booleans stay booleans and
// counters stay integers, never the strings localStorage would hand back.
// ─────────────────────────────────────────────
function projKey(projectId, suffix) { return 'pt3_proj_' + projectId + '_' + suffix; }

function lsGet(projectId, suffix) {
  try { return localStorage.getItem(projKey(projectId, suffix)); } catch(e) { return null; }
}
function lsGetJson(projectId, suffix, fallback) {
  try { return JSON.parse(lsGet(projectId, suffix) || 'null') || fallback; } catch(e) { return fallback; }
}

// Which phase a pre-per-phase `chartRow` scalar belonged to: the pattern's only
// chart phase. Shared with migrateAddClocks() so the clock and the value can
// never be attributed to different phases.
function legacyChartPhaseId(projectId) {
  const proj = projects.find(p => p.id === projectId);
  const pat = proj && patternById(proj.patternId);
  const phase = pat && pat.phases.find(ph => ph.hasChart);
  return phase ? phase.id : null;
}

// A project's saved progress as { values, clocks } in field-key space.
//
// Read from localStorage even for the project that is currently open, rather
// than from the live globals: every mutator calls save() before anything can
// reach here, so the two agree, and one source means the merge cannot see a
// different project state than the one that would survive a reload.
function readLocalProgress(projectId) {
  const values = {};
  const st = lsGetJson(projectId, 'state', {});
  Object.keys(st).forEach(id => { values['s:' + id] = !!st[id]; });
  const ct = lsGetJson(projectId, 'ctrs', {});
  Object.keys(ct).forEach(id => { values['c:' + id] = ct[id] | 0; });

  const cu = lsGet(projectId, 'cur');
  values.cur = cu === null ? 0 : (parseInt(cu) || 0);
  const gr = lsGet(projectId, 'grows');
  values.global_rows = gr === null ? 0 : (parseInt(gr) || 0);

  const rows = lsGetJson(projectId, 'chartRows', null);
  if (rows) {
    Object.keys(rows).forEach(pid => { values[chartRowKey(pid)] = rows[pid] | 0; });
  } else {
    // Progress saved before charts became per-phase. migrateAddClocks() already
    // wrote a cr:<phaseId> clock for it; skipping the value here would push a
    // clock with nothing behind it, which the merge treats as malformed and
    // ignores — so the row someone knitted would never leave this device.
    const legacy = lsGet(projectId, 'chartRow');
    const phaseId = legacy !== null && legacyChartPhaseId(projectId);
    if (phaseId) values[chartRowKey(phaseId)] = parseInt(legacy) || 1;
  }

  return { values: values, clocks: lsGetJson(projectId, 'clk', {}) };
}

// Field keys → the bucketed shape both localStorage and Postgres store.
// Unknown prefixes are dropped rather than guessed at: a key this version does
// not understand belongs to a newer one, and inventing a bucket for it would
// write nonsense that later versions then have to unpick.
function splitFields(values) {
  const steps = {}, counters = {}, chart_rows = {};
  let cur = 0, global_rows = 0;
  Object.keys(values || {}).forEach(k => {
    const v = values[k];
    if (k.indexOf('s:') === 0)       steps[k.slice(2)] = !!v;
    else if (k.indexOf('c:') === 0)  counters[k.slice(2)] = v | 0;
    else if (k.indexOf('cr:') === 0) chart_rows[k.slice(3)] = v | 0;
    else if (k === 'cur')            cur = v | 0;
    else if (k === 'global_rows')    global_rows = v | 0;
  });
  return { steps, counters, cur, chart_rows, global_rows };
}

// The inverse, over a row as Postgres returns it.
function joinFields(row) {
  const values = {};
  const steps = (row && row.steps) || {};
  Object.keys(steps).forEach(id => { values['s:' + id] = !!steps[id]; });
  const counters = (row && row.counters) || {};
  Object.keys(counters).forEach(id => { values['c:' + id] = counters[id] | 0; });
  const rows = (row && row.chart_rows) || {};
  Object.keys(rows).forEach(pid => { values[chartRowKey(pid)] = rows[pid] | 0; });
  values.cur = (row && row.cur) | 0;
  values.global_rows = (row && row.global_rows) | 0;
  return { values: values, clocks: (row && row.clocks) || {} };
}

// Write merged progress back to a project's localStorage buckets.
//
// `base` is written alongside because the two only mean anything together: a
// merge that persisted values without recording what was agreed would leave
// every merged field looking locally-edited forever, and the next sync would
// push it all back as if this device had made the changes.
//
// Returns false if the write failed, so a caller never advances a sync cursor
// past data that is not actually on disk.
function writeLocalProgress(projectId, values, clocks, base) {
  const f = splitFields(values);
  try {
    localStorage.setItem(projKey(projectId, 'state'), JSON.stringify(f.steps));
    localStorage.setItem(projKey(projectId, 'ctrs'), JSON.stringify(f.counters));
    localStorage.setItem(projKey(projectId, 'cur'), f.cur);
    localStorage.setItem(projKey(projectId, 'chartRows'), JSON.stringify(f.chart_rows));
    localStorage.setItem(projKey(projectId, 'grows'), f.global_rows);
    localStorage.setItem(projKey(projectId, 'clk'), JSON.stringify(clocks || {}));
    if (base) localStorage.setItem(projKey(projectId, 'base'), JSON.stringify(base));
  } catch(e) {
    if (typeof showSaveError === 'function') showSaveError(e);
    return false;
  }
  return true;
}

// Just the baseline, for the push path — which advances `base` without having
// touched any value.
function writeBase(projectId, base) {
  try { localStorage.setItem(projKey(projectId, 'base'), JSON.stringify(base || {})); return true; }
  catch(e) { if (typeof showSaveError === 'function') showSaveError(e); return false; }
}
function readBase(projectId) { return lsGetJson(projectId, 'base', {}); }

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
  if (!outbox[key]) {
    outbox[key] = { k: kind, id: id, at: syncNow() };
    saveOutbox();
  }
  // Outside the guard on purpose. The write is skippable; the scheduling is
  // not — every tap has to push the debounce back, or a 60-tap burst would
  // flush 2.5s after the FIRST tap and then keep re-firing through the rest.
  markDirty();
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

function hasPending() { return Object.keys(outbox).length > 0; }

// ─────────────────────────────────────────────
// FLUSH SCHEDULING
//
// Knitting is a burst of tiny edits — a row tap every few seconds for an hour.
// Pushing each one would be a request per stitch row; waiting for a natural
// pause would mean never pushing at all for a knitter working steadily. So:
// a trailing debounce, bounded by a max wait.
//
//   debounce  each edit pushes the flush back, so a burst settles into one
//   max wait  but a burst can only delay it so far — a steady worker still
//             syncs every 20s, rather than only when they finally stop
//
// Plus immediate flushes at the moments the page might not get another chance:
// backgrounding, unload, leaving a project, and coming back online.
// ─────────────────────────────────────────────
const FLUSH_DEBOUNCE_MS = 2500;
const FLUSH_MAX_WAIT_MS = 20000;

let flushTimer = null;
let burstStartedAt = 0;   // 0 = no burst in progress
let flushing = false;

function markDirty() {
  if (!hasPending()) return;
  const now = Date.now();
  if (!burstStartedAt) burstStartedAt = now;
  // Never let the debounce push past the burst's deadline.
  const untilDeadline = Math.max(0, (burstStartedAt + FLUSH_MAX_WAIT_MS) - now);
  const delay = Math.min(FLUSH_DEBOUNCE_MS, untilDeadline);
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(delay === untilDeadline ? 'max-wait' : 'debounce'), delay);
}

function cancelScheduledFlush() {
  clearTimeout(flushTimer);
  flushTimer = null;
  burstStartedAt = 0;
}

// Skip the wait — used where the page may not survive to run the timer.
function flushNow(reason) {
  cancelScheduledFlush();
  flush(reason);
}

// STUB until a backend exists (Phase 6).
//
// It deliberately does NOT clear the outbox. Nothing has been sent, so
// dropping the ops here would silently discard the very changes this whole
// mechanism exists to preserve. The outbox is cleared per-op by the real
// flush, only once the server has acknowledged that op.
function flush(reason) {
  cancelScheduledFlush();
  if (!hasPending()) return;
  if (flushing) return;                 // a real flush is async; don't overlap
  if (!navigator.onLine) {
    // Not an error — the `online` listener below picks it up again.
    console.info('[sync] offline, deferring flush (' + reason + '):', pendingOps().length, 'op(s)');
    return;
  }
  const ops = pendingOps();
  console.info('[sync] flush (' + reason + '):', ops.map(o => o.k + ':' + o.id).join(', '));
  // ...network push lands here. Outbox intentionally left intact.
}

// ─────────────────────────────────────────────
// THREE-WAY MERGE
//
// Pure. No I/O, no globals — everything comes in as arguments, which is what
// makes it testable without a backend (see sync.selftest.js).
//
// Detecting a real conflict needs a BASELINE: what both sides agreed on at the
// last successful sync. With only two versions you cannot tell "the other side
// is simply stale" from "the other side diverged", so you either prompt
// constantly or lose data silently. With a baseline, per field:
//
//   local changed?  remote changed?  →  action
//   no              no                  nothing
//   yes             no                  keep local
//   no              yes                 take remote
//   yes             yes, values differ  CONFLICT — ask
//   yes             yes, values equal   agreed independently, no prompt
//
// where "changed" means clock > baseClock.
//
// This is what makes the common case invisible. Tick three Materials steps on
// the phone while the iPad sits on chart row 31: those are different fields, so
// both survive untouched and nobody is asked anything.
//
//   local / remote  { values: {fieldKey: value}, clocks: {fieldKey: epoch_ms} }
//   base            {fieldKey: epoch_ms}
//   → { merged, mergedClocks, conflicts }
//
// Conflicted fields are left at the LOCAL value in `merged`. That is the safe
// default — it is what is already on screen — and it means a caller that
// ignores `conflicts` still behaves sanely rather than silently adopting the
// other device's value.
// ─────────────────────────────────────────────
function diffProgress(local, remote, base) {
  const lv = (local && local.values) || {}, lc = (local && local.clocks) || {};
  const rv = (remote && remote.values) || {}, rc = (remote && remote.clocks) || {};
  const bc = base || {};

  const merged = Object.assign({}, lv);
  const mergedClocks = Object.assign({}, lc);
  const conflicts = [];

  const keys = new Set(
    Object.keys(lv).concat(Object.keys(rv), Object.keys(lc), Object.keys(rc))
  );

  keys.forEach(k => {
    const lClock = lc[k] || 0, rClock = rc[k] || 0, bClock = bc[k] || 0;
    const localChanged  = lClock > bClock;
    const remoteChanged = rClock > bClock;

    if (!remoteChanged) return;          // nothing to take; local already stands
    // A clock with no value behind it is malformed — taking it would delete a
    // field on the strength of a timestamp alone.
    if (!Object.prototype.hasOwnProperty.call(rv, k)) return;

    if (!localChanged) {                 // only the other side moved
      merged[k] = rv[k];
      mergedClocks[k] = rClock;
      return;
    }
    if (lv[k] === rv[k]) {               // both moved, and agreed
      mergedClocks[k] = Math.max(lClock, rClock);
      return;
    }
    conflicts.push({ key: k, local: lv[k], remote: rv[k], localClock: lClock, remoteClock: rClock });
  });

  return { merged, mergedClocks, conflicts };
}

// Backgrounding is the last reliable moment on mobile — a phone may freeze or
// kill the tab without ever firing anything else.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushNow('hidden');
});
window.addEventListener('pagehide', () => flushNow('pagehide'));
window.addEventListener('online', () => flushNow('online'));

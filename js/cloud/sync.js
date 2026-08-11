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

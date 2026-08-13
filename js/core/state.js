// ─────────────────────────────────────────────
// APP STATE + ACTIVE-PATTERN POINTERS
//
// Loaded first. Classic script, not a module — everything here is a global,
// which is what lets the inline onclick handlers in the generated HTML keep
// working without any window.* plumbing.
//
// Nothing in this file runs at load beyond the declarations below, so it is
// safe to load ahead of the pattern data and the render code it refers to;
// function bodies resolve their identifiers when called, not when defined.
// ─────────────────────────────────────────────

// The pattern registry. Each js/patterns/*.js file pushes its own entry, so
// the load order of those files is the order they appear in the picker.
const PATTERNS = [];

// Active-pattern pointers, reassigned by applyPattern() to whichever registry
// entry the open project uses. This is what keeps every renderer
// pattern-agnostic.
//
// NB these are live references INTO the registry, not copies: after
// applyPattern(p), PHASES === p.phases and CHART_B === (the active phase's
// chart). Mutating PHASES[i] therefore edits the pattern itself, for every
// project using it. Nothing does that today (the one offender, a
// chart-override that spliced CHART_B in place, is gone), and the rule is
// that nothing may start. When patterns become per-project snapshots this
// needs to become a real copy or a deep freeze.
let PHASES = [];
let CHART_B = [];
let CHART_TOTAL = 0;

// Progress + view state for the currently open project.
let TOTAL_STEPS = 0;
let cur = 0;
let phaseNavOpen = false;
// `state` and `ctrs` are PRE-CONVERSION RELICS. Nothing writes them any more;
// migrateToEntries() read them into entryProg and they are kept on disk only
// as the record of what a project looked like before. No `globalRows` either:
// the Rows tally is derived (globalRowsNow() in js/core/app.js), where it used
// to be a stored number five mutators nudged by hand — nothing could
// reconstruct it, so it could only drift, and did.
let state = {}, ctrs = {}, chartCurrentRow = 1, cellSz = 16;

// Progress. A flat map keyed the way js/core/rows.js documents: 'n:<id>' /
// 'r:<id>' for done-flags, 'rp:<id>' for a repeat's {y,z} position. Synced to
// its own `entries` jsonb column — reusing `counters` would have pushed a
// {y,z} through joinFields(), which coerces with |0 and would flatten the
// position to zero.
let entryProg = {};
// The resolved pattern doc behind PHASES — see applyPattern().
let activeDoc = null;

// Sync bookkeeping for the open project (see js/cloud/sync.js).
//   clocks     {fieldKey: epoch_ms}  when this device last changed each field
//   baseClocks {fieldKey: epoch_ms}  the clocks as of the last successful sync
// Field keys are namespaced — 'n:<id>', 'r:<id>', 'rp:<id>', plus bare 'cur'
// and 'cr:<phaseId>' — NOT the localStorage suffixes, so a clock identifies
// one field rather than the whole blob it is stored in. 'rp:' is ONE key for
// the {y,z} pair: taking y from one device and z from another yields a
// position neither device was ever at.
let clocks = {}, baseClocks = {};

// Pending changes not yet pushed to the cloud, keyed '<kind>:<projectId>' so a
// second change to the same entity cannot create a second entry. App-wide, not
// per-project — it outlives whichever project happens to be open. See
// js/cloud/sync.js.
let outbox = {};
let activePatternId = null;
let activeProjectId = null;
// Set by activateProject(). `patternChanged` means the code's pattern no longer
// matches the structure this project started on; `patternFrozen` means we are
// rendering the frozen snapshot rather than the live pattern. They differ only
// when the snapshot is missing or unreadable — see activateProject().
let patternChanged = false, patternFrozen = false;
// Includes tombstones — records with `deletedAt` set. Use liveProjects() for
// anything user-facing; the raw array is what gets persisted and synced.
let projects = [];                 // [{ id, patternId, name, created, updatedAt, deletedAt? }]
let view = 'home';                 // 'home' | 'picker' | 'project'

function patternById(id) { return PATTERNS.find(p => p.id === id) || null; }
function activePattern() { return patternById(activePatternId); }
function activeProject() { return projects.find(p => p.id === activeProjectId) || null; }

// A pattern's `chart` field is a fallback shared by every hasChart phase
// that doesn't set its own. Most patterns have exactly one chart-having
// phase and never need to set phase.chart at all; a pattern with more than
// one (e.g. Frost Flower's gauge swatch + raglan) sets `chart` on each
// phase that needs a different one.
function chartForPhase(phase) {
  return (phase && phase.chart) || (activePattern() && activePattern().chart) || [];
}

// Each hasChart phase tracks its own current row, keyed by phase id, so
// switching phases doesn't clobber a different chart's position. chartRows
// is the persisted source of truth; chartCurrentRow stays a plain scalar —
// "whichever chart phase is active right now" — since every chart.js call
// site only ever cares about that one, not the whole map.
let chartRows = {};

// Refresh CHART_B/CHART_TOTAL/chartCurrentRow for whichever phase is
// current. Call this whenever `cur` changes or PHASES is reassigned —
// applyPattern(), go(), and loadProjectState() (after restoring `cur` and
// `chartRows`) are the three places that can happen.
function syncActiveChart() {
  const phase = PHASES[cur];
  CHART_B = chartForPhase(phase);
  CHART_TOTAL = CHART_B.length;
  if (phase && phase.hasChart) {
    chartCurrentRow = Math.max(1, Math.min(CHART_TOTAL, chartRows[phase.id] || 1));
  }
}

// ─────────────────────────────────────────────
// PATTERN STRUCTURE HASH
//
// Patterns are hardcoded and ship with the deploy, so a text edit reaches
// everyone the moment it lands — fix a typo, push, done. That is the point,
// and it must keep working.
//
// The danger is STRUCTURAL edits. Progress is keyed on step ids, so adding,
// removing or renaming a step moves someone's ticks onto the wrong rows or
// drops them entirely, silently, in the middle of a half-knitted sweater.
//
// So: hash the structure, not the prose. Same hash → use the live pattern and
// let text edits flow. Different hash → the project keeps knitting the version
// it started on until its owner says otherwise.
//
// What counts as structure is "anything that changes the set of progress keys
// or what they mean":
//
//   phase id            keys are namespaced by it (cr:<phaseId>)
//   phase.hasChart      adds or removes a chart-row key
//   chart length        changes the range a saved chart row is valid in
//   entry id + kind     the key itself, and which namespace it is in
//   repeat.times        a position at pass 4 of 4 means something else of 6
//   repeat row ids      how far a stored {y,z} can legitimately reach
//   bullets.length      changes what a note renders
//
// Prose — a step's text, a phase's name, notes — is deliberately absent.
// ─────────────────────────────────────────────
function chartForPhaseOf(pattern, phase) {
  return (phase && phase.chart) || (pattern && pattern.chart) || [];
}

function structSignature(pattern) {
  return ((pattern && pattern.phases) || []).map(ph => [
    ph.id,
    ph.hasChart ? 'C' + chartForPhaseOf(pattern, ph).length : '-',
    // Everything that decides what a progress key MEANS is in here: the kind
    // (a row's done-flag and a repeat's position are different keys), the
    // repeat's times and its row ids (both change how far a stored {y,z} can
    // reach). Prose — a step's text, a phase's name, notes — stays out.
    'E' + (ph.entries || []).map(e => [
      e.kind === 'note' ? 'n' : e.kind === 'row' ? 'r' : 'p',
      e.id,
      e.kind === 'repeat'
        ? 'x' + (e.times | 0) + 'x' + ((e.rows || []).map(r => r.id).join('+'))
        : '-',
      e.bullets ? 'b' + e.bullets.length : '-'
    ].join(':')).join(',')
  ].join('|')).join(';');
}

// Two FNV-1a passes with different offset bases, concatenated. One 32-bit hash
// would be small enough that a collision is worth worrying about, and a
// collision here fails in the silent direction: the app would decide a changed
// pattern was unchanged and quietly remap progress onto it.
function structHash(pattern) {
  const s = structSignature(pattern);
  const fnv = seed => {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  };
  return fnv(0x811c9dc5) + fnv(0x01000193);
}

// Swap the active-pattern data pointers (PHASES / CHART_B / …) + reset step
// defaults. No load — the caller loads the project's progress.
function applyPattern(p) {
  PHASES = p.phases;
  // The resolved pattern doc — live registry entry or a project's frozen
  // snapshot, whichever PHASES came from. Needed wherever a helper has to
  // reason about the whole pattern (absoluteRow), since activePattern()
  // always returns the LIVE entry and would be the wrong one for a frozen
  // project.
  activeDoc = p;
  TOTAL_STEPS = PHASES.reduce((a, ph) => a + (ph.entries || ph.steps || []).length, 0);
  cur = 0; chartRows = {};
  state = {}; ctrs = {}; entryProg = {};
  clocks = {}; baseClocks = {};
  PHASES.forEach(ph => (ph.steps || []).forEach(s => { state[s.id] = false; if (s.rows) ctrs[s.id] = 0; }));
  syncActiveChart();
}

// Open a project: apply its pattern's data, then load that project's progress.
function activateProject(projectId) {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return false;
  // A tombstone still has an id, so a stale card left on screen — or a remote
  // delete arriving while the home list is rendered — can still route here.
  // Its progress keys are already purged, so opening it would show a project
  // reset to zero rather than the one the user deleted.
  if (proj.deletedAt) return false;
  // No fallback pattern on purpose. Opening a project under the *wrong*
  // pattern is worse than not opening it: loadProjectState() would
  // Object.assign this project's saved step-ids onto a different pattern's
  // step set, silently corrupting both.
  const resolved = patternForProject(proj);
  if (!resolved.pattern) { console.warn('No pattern "' + proj.patternId + '" for project "' + proj.name + '"'); return false; }

  activeProjectId = proj.id;
  activePatternId = proj.patternId;
  patternChanged = resolved.changed;
  patternFrozen = resolved.frozen;

  applyPattern(resolved.pattern);
  loadProjectState();
  return true;
}

// Which version of the pattern a project knits, and why.
//
// Same structure → the live pattern, so a typo fixed this morning is there this
// afternoon. Different structure → the frozen snapshot, so the ticks stay on
// the rows they were put on. Knitting continues either way; a chip is the only
// thing that appears, and only until it is answered.
//
// The snapshot is 10-40KB of JSON, so it is only parsed when the cheap check —
// a stored hash string against a hash of the live pattern — says it is needed.
// renderHome() calls this once per card on every render.
function patternForProject(proj) {
  const live = proj && patternById(proj.patternId);
  if (!live) return { pattern: null, changed: false, frozen: false };

  const stored = storedHash(proj.id);
  if (!stored || stored === structHash(live)) return { pattern: live, changed: false, frozen: false };

  const frozen = frozenPattern(proj.id);
  // No snapshot (a project from before this existed, or storage was cleared):
  // fall back to live. Opening on a slightly wrong structure beats refusing to
  // open at all — but this must NOT quietly re-stamp the new hash, which is the
  // silent remap the whole mechanism exists to prevent. The chip still appears
  // and adopting is still the user's call.
  if (!frozen) return { pattern: live, changed: true, frozen: false };
  return { pattern: frozen, changed: true, frozen: true };
}

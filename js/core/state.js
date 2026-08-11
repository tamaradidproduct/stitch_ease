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
let state = {}, ctrs = {}, chartCurrentRow = 1, cellSz = 16, globalRows = 0;

// Sync bookkeeping for the open project (see js/cloud/sync.js).
//   clocks     {fieldKey: epoch_ms}  when this device last changed each field
//   baseClocks {fieldKey: epoch_ms}  the clocks as of the last successful sync
// Field keys are namespaced — 's:<stepId>', 'c:<stepId>', plus bare 'cur',
// 'chart_row', 'global_rows' — NOT the localStorage suffixes, so a clock
// identifies one field rather than the whole blob it is stored in.
let clocks = {}, baseClocks = {};

// Pending changes not yet pushed to the cloud, keyed '<kind>:<projectId>' so a
// second change to the same entity cannot create a second entry. App-wide, not
// per-project — it outlives whichever project happens to be open. See
// js/cloud/sync.js.
let outbox = {};
let activePatternId = null;
let activeProjectId = null;
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

// Swap the active-pattern data pointers (PHASES / CHART_B / …) + reset step
// defaults. No load — the caller loads the project's progress.
function applyPattern(p) {
  PHASES = p.phases;
  TOTAL_STEPS = PHASES.reduce((a, ph) => a + ph.steps.length, 0);
  cur = 0; chartRows = {}; globalRows = 0;
  state = {}; ctrs = {};
  clocks = {}; baseClocks = {};
  PHASES.forEach(ph => ph.steps.forEach(s => { state[s.id] = false; if (s.rows) ctrs[s.id] = 0; }));
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
  const pat = patternById(proj.patternId);
  if (!pat) { console.warn('No pattern "' + proj.patternId + '" for project "' + proj.name + '"'); return false; }
  activeProjectId = proj.id;
  activePatternId = pat.id;
  applyPattern(pat);
  loadProjectState();
  return true;
}

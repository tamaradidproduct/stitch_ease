// ─────────────────────────────────────────────
// PERSISTENCE — everything that touches localStorage.
//
// Keys, all under the pt3_ prefix (see CLAUDE.md; do not rename — the
// migrations below depend on the exact strings):
//   pt3_projects                  the registry: [{ id, patternId, name, created }]
//   pt3_proj_<id>_state           {stepId: bool}   completed steps
//   pt3_proj_<id>_ctrs            {stepId: int}    row counters
//   pt3_proj_<id>_cur             current phase index
//   pt3_proj_<id>_chartRows       {phaseId: row} — per chart phase (see below)
//   pt3_proj_<id>_chartRow        LEGACY single chart row; read once by
//                                 loadProjectState() when chartRows is absent,
//                                 then superseded. Kept readable forever so
//                                 old saved progress isn't lost.
//   pt3_proj_<id>_grows           project-wide row tally
//   pt3_proj_<id>_clk             {fieldKey: epoch_ms} last local change per field
//   pt3_proj_<id>_base            {fieldKey: epoch_ms} clocks at last sync
//   pt3_schema                    migration sentinel — GLOBAL
//   pt3_cellSz                    chart cell size — GLOBAL, shared across projects
// ─────────────────────────────────────────────

// ── Projects registry (pt3_projects) ──
function loadProjects() {
  try { projects = JSON.parse(localStorage.getItem('pt3_projects') || '[]') || []; } catch(e) { projects = []; }
}
function saveProjects() {
  try { localStorage.setItem('pt3_projects', JSON.stringify(projects)); } catch(e) {}
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Auto-name: pattern name, then "<name> 2", "<name> 3"… for repeats.
function autoProjectName(pattern) {
  const n = projects.filter(p => p.patternId === pattern.id).length;
  return n === 0 ? pattern.name : pattern.name + ' ' + (n + 1);
}

function createProject(patternId) {
  const pat = patternById(patternId);
  if (!pat) { console.warn('No pattern "' + patternId + '"'); return null; }
  const proj = { id: newId(), patternId: pat.id, name: autoProjectName(pat), created: Date.now() };
  projects.push(proj);
  saveProjects();
  return proj;
}

function renameProject(projectId) {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  const name = prompt('Rename project', proj.name);
  if (name === null) return;
  const trimmed = name.trim();
  if (trimmed) { proj.name = trimmed; saveProjects(); resetHeaderKey(); render(); }
}

function deleteProject(projectId) {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  if (!confirm('Delete "' + proj.name + '"? This removes its progress.')) return;
  ['state','ctrs','cur','chartRow','chartRows','grows','clk','base'].forEach(k => { try { localStorage.removeItem('pt3_proj_' + projectId + '_' + k); } catch(e){} });
  projects = projects.filter(p => p.id !== projectId);
  saveProjects();
  if (activeProjectId === projectId) { activeProjectId = null; view = 'home'; }
  render();
}

// ── Per-project persistence (pt3_proj_<id>_*); cellSz is a global pref. ──
function pkey(suffix) { return 'pt3_proj_' + activeProjectId + '_' + suffix; }

// localStorage IS the progress. A swallowed write means the row the user
// just counted is gone on reload, with nothing on screen to say so — so a
// failed save has to be visible even though there's nothing we can do
// about it automatically.
let saveFailed = false;
function isQuotaError(e) {
  return e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
               e.code === 22 || e.code === 1014);
}

function showSaveError(e) {
  console.error('save() failed — progress is not being written', e);
  if (saveFailed) return;
  saveFailed = true;
  const b = document.createElement('div');
  b.id = 'save-error';
  b.textContent = isQuotaError(e)
    ? 'Out of storage — progress isn’t being saved. Delete a finished project to free space.'
    : 'Progress isn’t being saved on this device. Private browsing can cause this.';
  // First in the stack, so the tappable update banner stays nearest the thumb.
  bannerStack().prepend(b);
}

function clearSaveError() {
  if (!saveFailed) return;
  saveFailed = false;
  const b = document.getElementById('save-error');
  if (b) b.remove();
  pruneBannerStack();
}

function save() {
  try { localStorage.setItem('pt3_cellSz', cellSz); } catch(e) {}
  if (!activeProjectId) return;
  try {
    localStorage.setItem(pkey('state'), JSON.stringify(state));
    localStorage.setItem(pkey('ctrs'), JSON.stringify(ctrs));
    localStorage.setItem(pkey('cur'), cur);
    localStorage.setItem(pkey('chartRows'), JSON.stringify(chartRows));
    localStorage.setItem(pkey('grows'), globalRows);
    // `clk` rides along with the data it describes: every mutator stamps the
    // in-memory map and then calls save(), so one write keeps them in step.
    // Persisting it separately would risk a crash between the two leaving a
    // value saved with no clock, which the merge engine reads as "unchanged".
    localStorage.setItem(pkey('clk'), JSON.stringify(clocks));
    // `base` does NOT change here — only a completed sync moves it. It is
    // rewritten (identically) purely so one function owns the whole of a
    // project's persisted state; measured at ~0.004ms, well inside the
    // chart-row tap budget.
    localStorage.setItem(pkey('base'), JSON.stringify(baseClocks));
    clearSaveError();
  } catch(e) {
    showSaveError(e);
  }
}

function loadProjectState() {
  try {
    const st = localStorage.getItem(pkey('state')); if (st) state = Object.assign(state, JSON.parse(st));
    const ct = localStorage.getItem(pkey('ctrs')); if (ct) ctrs = Object.assign(ctrs, JSON.parse(ct));
    const cu = localStorage.getItem(pkey('cur')); if (cu !== null) cur = Math.max(0, Math.min(PHASES.length - 1, parseInt(cu) || 0));

    const crs = localStorage.getItem(pkey('chartRows'));
    if (crs) {
      chartRows = JSON.parse(crs) || {};
    } else {
      // Migrate the legacy single-chart row: it belonged to whichever phase
      // was the pattern's only hasChart phase, so attribute it there rather
      // than dropping progress on the floor.
      const legacy = localStorage.getItem(pkey('chartRow'));
      const chartPhase = PHASES.find(p => p.hasChart);
      if (legacy !== null && chartPhase) chartRows = { [chartPhase.id]: parseInt(legacy) || 1 };
    }

    const gr = localStorage.getItem(pkey('grows')); if (gr !== null) globalRows = Math.max(0, parseInt(gr) || 0);
    const ck = localStorage.getItem(pkey('clk'));  if (ck) clocks = JSON.parse(ck) || {};
    const bs = localStorage.getItem(pkey('base')); if (bs) baseClocks = JSON.parse(bs) || {};
  } catch(e) {}
  // `cur` and `chartRows` are both restored above, so the active chart and
  // its row have to be recomputed from them.
  syncActiveChart();
}

// Global (non-project) prefs.
function loadGlobal() {
  try {
    const cs = localStorage.getItem('pt3_cellSz'); if (cs !== null) cellSz = Math.max(10, Math.min(32, parseInt(cs)));
    document.documentElement.style.setProperty('--cell-sz', cellSz + 'px');
  } catch(e) {}
}

// One-time migration: original single-pattern save data → Peacock Tee namespace.
function migrateLegacy() {
  try {
    if (localStorage.getItem('pt3_state') && !localStorage.getItem('pt3_peacock-tee_state')) {
      ['state','ctrs','cur','chartRow','grows'].forEach(k => {
        const v = localStorage.getItem('pt3_' + k);
        if (v !== null) localStorage.setItem('pt3_peacock-tee_' + k, v);
      });
    }
  } catch(e) {}
}

// One-time migration: pattern-namespaced progress → a first project per pattern,
// so existing progress becomes the user's first project.
function migrateToProjects() {
  try {
    if (localStorage.getItem('pt3_projects')) return;
    const list = [];
    PATTERNS.forEach(pat => {
      if (localStorage.getItem('pt3_' + pat.id + '_state')) {
        const id = newId();
        list.push({ id, patternId: pat.id, name: pat.name, created: Date.now() });
        ['state','ctrs','cur','chartRow','grows'].forEach(k => {
          const v = localStorage.getItem('pt3_' + pat.id + '_' + k);
          if (v !== null) localStorage.setItem('pt3_proj_' + id + '_' + k, v);
        });
      }
    });
    localStorage.setItem('pt3_projects', JSON.stringify(list));
  } catch(e) {}
}

// One-time migration: give every existing project the sync bookkeeping the
// merge engine needs — a clock per field, and a baseline copy of it.
//
// Gated on its own `pt3_schema` sentinel rather than on `pt3_projects`, which
// migrateToProjects() above already claims: keying off that would make this
// migration a no-op for exactly the users who have data to migrate.
//
// Every field is stamped with the SAME t0, because pre-existing progress has
// no per-field history — it is one snapshot, taken now. Setting base = clocks
// additionally declares "nothing is pending" so the first sync sees a device
// with no local edits rather than a device claiming to have changed every
// field, which would conflict against anything already in the cloud.
function migrateAddClocks() {
  try {
    if (localStorage.getItem('pt3_schema')) return;
    const t0 = Date.now();
    JSON.parse(localStorage.getItem('pt3_projects') || '[]').forEach(proj => {
      const p = 'pt3_proj_' + proj.id + '_';
      const clk = {};
      const readObj = k => { try { return JSON.parse(localStorage.getItem(p + k) || 'null'); } catch(e) { return null; } };

      // Field keys, not storage keys: one clock per step/counter, so two
      // devices touching different steps merge without a prompt.
      Object.keys(readObj('state') || {}).forEach(id => { clk['s:' + id] = t0; });
      Object.keys(readObj('ctrs')  || {}).forEach(id => { clk['c:' + id] = t0; });
      if (localStorage.getItem(p + 'cur')   !== null) clk.cur = t0;
      if (localStorage.getItem(p + 'grows') !== null) clk.global_rows = t0;

      // Chart rows are per-phase, so each gets its own clock. Projects saved
      // before that change hold a single `chartRow` scalar instead; attribute
      // it the same way loadProjectState() does — to the pattern's only chart
      // phase — rather than dropping it and leaving a knitted row unclocked.
      const rows = readObj('chartRows');
      if (rows) {
        Object.keys(rows).forEach(phaseId => { clk[chartRowKey(phaseId)] = t0; });
      } else if (localStorage.getItem(p + 'chartRow') !== null) {
        const pat = patternById(proj.patternId);
        const chartPhase = pat && pat.phases.find(ph => ph.hasChart);
        if (chartPhase) clk[chartRowKey(chartPhase.id)] = t0;
      }

      const json = JSON.stringify(clk);
      localStorage.setItem(p + 'clk', json);
      localStorage.setItem(p + 'base', json);
    });
    localStorage.setItem('pt3_schema', '1');
  } catch(e) {
    // Deliberately not silent: a failure here leaves projects without
    // baselines, which the merge engine cannot detect on its own.
    console.error('migrateAddClocks failed', e);
  }
}

// Done-steps / total for a project, read from its saved state (for home cards).
// Counts only real step ids — a step's checkable bullets (stepId + '__b' +
// index, see toggleSubStep()) live in the same state object but aren't steps
// of their own, so they're excluded rather than inflating the tally.
function projectProgress(proj) {
  const pat = patternById(proj.patternId);
  const total = pat ? pat.phases.reduce((a, ph) => a + ph.steps.length, 0) : 0;
  let done = 0;
  try {
    const raw = localStorage.getItem('pt3_proj_' + proj.id + '_state');
    if (raw && pat) {
      const st = JSON.parse(raw);
      const ids = new Set(pat.phases.flatMap(ph => ph.steps.map(s => s.id)));
      done = Object.keys(st).filter(k => ids.has(k) && st[k]).length;
    }
  } catch(e) {}
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}

// Clears a step's own done-flag/counter, plus any checkable-bullet sub-state.
function resetStep(s) {
  state[s.id] = false;
  stampClock('s:' + s.id);
  if (s.rows) { ctrs[s.id] = 0; stampClock('c:' + s.id); }
  if (s.bullets) s.bullets.forEach((_, i) => { state[s.id + '__b' + i] = false; stampClock('s:' + s.id + '__b' + i); });
}

// Reset progress for the current phase only.
function resetPhase() {
  if (!activeProjectId || !PHASES[cur]) return;
  PHASES[cur].steps.forEach(resetStep);
  save();
  render();
}

// Reset progress for the entire pattern.
function resetPattern() {
  if (!activeProjectId) return;
  state = {};
  ctrs = {};
  chartRows = {};
  chartCurrentRow = 1;
  globalRows = 0;
  cur = 0;
  // Clearing the objects drops the old keys entirely, so resetStep() below is
  // what re-creates them (and their clocks); only the three scalars need
  // stamping here. Clocks themselves are deliberately kept — a reset is an
  // edit to sync, not a reason to forget this device ever edited anything.
  stampClocks(['cur', 'chart_row', 'global_rows']);
  PHASES.forEach(ph => ph.steps.forEach(resetStep));
  syncActiveChart();
  save();
  render();
}

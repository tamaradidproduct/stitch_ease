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
  ['state','ctrs','cur','chartRow','chartRows','grows'].forEach(k => { try { localStorage.removeItem('pt3_proj_' + projectId + '_' + k); } catch(e){} });
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
  if (s.rows) ctrs[s.id] = 0;
  if (s.bullets) s.bullets.forEach((_, i) => { state[s.id + '__b' + i] = false; });
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
  PHASES.forEach(ph => ph.steps.forEach(resetStep));
  syncActiveChart();
  save();
  render();
}

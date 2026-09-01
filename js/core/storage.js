// ─────────────────────────────────────────────
// PERSISTENCE — everything that touches localStorage.
//
// Keys, all under the pt3_ prefix (see CLAUDE.md; do not rename — the
// migrations below depend on the exact strings):
//   pt3_projects                  the registry: [{ id, patternId, name, created,
//                                 updatedAt, deletedAt? }] — deletedAt marks a
//                                 tombstone; the record is kept, not removed
//   pt3_proj_<id>_entries         {n:<id>|r:<id>: bool, rp:<id>: {y,z}} —
//                                 progress, one key per entry
//   pt3_proj_<id>_state           PRE-CONVERSION {stepId: bool}; read once by
//   pt3_proj_<id>_ctrs            PRE-CONVERSION {stepId: int}. migrateToEntries()
//                                 folded both into `entries`. Kept, never written.
//   pt3_proj_<id>_cur             current phase index
//   pt3_proj_<id>_chartRows       {phaseId: row} — per chart phase (see below)
//   pt3_proj_<id>_chartRow        LEGACY single chart row; read once by
//                                 loadProjectState() when chartRows is absent,
//                                 then superseded. Kept readable forever so
//                                 old saved progress isn't lost.
//   pt3_proj_<id>_midRowPos       {phaseId: colIndex} — mid-row tracker line,
//                                 per chart phase. LOCAL-ONLY: no clock, never
//                                 synced (a personal reading aid, not progress).
//   pt3_proj_<id>_grows           PRE-CONVERSION row tally; the tally is now
//                                 derived, so this is dead. Kept for purging.
//   pt3_proj_<id>_clk             {fieldKey: epoch_ms} last local change per field
//   pt3_proj_<id>_base            {fieldKey: epoch_ms} clocks at last sync
//   pt3_proj_<id>_phash           structure hash the project was started on
//   pt3_proj_<id>_pattern         frozen copy of the pattern as it was then —
//                                 the only record of it once the code moves on
//   pt3_schema                    migration sentinel (version number) — GLOBAL
//   pt3_outbox                    entities with unpushed changes — GLOBAL
//                                 (see js/cloud/sync.js)
//   pt3_last_sync                 epoch_ms of the last fully successful sync
//                                 — GLOBAL (see js/cloud/sync.js)
//   pt3_sync_cursor               {uid, rev, projTs} — how far this device has
//                                 pulled, per account — GLOBAL
//   pt3_conflicts                 fields both devices changed, awaiting an
//                                 answer; holds the OTHER device's value, which
//                                 is what makes the choice reversible — GLOBAL
//   pt3_cellSz                    chart cell size — GLOBAL, shared across projects
// ─────────────────────────────────────────────

// ── Projects registry (pt3_projects) ──
function loadProjects() {
  try { projects = JSON.parse(localStorage.getItem('pt3_projects') || '[]') || []; } catch(e) { projects = []; }
  // Records written before registry records carried an `updatedAt` get one
  // here rather than in a migration: migrateAddClocks() has already set its
  // sentinel for existing users, so a one-time pass would skip exactly the
  // records that need it. As an invariant checked every boot this is also
  // self-healing if a future write path forgets the field.
  //
  // Backfilled from `created`, not from now(): "now" would assert the record
  // changed at boot, letting a stale local name beat a newer remote one on
  // first sync. `created` is the last thing actually known about it.
  let patched = false;
  projects.forEach(p => { if (!p.updatedAt) { p.updatedAt = p.created || 0; patched = true; } });
  if (patched) saveProjects();
}
function saveProjects() {
  try { localStorage.setItem('pt3_projects', JSON.stringify(projects)); } catch(e) {}
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// `projects` holds tombstones as well as live records (see deleteProject), so
// anything user-facing goes through this rather than iterating the array.
function liveProjects() { return projects.filter(p => !p.deletedAt); }
function isDeleted(projectId) {
  const p = projects.find(x => x.id === projectId);
  return !p || !!p.deletedAt;
}

// Every per-project key. Kept in one place because both deleteProject() and,
// later, the sync engine applying a remote tombstone need to purge the same set
// — and a key added to save() but missed here is a silent storage leak.
// `chartRow` is the superseded scalar and `chartRows` the per-phase map: both
// are listed because a project saved before that change still has the old key
// on disk, and purging only the new one would leave it orphaned forever.
const PROJ_KEYS = ['state','ctrs','cur','chartRow','chartRows','midRowPos','grows','clk','base','phash','pattern','entries'];
function purgeProjectData(projectId) {
  PROJ_KEYS.forEach(k => { try { localStorage.removeItem('pt3_proj_' + projectId + '_' + k); } catch(e){} });
}

// Auto-name: pattern name, then "<name> 2", "<name> 3"… for repeats. Tombstones
// don't count, so deleting "Peacock Tee 2" frees that name to be used again
// rather than leaving a permanent gap in the numbering.
function autoProjectName(pattern) {
  const n = liveProjects().filter(p => p.patternId === pattern.id).length;
  return n === 0 ? pattern.name : pattern.name + ' ' + (n + 1);
}

function createProject(patternId) {
  const pat = patternById(patternId);
  if (!pat) { console.warn('No pattern "' + patternId + '"'); return null; }
  const proj = { id: newId(), patternId: pat.id, name: autoProjectName(pat),
                 created: Date.now(), updatedAt: syncNow() };
  projects.push(proj);
  saveProjects();
  freezePattern(proj.id, pat);
  enqueue('project', proj.id);
  return proj;
}

// Record which structure a project was started on, and keep a copy of the
// pattern as it was.
//
// The copy is taken at CREATE, not lazily when a change is noticed, because by
// then it is too late — the old pattern has already been replaced in the code
// and cannot be reconstructed. Roughly 10-40KB per project, which is nothing
// at family scale (see the quota banner for when it stops being nothing).
function freezePattern(projectId, pattern) {
  try {
    localStorage.setItem('pt3_proj_' + projectId + '_phash', structHash(pattern));
    localStorage.setItem('pt3_proj_' + projectId + '_pattern', JSON.stringify(pattern));
  } catch(e) { showSaveError(e); }
}

function storedHash(projectId) {
  try { return localStorage.getItem('pt3_proj_' + projectId + '_phash'); } catch(e) { return null; }
}

// The pattern as it was when the project started, or null if the snapshot is
// missing or unreadable. Callers fall back to the live pattern — a project that
// opens on slightly the wrong structure beats one that will not open at all.
function frozenPattern(projectId) {
  try {
    const raw = localStorage.getItem('pt3_proj_' + projectId + '_pattern');
    const doc = raw ? JSON.parse(raw) : null;
    return (doc && doc.phases && doc.phases.length) ? doc : null;
  } catch(e) { return null; }
}

function renameProject(projectId, evt) {
  if (evt) evt.stopPropagation();
  const proj = projects.find(p => p.id === projectId);
  if (!proj || proj.deletedAt) return;
  sheetPrompt({
    title: 'Rename project',
    value: proj.name,
    onSubmit: name => {
      proj.name = name; proj.updatedAt = syncNow();
      saveProjects(); enqueue('project', projectId);
      resetHeaderKey(); render();
    }
  });
}

// Soft delete. The registry entry stays as a tombstone (`deletedAt` set) and
// only the progress keys are purged.
//
// A hard delete cannot survive sync: the phone would drop the record entirely,
// then pull from the cloud, find a project it has never heard of, and helpfully
// re-create it. The knitter deletes the same project over and over and it keeps
// coming back. A tombstone is the only way to say "this is gone" in a way that
// propagates — absence means "never seen", which is a different claim.
//
// Tombstones are ~150 bytes and are never collected. At family scale that is
// nothing; if it ever matters, they can be dropped once every device has
// confirmed the delete, which needs sync state that does not exist yet.
function deleteProject(projectId, evt) {
  if (evt) evt.stopPropagation();
  const proj = projects.find(p => p.id === projectId);
  if (!proj || proj.deletedAt) return;
  sheetConfirm({
    title: 'Delete project',
    message: 'Delete "' + proj.name + '"?',
    detail: 'This removes its progress from this device. It can\'t be undone.',
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: () => {
      purgeProjectData(projectId);
      proj.deletedAt = syncNow();
      proj.updatedAt = proj.deletedAt;
      saveProjects();
      // Any queued progress push is now meaningless — its source keys were
      // just purged, so flushing it would send an empty row for a project
      // being tombstoned in the same pass. The tombstone carries the delete.
      dequeue('progress', projectId);
      enqueue('project', projectId);
      if (activeProjectId === projectId) { activeProjectId = null; view = 'home'; }
      render();
    }
  });
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
    localStorage.setItem(pkey('entries'), JSON.stringify(entryProg));
    localStorage.setItem(pkey('cur'), cur);
    localStorage.setItem(pkey('chartRows'), JSON.stringify(chartRows));
    // Local-only, deliberately no stampClock — a personal reading aid, not
    // knitting progress (see the pt3_proj_<id>_midRowPos comment above).
    localStorage.setItem(pkey('midRowPos'), JSON.stringify(midRowPos));
    // `grows` is no longer the tally — it is a mirror of the derived value,
    // kept because sync still carries `global_rows` as a field and the server
    // column is NOT NULL. Written here, in one place, instead of nudged in
    // five; and stamped ONLY when it really moved, so a save that changed
    // nothing cannot claim an edit and win a conflict it should have lost.
    // The key and the field both go at step 5, with the clock namespace.
    const gr = String(globalRowsNow());
    if (gr !== localStorage.getItem(pkey('grows'))) {
      localStorage.setItem(pkey('grows'), gr);
      stampClock('global_rows');
    }
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
    enqueue('progress', activeProjectId);
    clearSaveError();
  } catch(e) {
    showSaveError(e);
  }
}

function loadProjectState() {
  try {
    const st = localStorage.getItem(pkey('state')); if (st) state = Object.assign(state, JSON.parse(st));
    const ct = localStorage.getItem(pkey('ctrs')); if (ct) ctrs = Object.assign(ctrs, JSON.parse(ct));
    const en = localStorage.getItem(pkey('entries')); if (en) entryProg = Object.assign(entryProg, JSON.parse(en));
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

    const mrp = localStorage.getItem(pkey('midRowPos'));
    if (mrp) { try { midRowPos = JSON.parse(mrp) || {}; } catch(e) {} }

    // `grows` is deliberately NOT read back — the tally is recomputed from
    // the progress that was just loaded. Reading it would reintroduce the
    // stored number as a second, disagreeing source of truth.
    const ck = localStorage.getItem(pkey('clk'));  if (ck) clocks = JSON.parse(ck) || {};
    const bs = localStorage.getItem(pkey('base')); if (bs) baseClocks = JSON.parse(bs) || {};
    // Stops a later clock correction from handing out stamps that sit below
    // ones this project already has on disk — see syncNow() in js/cloud/sync.js.
    noteExistingClocks(clocks);
  } catch(e) {}
  // Converted sections keep their original ids, so a project that ticked
  // "cast on 88 sts" under the old shape must still see it ticked under the
  // new one. Runs after state/ctrs are restored, and fills gaps only.
  seedEntryProgress(entryProg, state, ctrs, PHASES);
  // `cur` and `chartRows` are both restored above, so the active chart and
  // its row have to be recomputed from them.
  syncActiveChart();
}

// Read the pre-conversion progress through into the entries map, for entries
// that have no value of their own yet.
//
// This is the doc's migration #4 mapping, run early and non-destructively: the
// old keys are read, never written or removed. Without it, adopting a pattern
// whose section just got converted would look exactly like losing that
// section's progress, since the renderer would be asking for 'rp:c2' while the
// tick still lives in ctrs.c2.
//
// The old counter did not mean the same thing on every step it appeared on,
// which is the trap here:
//
//   plain counter step ("work 7 rounds rib")   counted ROWS
//   cadence step       ("every 2nd round × 8") counted ROWS
//   repeat-unit step   (counter + bullets)     counted PASSES of the motif
//
// On a single-row repeat those coincide, so it went unnoticed until Lenore,
// whose motifs are six rings long: reading its counter as rows would put a
// tatter a third of the way back through their cuff. Converted blocks that
// came from a repeat-unit step carry `legacyCount:'passes'` to say so.
//
// The bullets of such a step were the one place the old model DID record a
// position inside a pass, so they are read too — a half-worked motif keeps
// its half.
function seedEntryProgress(target, legacyState, legacyCtrs, phases) {
  (phases || []).forEach(ph => (ph.entries || []).forEach(e => {
    if (e.kind === 'repeat') {
      const k = repeatKey(e.id);
      const n = (legacyCtrs || {})[e.id];
      if (!(k in target) && n) {
        if (e.legacyCount === 'passes') {
          // A pass count is y directly. z comes from however many of the old
          // <id>__b<i> bullets are still ticked for the pass in progress.
          const st = legacyState || {};
          let ticked = 0;
          for (let i = 0; i < repeatLength(e); i++) if (st[e.id + '__b' + i]) ticked++;
          target[k] = clampRepeatPos(e, { y: n, z: ticked + 1 });
        } else {
          target[k] = repeatPosFromRowsDone(e, n);
        }
      }
    } else {
      const k = e.kind === 'note' ? noteKey(e.id) : rowKey(e.id);
      if (!(k in target) && (legacyState || {})[e.id]) target[k] = true;
    }
  }));
  return target;
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

// One-time migration: give every existing project a structure hash and a frozen
// copy of its pattern.
//
// These projects predate the mechanism, so there is no record of what they were
// started on. The live pattern is the only available claim — and it is the
// right one in practice, since it is what they have been rendering against all
// along. Running this now is what makes the NEXT structural edit detectable;
// without it every pre-existing project would be frozen on nothing.
//
// `pt3_schema` is a version number, not a boolean. migrateAddClocks() wrote '1'
// and returns early on any value, so this needs its own comparison rather than
// its own key — one sentinel that counts is easier to extend than a new key per
// migration.
const PATTERN_HASH_SCHEMA = 2;
function migrateAddPatternHash() {
  try {
    if ((parseInt(localStorage.getItem('pt3_schema')) || 0) >= PATTERN_HASH_SCHEMA) return;
    JSON.parse(localStorage.getItem('pt3_projects') || '[]').forEach(proj => {
      if (localStorage.getItem('pt3_proj_' + proj.id + '_phash')) return;
      const pat = patternById(proj.patternId);
      if (pat) freezePattern(proj.id, pat);
    });
    localStorage.setItem('pt3_schema', String(PATTERN_HASH_SCHEMA));
  } catch(e) {
    // Not silent: without a hash a project can never be told that its pattern
    // changed, which is the whole point of this phase.
    console.error('migrateAddPatternHash failed', e);
  }
}

// ─────────────────────────────────────────────
// MIGRATION #4 — onto the entries model
//
// Every pattern converted from `steps` to `entries`, which changed every
// pattern's structure hash. Left alone, the freeze mechanism would do exactly
// what it is built to do and strand every existing project on its old
// snapshot — permanently, since the old renderer goes away in this same
// commit. So this force-adopts: each project is moved onto the live pattern
// and its progress rewritten into the new namespace.
//
// It is the one change in this codebase that cannot be taken back, so the
// order matters. `cur` is translated through the OLD phase id BEFORE the
// snapshot is replaced, because afterwards nothing remains to say what the old
// index meant. Progress is converted from the old keys BEFORE they stop being
// read, for the same reason.
//
// Nothing is deleted. `state`, `ctrs` and `grows` stay on disk untouched: they
// cost a few KB, they are the only record of what a project looked like
// before, and seedEntryProgress() reads them rather than writing them. A
// project whose live pattern has vanished from the code is skipped entirely —
// better a project this version cannot open than one silently remapped onto a
// pattern that is not its own.
// ─────────────────────────────────────────────
const SCHEMA_VERSION = 3;
function migrateToEntries() {
  try {
    if ((parseInt(localStorage.getItem('pt3_schema')) || 0) >= SCHEMA_VERSION) return;
    const t0 = Date.now();
    let moved = 0, skipped = 0;

    JSON.parse(localStorage.getItem('pt3_projects') || '[]').forEach(proj => {
      const p = 'pt3_proj_' + proj.id + '_';
      const readObj = k => { try { return JSON.parse(localStorage.getItem(p + k) || 'null') || {}; } catch(e) { return {}; } };

      const live = patternById(proj.patternId);
      if (!live) { skipped++; return; }

      // A tombstone's progress keys are already purged — there is nothing to
      // convert, and re-freezing a deleted project would resurrect its doc.
      if (proj.deletedAt) return;

      // 1. `cur` first, through the phase id it used to point at. The old
      //    snapshot is the only thing that knows.
      const oldPat = frozenPattern(proj.id) || live;
      const oldPhase = (oldPat.phases || [])[parseInt(localStorage.getItem(p + 'cur')) || 0];
      let nextCur = live.phases.findIndex(ph => oldPhase && ph.id === oldPhase.id);
      if (nextCur < 0) nextCur = Math.min(parseInt(localStorage.getItem(p + 'cur')) || 0, live.phases.length - 1);
      nextCur = Math.max(0, nextCur);

      // 2. Progress, read out of the old buckets into the new namespace. The
      //    mapping and its passes-vs-rows trap live in seedEntryProgress(),
      //    which has been reading these same keys since step 2 — so this is
      //    the path that has already been exercised, not a fresh one.
      const entries = seedEntryProgress(readObj('entries'), readObj('state'), readObj('ctrs'), live.phases);

      // 3. Clocks, rebuilt in the new namespace at one shared t0. The old
      //    timestamps describe fields that no longer exist; carrying them
      //    across a rename would attach a real edit time to a key nobody ever
      //    edited. base = clk says "nothing pending", so the first sync after
      //    this sees a device with no local edits rather than one claiming to
      //    have changed every field at once.
      const clk = {};
      Object.keys(entries).forEach(k => { clk[k] = t0; });
      clk.cur = t0;
      Object.keys(readObj('chartRows')).forEach(phaseId => { clk[chartRowKey(phaseId)] = t0; });

      localStorage.setItem(p + 'entries', JSON.stringify(entries));
      localStorage.setItem(p + 'cur', nextCur);
      const json = JSON.stringify(clk);
      localStorage.setItem(p + 'clk', json);
      localStorage.setItem(p + 'base', json);

      // 4. Adopt: the project now knits the live pattern, so its snapshot and
      //    hash have to say so or patternForProject() keeps handing back the
      //    old one.
      freezePattern(proj.id, live);
      moved++;
    });

    localStorage.setItem('pt3_schema', String(SCHEMA_VERSION));
    console.info('[migrate] entries model: ' + moved + ' project(s) moved' +
                 (skipped ? ', ' + skipped + ' skipped (pattern no longer in the code)' : ''));
  } catch(e) {
    // Loud: a half-done run leaves projects pointing at a pattern whose keys
    // they do not have, and the sentinel is deliberately NOT written above on
    // the failure path, so the next load tries again.
    console.error('migrateToEntries failed', e);
  }
}

// Done-entries / total for a project, read from its saved progress (for home
// cards). Notes, rows and repeats all count as one thing to tick, which is
// what the card's percentage means.
function projectProgress(proj) {
  // The version this project actually knits — a frozen project's totals come
  // from its own snapshot, or the card would count steps it cannot see.
  const pat = patternForProject(proj).pattern;
  // A converted section counts its entries; an unconverted one its steps. Both
  // are "things you tick", which is what the card's percentage means.
  const total = pat ? pat.phases.reduce((a, ph) => a + (ph.entries || []).length, 0) : 0;
  let done = 0;
  try {
    if (pat) {
      const st = JSON.parse(localStorage.getItem('pt3_proj_' + proj.id + '_state') || '{}');
      const ep = JSON.parse(localStorage.getItem('pt3_proj_' + proj.id + '_entries') || '{}');
      // Same read-through as loadProjectState(), on a throwaway copy — a card
      // must show the right number for a project that has not been opened
      // since its pattern was converted.
      seedEntryProgress(ep, st, JSON.parse(localStorage.getItem('pt3_proj_' + proj.id + '_ctrs') || '{}'), pat.phases);
      pat.phases.forEach(ph => (ph.entries || []).forEach(e => { if (entryDone(e, ep)) done++; }));
    }
  } catch(e) {}
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}

// Clears one entry. Writes an explicit false / {y:0,z:1} rather than deleting
// the key, because deleting it would re-expose the pre-conversion value that
// seedEntryProgress() reads through — a reset that quietly undoes itself on
// the next open.
function resetEntry(e) {
  const k = e.kind === 'repeat' ? repeatKey(e.id)
          : e.kind === 'note'   ? noteKey(e.id) : rowKey(e.id);
  entryProg[k] = e.kind === 'repeat' ? { y: 0, z: 1 } : false;
  stampClock(k);
}

function resetSection(ph) { (ph.entries || []).forEach(resetEntry); }

// Reset progress for the current phase only.
function resetPhase() {
  if (!activeProjectId || !PHASES[cur]) return;
  resetSection(PHASES[cur]);
  save();
  render();
}

// Reset progress for the entire pattern.
function resetPattern() {
  if (!activeProjectId) return;
  state = {};
  ctrs = {};
  entryProg = {};
  chartRows = {};
  chartCurrentRow = 1;
  cur = 0;
  // Clearing the objects drops the old keys entirely, so resetStep() below is
  // what re-creates them (and their clocks); the scalars and every chart phase
  // need stamping here. Clocks themselves are deliberately kept — a reset is an
  // edit to sync, not a reason to forget this device ever edited anything.
  //
  // Every chart phase must be stamped even though chartRows was just emptied:
  // an unstamped reset keeps its old, older clock, so the other device's row
  // reads as newer and the next sync quietly puts it back.
  // `global_rows` is not stamped here any more — save() below derives it and
  // stamps it if it moved, which after a reset it certainly did.
  stampClocks(['cur'].concat(
    PHASES.filter(ph => ph.hasChart).map(ph => chartRowKey(ph.id))
  ));
  PHASES.forEach(resetSection);
  syncActiveChart();
  save();
  render();
}

// ─────────────────────────────────────────────
// ADOPTING A PATTERN UPDATE
//
// Explicit, never automatic, and it destroys nothing.
//
// Progress keys for steps that no longer exist are LEFT IN PLACE rather than
// stripped. They render nowhere, so they cost a few bytes and nothing else —
// and if the step comes back (an edit reverted, a rename undone), the tick
// comes back with it. Deleting them would also fight sync: the other device,
// which has not adopted yet, would push them straight back.
//
// The one thing that genuinely has to move is `cur`, which is a phase INDEX.
// The same number means a different phase after a phase is inserted, so it is
// translated through the phase id it used to point at.
// ─────────────────────────────────────────────
function patternChangeSummary(projectId) {
  const proj = projects.find(p => p.id === projectId);
  const live = proj && patternById(proj.patternId);
  if (!live) return null;
  const oldPat = frozenPattern(projectId) || live;

  // Entry ids and step ids share one namespace on purpose: a section converted
  // in place keeps its ids, so the summary correctly reports nothing added or
  // removed rather than claiming the whole section was replaced.
  const idsOf = pat => new Set(pat.phases.reduce((a, ph) => a.concat((ph.entries || []).map(x => x.id)), []));
  const oldIds = idsOf(oldPat), newIds = idsOf(live);

  let added = 0, removed = 0;
  newIds.forEach(id => { if (!oldIds.has(id)) added++; });
  oldIds.forEach(id => { if (!newIds.has(id)) removed++; });

  // Ticks counted the way the home card counts them — from the entries map,
  // whose keys are prefixed, so the id has to come back out before it can be
  // matched against the pattern.
  let ticks = 0, kept = 0;
  try {
    const st = JSON.parse(localStorage.getItem('pt3_proj_' + projectId + '_entries') || '{}');
    Object.keys(st).forEach(key => {
      const k = key.slice(key.indexOf(':') + 1);
      const on = key.indexOf('rp:') === 0 ? !!(st[key] && (st[key].y || st[key].z > 1)) : !!st[key];
      if (!on || !oldIds.has(k)) return;
      ticks++;
      if (newIds.has(k)) kept++;
    });
  } catch(e) {}

  return { added: added, removed: removed, ticks: ticks, kept: kept };
}

function adoptPattern(projectId) {
  const proj = projects.find(p => p.id === projectId);
  const live = proj && patternById(proj.patternId);
  if (!live) return false;

  // Translate `cur` before the snapshot is replaced — afterwards there is
  // nothing left to say which phase the old index meant.
  const oldPat = frozenPattern(projectId) || live;
  const oldPhase = oldPat.phases[readCur(projectId)];
  let nextCur = live.phases.findIndex(ph => oldPhase && ph.id === oldPhase.id);
  if (nextCur < 0) nextCur = Math.min(readCur(projectId), live.phases.length - 1);
  nextCur = Math.max(0, nextCur);

  try { localStorage.setItem('pt3_proj_' + projectId + '_cur', nextCur); } catch(e) { showSaveError(e); }
  freezePattern(projectId, live);

  // `cur` moved and the frozen doc changed, so both have to be announced:
  // stamp the clock or the other device's older `cur` wins the next merge, and
  // enqueue the project so the new hash and doc go up.
  if (projectId === activeProjectId) { cur = nextCur; stampClock('cur'); }
  proj.updatedAt = syncNow();
  saveProjects();
  enqueue('project', projectId);
  enqueue('progress', projectId);
  return true;
}

function readCur(projectId) {
  const v = localStorage.getItem('pt3_proj_' + projectId + '_cur');
  return v === null ? 0 : (parseInt(v) || 0);
}

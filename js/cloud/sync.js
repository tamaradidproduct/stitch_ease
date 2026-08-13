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
// session (see learnServerSkew).
let serverSkew = 0;

// A phone whose clock is three days fast would otherwise win every merge
// forever, and there is no way to repair timestamps already written. Clamping
// caps the damage at an hour.
const MAX_SKEW_MS = 60 * 60 * 1000;

// Below this, the "skew" is round-trip latency and the one-second resolution
// of the Date header, not a wrong clock.
const SKEW_MIN_MS = 5000;

// Never hand out a stamp at or below one this device has already written.
//
// Correcting a fast clock moves time BACKWARDS, and a new edit stamped earlier
// than an older one is invisible to the merge: clocks[k] never exceeds
// base[k], so the field reads as unchanged and is never pushed. The knitter
// counts rows all evening and none of them leave the phone, with nothing on
// screen to say so. The floor makes the correction safe to apply.
//
// It is seeded from clocks already on disk, which can include ones merged in
// from another device — so this device's stamps can end up slightly ahead of
// its own wall clock. That is what a logical clock is, and it is bounded by
// the same ±1h clamp on every device.
let stampFloor = 0;
function noteExistingClocks(map) {
  Object.keys(map || {}).forEach(k => { if (map[k] > stampFloor) stampFloor = map[k]; });
}

function syncNow() {
  const skew = Math.max(-MAX_SKEW_MS, Math.min(MAX_SKEW_MS, serverSkew));
  const t = Math.max(Date.now() + skew, stampFloor + 1);
  stampFloor = t;
  return t;
}

// The server's clock, read once per session from the Date header. This exists
// to catch a device that is days out, not to keep time.
//
// It has to be a plain fetch — the supabase client gives no access to response
// headers — and it has to be the REST endpoint specifically. Cross-origin,
// only CORS-safelisted response headers are readable unless the server opts in
// with Access-Control-Expose-Headers, and `date` is NOT on that safelist:
// /rest/v1 exposes it (Cloudflare does the opt-in), /auth/v1/health does not,
// and /auth/v1/health rejects HEAD with a 405 into the bargain. Verified by
// reading the exposed header list off both.
//
// A GET with limit=0 returns an empty array under RLS whether or not anyone is
// signed in, so this costs two bytes of body and needs no session.
async function learnServerSkew() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/projects?select=id&limit=0',
      { cache: 'no-store', headers: { apikey: SUPABASE_KEY } });
    const raw = res.headers.get('date');
    const serverMs = Date.parse(raw || '');
    if (!serverMs) {
      // Logged rather than swallowed: silence here is indistinguishable from
      // "the clocks agree", and this whole guard would be dead code.
      logSync('warn', 'server Date header unreadable — using local time');
      return;
    }
    const skew = serverMs - Date.now();
    // The header has one-second resolution and the round trip adds more, so
    // anything small is noise, not a wrong clock.
    serverSkew = Math.abs(skew) < SKEW_MIN_MS ? 0 : skew;
    if (serverSkew) logSync('info', 'device clock is ' + Math.round(-skew / 1000) +
      's ahead of the server — correcting new timestamps');
  } catch (e) {
    // No correction means local time is used, which is exactly what every
    // version before this one did.
    logSync('warn', 'could not read server time — using local time', e);
  }
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
const FLUSH_RETRY_MS    = 60000;   // after a failed push, before trying again

let flushTimer = null;
let burstStartedAt = 0;   // 0 = no burst in progress
let flushing = false;

// ── Sync status, for the account sheet and for debugging a device that has
// quietly stopped syncing (risk §H4: a silent catch here is unrecoverable —
// there would be no way to find out why). ──
const LAST_SYNC_KEY = 'pt3_last_sync';
const SYNC_LOG_MAX = 20;
let syncLog = [];
let lastSyncAt = 0;
let lastSyncError = null;

function logSync(level, msg, err) {
  syncLog.push({ at: Date.now(), level: level, msg: msg,
                 detail: err ? (err.message || String(err)) : '' });
  if (syncLog.length > SYNC_LOG_MAX) syncLog.shift();
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.info)
    ('[sync] ' + msg, err || '');
}

function loadSyncStatus() {
  try { lastSyncAt = parseInt(localStorage.getItem(LAST_SYNC_KEY)) || 0; } catch(e) { lastSyncAt = 0; }
}
function noteSyncSuccess() {
  lastSyncAt = Date.now();
  lastSyncError = null;
  try { localStorage.setItem(LAST_SYNC_KEY, lastSyncAt); } catch(e) {}
}

// Every timer-driven flush goes through here so the async rejection is caught
// in exactly one place (see flushNow).
function scheduleFlush(delay, reason) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    Promise.resolve(flush(reason)).catch(e => logSync('error', 'flush threw', e));
  }, delay);
}

function markDirty() {
  if (!hasPending()) return;
  const now = Date.now();
  if (!burstStartedAt) burstStartedAt = now;
  // Never let the debounce push past the burst's deadline.
  const untilDeadline = Math.max(0, (burstStartedAt + FLUSH_MAX_WAIT_MS) - now);
  const delay = Math.min(FLUSH_DEBOUNCE_MS, untilDeadline);
  scheduleFlush(delay, delay === untilDeadline ? 'max-wait' : 'debounce');
}

function cancelScheduledFlush() {
  clearTimeout(flushTimer);
  flushTimer = null;
  burstStartedAt = 0;
}

// Skip the wait — used where the page may not survive to run the timer.
//
// flush() is async and nothing here awaits it. The .catch is not optional:
// an unhandled rejection from a background sync would surface as a console
// error with no context, in a codebase where the sync path is meant to be the
// one place that never fails silently OR noisily-but-uselessly.
function flushNow(reason) {
  cancelScheduledFlush();
  Promise.resolve(flush(reason)).catch(e => logSync('error', 'flush threw', e));
}

// ─────────────────────────────────────────────
// PUSH
//
// Draining the outbox is NOT "upload what this device has". A whole-row upsert
// would be, and it silently destroys data: the iPad pushes chart row 31, the
// phone — which has never pulled — pushes its own complete row a minute later
// and the iPad's 31 is gone from the cloud. Neither device ever sees a
// conflict, because the phone's base still matches the clocks it just sent.
//
// So every progress push is a read-merge-write, and the write is guarded by
// the `server_rev` it read. If someone else wrote in between, the guarded
// update matches zero rows and the whole op starts again against the newer
// row. That is the only thing standing between a family sharing an account and
// losing rows to whoever pressed sync last.
//
// Nothing is dequeued until the server has acknowledged it. An op left in the
// outbox is retried; an op dropped is gone.
// ─────────────────────────────────────────────
const MAX_PUSH_ATTEMPTS = 3;

// Sync is off unless a signed-in account has actually claimed the data on this
// device. Pushing unclaimed projects would hand one family member's knitting
// to whoever signed in on the shared iPad first — that decision belongs to the
// claim sheet (see js/cloud/auth.js), not to a background flush.
function canSync() {
  return typeof cloudState === 'function' && cloudState() === 'signed-in' &&
         !!currentUserId() && localOwner() === currentUserId();
}

// Connectivity and auth failures mean the rest of the queue will fail too;
// anything else is specific to one row and shouldn't stop the others.
function isFatalSyncError(e) {
  const m = (e && e.message) || '';
  return /fetch|network|failed to fetch/i.test(m) || (e && (e.status === 401 || e.status === 403)) ||
         /jwt|token/i.test(m);
}

// A re-render after the sync engine changed something under the UI.
//
// On the chart page a full render re-centres the chart, which would yank the
// view out from under someone mid-row. So a background change to some OTHER
// project — the common case, since only one is open — must not repaint the
// screen at all.
function renderAfterSync(touchedActiveProject) {
  if (touchedActiveProject || view !== 'project') { resetHeaderKey(); render(); }
}

// The sync engine writes a project's localStorage keys directly. For the OPEN
// project the in-memory globals are what save() will persist on the next tap,
// so they have to be re-read — otherwise the very next row the knitter counts
// writes the pre-merge state straight back over the merge.
function reloadIfActive(projectId) {
  if (projectId !== activeProjectId) return false;
  loadProjectState();
  return true;
}

function sameValues(a, b) {
  const ka = Object.keys(a || {});
  if (ka.length !== Object.keys(b || {}).length) return false;
  return ka.every(k => a[k] === b[k]);
}

// Apply a remote registry row locally. Last-write-wins on updated_ms: the
// registry holds a name and a tombstone, not per-field progress, so there is
// nothing to merge field by field and nothing worth prompting about.
//
// Shared by push (which adopts a newer cloud copy instead of overwriting it)
// and pull. Returns true if the local registry changed.
function applyRemoteProject(row) {
  const remoteUpdated = Number(row.updated_ms) || 0;
  const local = projects.find(p => p.id === row.id);
  if (local && (local.updatedAt || 0) >= remoteUpdated) return false;

  const wasDeleted = !!(local && local.deletedAt);
  const nowDeleted = !!row.deleted_ms;

  const rec = local || { id: row.id };
  rec.patternId = row.pattern_id;
  rec.name = row.name;
  rec.created = Number(row.created_ms) || rec.created || Date.now();
  rec.updatedAt = remoteUpdated;
  if (nowDeleted) rec.deletedAt = Number(row.deleted_ms); else delete rec.deletedAt;
  if (!local) projects.push(rec);
  saveProjects();

  // A delete that arrived from another device has to do locally what
  // deleteProject() does: drop the progress keys, drop any queued push for
  // them, and get out of the project if it is the one on screen.
  if (nowDeleted && !wasDeleted) {
    purgeProjectData(row.id);
    dequeue('progress', row.id);
    if (activeProjectId === row.id) { activeProjectId = null; view = 'home'; }
  }
  return true;
}

// → 'done' (dequeue) | 'retry' (try again) | 'drop' (nothing left to send)
async function pushProject(id, uid) {
  const proj = projects.find(p => p.id === id);
  if (!proj) return 'drop';

  const { data: remote, error } = await sb.from('projects')
    .select('id,name,pattern_id,created_ms,updated_ms,deleted_ms')
    .eq('id', id).maybeSingle();
  if (error) throw error;

  // The cloud copy is newer, so this device's queued change is stale — take
  // theirs rather than overwriting it. Without this check a rename queued
  // offline last week would silently undo a rename made since.
  if (remote && (Number(remote.updated_ms) || 0) > (proj.updatedAt || 0)) {
    if (applyRemoteProject(remote)) renderAfterSync(id === activeProjectId);
    return 'drop';
  }

  const { error: upErr } = await sb.from('projects').upsert({
    id: proj.id, owner_id: uid, name: proj.name, pattern_id: proj.patternId,
    created_ms: proj.created || Date.now(),
    updated_ms: proj.updatedAt || 0,
    deleted_ms: proj.deletedAt || null
  }, { onConflict: 'id' });
  if (upErr) throw upErr;
  return 'done';
}

async function pushProgress(id, uid) {
  // A tombstoned project's progress keys are already purged; the delete rides
  // on the registry row, so there is nothing here worth sending.
  if (isDeleted(id)) return 'drop';

  const local = readLocalProgress(id);
  const base  = readBase(id);

  const { data: remote, error } = await sb.from('project_progress')
    .select('project_id,steps,counters,cur,chart_rows,global_rows,clocks,server_rev')
    .eq('project_id', id).maybeSingle();
  if (error) throw error;

  let values = local.values, clocks = local.clocks;

  if (remote) {
    const r = diffProgress(local, joinFields(remote), base);
    values = r.merged; clocks = r.mergedClocks;
    if (r.conflicts.length) {
      // Phase 6 fallback: keep this device's value — it is what is already on
      // screen — but give it a FRESH clock so it wins outright everywhere on
      // the next round. Leaving the old clock would let the two devices trade
      // the field back and forth without either ever settling. Phase 7 asks
      // the knitter instead of deciding for them.
      r.conflicts.forEach(c => { clocks[c.key] = syncNow(); });
      noteConflicts(id, r.conflicts);
    }
    const changed = !sameValues(local.values, values);
    if (!writeLocalProgress(id, values, clocks, base)) return 'retry';
    if (changed || r.conflicts.length) {
      renderAfterSync(reloadIfActive(id));
    }
  }

  const f = splitFields(values);
  const row = { project_id: id, owner_id: uid, steps: f.steps, counters: f.counters,
                cur: f.cur, chart_rows: f.chart_rows, global_rows: f.global_rows,
                clocks: clocks };

  if (remote) {
    // The guard. Zero rows means another device wrote between the select above
    // and here, so the merge was against a row that no longer exists — start
    // over rather than overwrite work we never saw.
    const { data: hit, error: uErr } = await sb.from('project_progress')
      .update(row).eq('project_id', id).eq('server_rev', remote.server_rev).select('project_id');
    if (uErr) throw uErr;
    if (!hit || !hit.length) { logSync('info', 'progress ' + id + ' moved under us — re-merging'); return 'retry'; }
  } else {
    const { error: iErr } = await sb.from('project_progress').insert(row);
    if (iErr) {
      if (iErr.code === '23505') return 'retry';        // raced another device's insert
      // No project row yet — normal for progress migrated in before the outbox
      // existed, where nothing ever queued the project itself.
      if (iErr.code === '23503') { await pushProject(id, uid); return 'retry'; }
      throw iErr;
    }
  }

  // Server and device now hold the same thing, which is exactly what `base`
  // means. Written only after the acknowledgement — advancing it earlier would
  // mark local edits as agreed when they were never sent.
  writeBase(id, clocks);
  reloadIfActive(id);
  return 'done';
}

// Kept for the Phase 7 conflict sheet; logged in the meantime so a silent
// wrong answer at least leaves a trace.
let lastConflicts = [];
function noteConflicts(projectId, conflicts) {
  lastConflicts = conflicts.map(c => Object.assign({ projectId: projectId }, c));
  logSync('warn', conflicts.length + ' field(s) changed on both devices for ' + projectId +
    ' — kept this device\'s values');
}

async function flush(reason) {
  // Re-arm rather than drop. The edits that triggered this call are still in
  // the outbox, but the in-flight flush has already read past them — and
  // cancelling the timer below without rescheduling would strand them until
  // the next tap.
  if (flushing) {
    scheduleFlush(FLUSH_DEBOUNCE_MS, 'after-inflight');
    return;
  }
  cancelScheduledFlush();
  if (!hasPending()) return;
  if (!navigator.onLine) {
    // Not an error — the `online` listener below picks it up again.
    console.info('[sync] offline, deferring flush (' + reason + '):', pendingOps().length, 'op(s)');
    return;
  }
  if (!canSync()) return;   // signed out, or the data here isn't this account's

  flushing = true;
  const uid = currentUserId();
  const ops = pendingOps();
  let failed = 0;
  console.info('[sync] flush (' + reason + '):', ops.map(o => o.k + ':' + o.id).join(', '));

  try {
    for (const op of ops) {
      try {
        let outcome = 'retry';
        for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS && outcome === 'retry'; attempt++) {
          outcome = op.k === 'project' ? await pushProject(op.id, uid)
                                       : await pushProgress(op.id, uid);
        }
        if (outcome === 'retry') {
          // Left queued on purpose — contention that outlasts three attempts
          // is better retried later than resolved by giving up on the data.
          failed++;
          logSync('warn', 'gave up on ' + op.k + ':' + op.id + ' for now — still queued');
          continue;
        }
        dequeue(op.k, op.id);
      } catch (e) {
        failed++;
        lastSyncError = e;
        logSync('error', 'push failed for ' + op.k + ':' + op.id, e);
        if (isFatalSyncError(e)) break;   // the rest will fail the same way
      }
    }
    if (!failed) noteSyncSuccess();
  } finally {
    flushing = false;
  }

  if (!hasPending()) return;
  if (failed) {
    // Something is still queued and the last attempt didn't work. Without a
    // retry the queue would sit untouched until the knitter happened to make
    // another edit — a transient blip would look like sync had simply stopped.
    scheduleFlush(FLUSH_RETRY_MS, 'retry');
  } else {
    markDirty();   // edits made while the flush was in flight
  }
}

// ─────────────────────────────────────────────
// PULL
//
// The cursor is per account, not per device. A shared iPad where two family
// members sign in and out would otherwise carry one person's cursor into the
// other's first pull and skip every row written before it — an empty library
// on a device that has the data sitting right there in the cloud.
//
// Two cursors, because the two tables number their changes differently:
// progress has a server_rev sequence (a strict ordering, so `>` is safe),
// projects only has a timestamp. Rows written in the same transaction share a
// timestamp, so `>` there could step over one — `>=` re-fetches the boundary
// row instead, which costs a few hundred bytes and cannot lose anything, since
// applying a remote row is idempotent.
// ─────────────────────────────────────────────
const CURSOR_KEY = 'pt3_sync_cursor';
let syncCursor = { uid: null, rev: 0, projTs: null };
let pulling = false;

function loadCursor() {
  try { syncCursor = JSON.parse(localStorage.getItem(CURSOR_KEY) || 'null') || syncCursor; } catch(e) {}
}
function saveCursor() {
  try { localStorage.setItem(CURSOR_KEY, JSON.stringify(syncCursor)); } catch(e) {}
}
function cursorFor(uid) {
  if (syncCursor.uid !== uid) syncCursor = { uid: uid, rev: 0, projTs: null };
  return syncCursor;
}

// What `base` should become after a merge: the clock of every field where the
// merged answer is what the server already holds — which is exactly what "we
// agreed" means, and the only definition that gets every case right.
//
//   adopted from remote      merged === remote  → agreed, base moves
//   both changed, equal      merged === remote  → agreed, base moves
//   local edit, remote stale merged !== remote  → still ours to push
//   conflict, kept local     merged !== remote  → still ours to push
//
// Getting this wrong is invisible until much later: a base advanced too far
// marks a local edit as already synced and it is never pushed at all.
function agreedBase(base, merged, mergedClocks, remoteValues) {
  const next = Object.assign({}, base);
  Object.keys(merged).forEach(k => {
    if (Object.prototype.hasOwnProperty.call(remoteValues, k) && remoteValues[k] === merged[k]) {
      next[k] = mergedClocks[k] || 0;
    }
  });
  return next;
}

// Merge one remote progress row into local storage. Returns true if anything
// on this device changed.
function mergeRemoteProgress(row) {
  const id = row.project_id;
  // Deleted here: the progress keys are already purged and the tombstone is on
  // its way up. Re-materialising them would be the resurrection bug tombstones
  // exist to prevent.
  if (isDeleted(id)) return false;

  const local = readLocalProgress(id);
  const base = readBase(id);
  const remote = joinFields(row);
  const r = diffProgress(local, remote, base);

  if (r.conflicts.length) {
    // Same Phase 6 fallback as the push path: keep what is on screen, with a
    // fresh clock so it settles rather than ping-ponging. Phase 7 asks.
    r.conflicts.forEach(c => { r.mergedClocks[c.key] = syncNow(); });
    noteConflicts(id, r.conflicts);
  }

  const nextBase = agreedBase(base, r.merged, r.mergedClocks, remote.values);
  const changed = !sameValues(local.values, r.merged);
  if (!changed && !r.conflicts.length && sameValues(base, nextBase)) return false;

  if (!writeLocalProgress(id, r.merged, r.mergedClocks, nextBase)) return false;

  // Anything the server does not have yet — a local edit it never saw, or a
  // conflict we just resolved in this device's favour — has to go back up, or
  // the two would sit disagreeing until the knitter happened to touch the
  // field again.
  if (Object.keys(r.mergedClocks).some(k => (r.mergedClocks[k] || 0) > (nextBase[k] || 0))) {
    enqueue('progress', id);
  }
  reloadIfActive(id);
  return changed || r.conflicts.length > 0;
}

async function pull(reason) {
  if (pulling) return;
  if (!navigator.onLine) return;
  if (!canSync()) return;

  pulling = true;
  lastPullAt = Date.now();
  // NOT named `cur` — that is the global current-phase index, and shadowing it
  // inside the one function that also triggers a render is a trap.
  const cursor = cursorFor(currentUserId());
  let touchedActive = false, changed = false;

  try {
    // Projects first: a progress row for a project this device has never heard
    // of needs the registry record to exist before it can be attributed.
    let q = sb.from('projects')
      .select('id,name,pattern_id,created_ms,updated_ms,deleted_ms,server_updated_at');
    if (cursor.projTs) q = q.gte('server_updated_at', cursor.projTs);
    const { data: remoteProjects, error: pErr } = await q;
    if (pErr) throw pErr;

    (remoteProjects || []).forEach(row => {
      // Checked BEFORE applying: a remote tombstone for the open project
      // clears activeProjectId, so asking afterwards always says "no".
      const wasActive = row.id === activeProjectId;
      if (applyRemoteProject(row)) { changed = true; if (wasActive) touchedActive = true; }
      if (!cursor.projTs || row.server_updated_at > cursor.projTs) cursor.projTs = row.server_updated_at;
    });

    const { data: remoteProgress, error: gErr } = await sb.from('project_progress')
      .select('project_id,steps,counters,cur,chart_rows,global_rows,clocks,server_rev')
      .gt('server_rev', cursor.rev);
    if (gErr) throw gErr;

    (remoteProgress || []).forEach(row => {
      if (mergeRemoteProgress(row)) {
        changed = true;
        if (row.project_id === activeProjectId) touchedActive = true;
      }
      const rev = Number(row.server_rev) || 0;
      if (rev > cursor.rev) cursor.rev = rev;
    });

    saveCursor();
    noteSyncSuccess();
    if (changed) {
      console.info('[sync] pull (' + reason + '): applied ' + (remoteProjects || []).length +
                   ' project row(s), ' + (remoteProgress || []).length + ' progress row(s)');
      renderAfterSync(touchedActive);
    }
    // A merge that left something for us to send (see mergeRemoteProgress).
    if (hasPending()) markDirty();
  } catch (e) {
    lastSyncError = e;
    logSync('error', 'pull failed (' + reason + ')', e);
  } finally {
    pulling = false;
  }
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

// ─────────────────────────────────────────────
// WHEN TO SYNC
//
// Polling, not Realtime. The two-device case here is "phone in hand, iPad on
// the table" — one of them is always backgrounded, so pulling on focus covers
// it without a standing websocket that has to be nursed through every network
// transition a phone goes through in a day.
//
// The interval runs ONLY while the page is visible. This is a PWA that sits
// open for weeks; a timer that keeps firing while it is buried would be a
// request a minute, forever, for a knitter who isn't knitting.
// ─────────────────────────────────────────────
const PULL_INTERVAL_MS = 60000;
const PULL_STALE_MS    = 30000;   // on refocus, don't re-pull if we just did
let pullTimer = null;
let lastPullAt = 0;
let syncedForUid = null;

function startSyncPolling() {
  stopSyncPolling();
  if (document.visibilityState !== 'visible') return;
  pullTimer = setInterval(() => pull('interval'), PULL_INTERVAL_MS);
}
function stopSyncPolling() { clearInterval(pullTimer); pullTimer = null; }

// Pull, and send anything already queued. Used wherever sync should catch up
// right now: signing in, claiming this device's projects, coming back online.
function kickSync(reason) {
  pull(reason);
  flushNow(reason);   // no-op when the outbox is empty
}

// Called from the auth state listener. That fires on token refreshes too, so
// the expensive half only runs when the account actually changed.
function syncOnSignedIn() {
  const uid = currentUserId();
  if (!uid) return;
  startSyncPolling();
  if (syncedForUid === uid) return;
  syncedForUid = uid;
  learnServerSkew();
  kickSync('signed-in');
}

function syncOnSignedOut() {
  syncedForUid = null;
  stopSyncPolling();
  // The outbox is deliberately left alone. Signing out is not a decision to
  // discard work that hasn't reached the cloud yet.
}

window.addEventListener('online', () => kickSync('online'));

// Backgrounding is the last reliable moment on mobile — a phone may freeze or
// kill the tab without ever firing anything else.
//
// The flush is async, so on `pagehide` it will usually not finish: the page is
// gone before the request resolves. That is fine and is why the outbox is
// persisted — the next open pushes it. What these listeners buy is the common
// case where the tab is merely backgrounded and does survive.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushNow('hidden');
    stopSyncPolling();
    return;
  }
  startSyncPolling();
  // Coming back to a tab that was hidden for a minute is the moment the other
  // device's work should appear. Coming back to one hidden for three seconds
  // is not worth a request.
  if (Date.now() - lastPullAt > PULL_STALE_MS) pull('visible');
});
window.addEventListener('pagehide', () => flushNow('pagehide'));

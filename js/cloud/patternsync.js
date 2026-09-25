// ─────────────────────────────────────────────
// SYNCING CUSTOM PATTERNS (on-device imports)
//
// A pattern imported from a CSV or a .stitchchart.json lives in this device's
// pt3_custom_patterns (js/core/patternImport.js). A project started from it
// syncs like any other, so without this the account's other devices got a
// project whose pattern they had never seen — "the pattern isn't in this
// version of the app", about a pattern no version would ever contain.
//
// The doc goes to `custom_patterns` (supabase/migrations/…_custom_patterns.sql)
// and is shared across the FAMILY, the same boundary as pattern PDFs: one
// person imports Lenore's CSV, everyone in the household can start a project
// from it. Projects and progress stay per-account, as ever.
//
// ── Shape: one row per (uploader, pattern) ──
//
// Nobody's push can overwrite anyone else's row. The family's answer for a
// pattern is simply its newest row by updated_ms, whoever wrote it — so a
// re-import on the iPad supersedes the phone's, and a remove anywhere removes
// it everywhere, exactly as LWW should.
//
// ── Last-write-wins, tombstones on remove ──
//
// A pattern doc is one authored object, not per-field progress: there is
// nothing for the three-way merge to do. Structural changes are still safe,
// because a project on a pattern whose structure changed underneath it keeps
// knitting its frozen snapshot and shows "Pattern updated · Review" — the same
// path a CSV re-import already takes locally.
//
// A remove is a tombstone (a row with deleted_ms set), for the reason every
// remove in this app is: absence means "never seen", so another device would
// helpfully upload its copy straight back. A tombstone arriving here does NOT
// take the pattern away from a live project on this device — that would make
// the project unopenable, and the project is this account's, not the family's.
//
// ── Metadata every pull, docs only when changed ──
//
// Each pull reads the family's (owner, pattern, clocks) rows — a few hundred
// bytes — and fetches a doc only for a pattern whose clock moved. A quiet
// family costs nothing noticeable on a PWA that polls every minute for weeks.
//
// ── Synced docs are untrusted input ──
//
// Pattern text is rendered as HTML (it was escaped once, at import). A doc from
// ANOTHER account is not something this device escaped, so it is normalised on
// the way in (sanitizeSyncedPattern): text re-escaped, ids and chart tokens
// checked, raw SVG refused unless it is exactly the colour swatch chartImport.js
// generates. A family is invite-only, but "trust whatever a family member's
// client wrote into the table" would make it a script-injection channel into
// everyone's session.
// ─────────────────────────────────────────────

const CPAT_TABLE = 'custom_patterns';
const CPAT_INDEX_KEY = 'pt3_cpats';

// { [patternId]: { localMs, deletedMs, remoteMs } }
//
// localMs    when this device last imported/received the doc it now holds
// deletedMs  when this device last removed it (or took a remote remove)
// remoteMs   the family's newest clock as last seen — what "already synced" means
//
// The docs themselves stay in pt3_custom_patterns. This is only the clocks,
// which is why it can be read synchronously by the push loop and the pull.
let cpatIndex = {};

function cpatEntry(id) {
  const e = cpatIndex[id] || {};
  return { localMs: e.localMs || 0, deletedMs: e.deletedMs || 0, remoteMs: e.remoteMs || 0 };
}

// The clock this device claims for a pattern: import or remove, whichever was
// last — a remove has to be able to beat an older import elsewhere.
function cpatLocalClock(id) {
  const e = cpatEntry(id);
  return Math.max(e.localMs, e.deletedMs);
}

function saveCustomPatternIndex() {
  try { localStorage.setItem(CPAT_INDEX_KEY, JSON.stringify(cpatIndex)); }
  catch (e) { showSaveError(e); }
}

// Also the one-time backfill: a custom pattern imported before this file
// existed has no clock, so it would never be offered to the server. Stamping it
// now makes it an ordinary unsynced import; the next pull after sign-in (or the
// claim) sends it.
function loadCustomPatternIndex() {
  try { cpatIndex = JSON.parse(localStorage.getItem(CPAT_INDEX_KEY) || '{}') || {}; }
  catch (e) { cpatIndex = {}; }
  let backfilled = false;
  PATTERNS.forEach(p => {
    if (p.custom && !cpatIndex[p.id]) {
      cpatIndex[p.id] = { localMs: syncNow(), deletedMs: 0, remoteMs: 0 };
      enqueue('cpat', p.id);
      backfilled = true;
    }
  });
  if (backfilled) saveCustomPatternIndex();
}

// Called by the importers after saveCustomPatterns(). Recording and queueing
// are one action, as with PDFs — an import the outbox never heard about stays
// on one device.
function noteCustomPatternSaved(id) {
  cpatIndex[id] = Object.assign(cpatEntry(id), { localMs: syncNow(), deletedMs: 0 });
  saveCustomPatternIndex();
  enqueue('cpat', id);
}

function noteCustomPatternRemoved(id) {
  cpatIndex[id] = Object.assign(cpatEntry(id), { localMs: 0, deletedMs: syncNow() });
  saveCustomPatternIndex();
  enqueue('cpat', id);
}

// The sign-in backlog: imports made before there was an account to send them
// to. Called from claimLocalProjects(), like enqueueUnsyncedPdfs().
function enqueueUnsyncedCustomPatterns() {
  Object.keys(cpatIndex).forEach(id => {
    if (cpatLocalClock(id) > cpatEntry(id).remoteMs) enqueue('cpat', id);
  });
}

// On changing family: the remote halves describe the household just left.
// Local imports go up again into the new one — the same call as PDFs.
function forgetRemoteCustomPatterns() {
  Object.keys(cpatIndex).forEach(id => {
    const e = cpatEntry(id);
    cpatIndex[id] = Object.assign(e, { remoteMs: 0 });
    if (e.localMs) enqueue('cpat', id);
  });
  saveCustomPatternIndex();
}

// ─────────────────────────────────────────────
// SANITISING A DOC FROM ANOTHER DEVICE
// ─────────────────────────────────────────────

// Ids end up inside inline onclick="…('<id>')" handlers, so anything that could
// close the string or the attribute is refused outright rather than escaped.
const CPAT_SAFE_ID = /^[^'"<>&\\`\u0000-\u001f]{1,120}$/;
// SYMS keys / chart cell codes.
const CPAT_TOKEN = /^[A-Za-z0-9_]{1,16}$/;
const CPAT_HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
// Fields openNotes() already passes through escapeHtml() at render time. They
// are stored raw, so escaping them here would show "&amp;" on screen.
const CPAT_RENDER_ESCAPED = { term: 1, def: 1 };
const CPAT_MAX_DEPTH = 12;

function swatchSymbolOk(s) {
  const m = typeof s === 'string' && /fill="([^"]*)"/.exec(s);
  return !!(m && CPAT_HEX.test(m[1]) && typeof colorSwatchSvg === 'function' && s === colorSwatchSvg(m[1]));
}

// → a cleaned copy with `custom: true`, or throws with the reason.
function sanitizeSyncedPattern(doc, expectedId) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('not an object');
  if (doc.id !== expectedId) throw new Error('doc id does not match its row');
  if (!Array.isArray(doc.phases) || !doc.phases.length) throw new Error('no phases');

  const bad = why => { throw new Error(why); };
  const walk = (v, key, depth) => {
    if (depth > CPAT_MAX_DEPTH) bad('nested too deep');
    if (key === 'id') {
      return (typeof v === 'string' && CPAT_SAFE_ID.test(v)) ? v : bad('unsafe id');
    }
    if (key === 'chart') {
      if (!Array.isArray(v) || !v.every(r => Array.isArray(r) && r.every(c => typeof c === 'string' && CPAT_TOKEN.test(c))))
        bad('malformed chart');
      return v.map(r => r.slice());
    }
    if (key === 'chartColors') {
      if (!Array.isArray(v)) return undefined;
      return v.map(r => Array.isArray(r) ? r.map(c => (typeof c === 'string' && CPAT_HEX.test(c)) ? c : null) : []);
    }
    if (key === 'sym') return (typeof v === 'string' && CPAT_TOKEN.test(v)) ? v : undefined;
    if (key === 'symbol') return swatchSymbolOk(v) ? v : undefined;
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string') return CPAT_RENDER_ESCAPED[key] ? v : escapeHtml(unescapeBasicHtml(v));
    if (Array.isArray(v)) return v.map(x => walk(x, key, depth + 1)).filter(x => x !== undefined);
    if (typeof v === 'object') {
      const out = {};
      Object.keys(v).forEach(k => {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype' || k === 'custom') return;
        const w = walk(v[k], k, depth + 1);
        if (w !== undefined) out[k] = w;
      });
      return out;
    }
    return undefined;
  };

  const clean = walk(doc, '', 0);
  clean.phases.forEach(ph => { if (!ph || typeof ph.id !== 'string') bad('phase without id'); });
  clean.custom = true;
  return clean;
}

// ─────────────────────────────────────────────
// APPLYING — the local half of a remote row
// ─────────────────────────────────────────────

function customPatternInUse(id) {
  return projects.some(p => p.patternId === id && !p.deletedAt);
}

// A project row can arrive before its pattern (a pull where the pattern fetch
// failed, or a project pushed a moment before the doc). applyRemotePattern()
// then stamped the hash with no live pattern to copy into the frozen snapshot,
// so the snapshot is written here, once the pattern is known — only where the
// hash says it is the very structure the project was started on.
function backfillProjectSnapshots(pattern) {
  let h = null;
  projects.forEach(p => {
    if (p.patternId !== pattern.id || p.deletedAt) return;
    if (frozenPattern(p.id)) return;
    const stored = storedHash(p.id);
    if (!stored) return;
    if (h === null) h = structHash(pattern);
    if (stored !== h) return;
    try { localStorage.setItem('pt3_proj_' + p.id + '_pattern', JSON.stringify(pattern)); }
    catch (e) { showSaveError(e); }
  });
}

// Put a sanitised doc into the registry. False if it could not be persisted —
// the caller then leaves the clock alone so the next pull tries again, rather
// than recording as synced a pattern that will be gone after a reload.
function installCustomPattern(doc) {
  const idx = PATTERNS.findIndex(p => p.id === doc.id);
  if (idx !== -1 && !PATTERNS[idx].custom) return false;   // a built-in always wins
  if (idx === -1) PATTERNS.push(doc); else PATTERNS[idx] = doc;
  try { saveCustomPatterns(); }
  catch (e) { showSaveError(e); return false; }
  backfillProjectSnapshots(doc);
  return true;
}

// Take the family's newest row for one pattern. `row` carries pattern_doc
// unless it is a tombstone. Returns true if the library here changed.
function applyRemoteCustomPatternRow(row) {
  const id = row.pattern_id;
  const remoteMs = Number(row.updated_ms) || 0;
  const mine = cpatLocalClock(id);
  const e = cpatEntry(id);
  if (remoteMs <= mine) {
    // This device is at least as new. Note what the family has, and make sure
    // our newer copy is on its way up.
    if (remoteMs > e.remoteMs) { cpatIndex[id] = Object.assign(e, { remoteMs: remoteMs }); saveCustomPatternIndex(); }
    if (mine > remoteMs) enqueue('cpat', id);
    return false;
  }

  if (row.deleted_ms) {
    const idx = PATTERNS.findIndex(p => p.id === id && p.custom);
    let removed = false;
    // Kept while a live project here knits from it — removing it would make
    // the project unopenable. It stays tombstoned in the index, so nothing
    // here pushes it back to the family.
    if (idx !== -1 && !customPatternInUse(id)) {
      PATTERNS.splice(idx, 1);
      try { saveCustomPatterns(); } catch (err) { showSaveError(err); }
      removed = true;
    }
    cpatIndex[id] = { localMs: 0, deletedMs: remoteMs, remoteMs: remoteMs };
    saveCustomPatternIndex();
    return removed;
  }

  let doc;
  try {
    doc = sanitizeSyncedPattern(row.pattern_doc, id);
  } catch (err) {
    // Recorded as seen, so a doc this build can't take is not re-downloaded
    // every minute. A newer row supersedes it as normal.
    logSync('warn', 'custom pattern ' + id + ' refused: ' + err.message);
    cpatIndex[id] = Object.assign(e, { remoteMs: remoteMs });
    saveCustomPatternIndex();
    return false;
  }
  const existing = patternById(id);
  if (existing && !existing.custom) {
    logSync('warn', 'custom pattern ' + id + ' has a built-in pattern’s id — ignored');
    cpatIndex[id] = Object.assign(e, { remoteMs: remoteMs });
    saveCustomPatternIndex();
    return false;
  }
  if (!installCustomPattern(doc)) return false;
  // localMs is the REMOTE clock, not now(): claiming a fresh edit for a doc
  // that was only copied down would push it straight back up.
  cpatIndex[id] = { localMs: remoteMs, deletedMs: 0, remoteMs: remoteMs };
  saveCustomPatternIndex();
  return true;
}

// Rows → { patternId: newest row }. Ties go to the higher owner id, only so
// every device picks the same one.
function newestCustomPatternRows(rows) {
  const out = {};
  (rows || []).forEach(r => {
    const cur = out[r.pattern_id];
    const t = Number(r.updated_ms) || 0, ct = cur ? (Number(cur.updated_ms) || 0) : -1;
    if (!cur || t > ct || (t === ct && String(r.owner_id) > String(cur.owner_id))) out[r.pattern_id] = r;
  });
  return out;
}

async function fetchCustomPatternDoc(fid, meta) {
  const { data, error } = await sb.from(CPAT_TABLE)
    .select('owner_id,pattern_id,pattern_doc,updated_ms,deleted_ms')
    .eq('family_id', fid).eq('owner_id', meta.owner_id).eq('pattern_id', meta.pattern_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// PULL
// ─────────────────────────────────────────────

// Runs FIRST in pull(), ahead of the projects: a project arriving for a pattern
// this device already has lets applyRemotePattern() freeze a real snapshot.
async function pullCustomPatterns() {
  const fid = currentFamilyId() || await ensureFamily();
  if (!fid) return false;
  const { data, error } = await sb.from(CPAT_TABLE)
    .select('owner_id,pattern_id,updated_ms,deleted_ms')
    .eq('family_id', fid);
  if (error) throw error;

  const newest = newestCustomPatternRows(data);
  let changed = false;
  for (const id of Object.keys(newest)) {
    const meta = newest[id];
    const remoteMs = Number(meta.updated_ms) || 0;
    const e = cpatEntry(id);
    if (remoteMs <= Math.max(e.remoteMs, cpatLocalClock(id))) {
      if (cpatLocalClock(id) > remoteMs) enqueue('cpat', id);
      continue;
    }
    const row = meta.deleted_ms ? meta : await fetchCustomPatternDoc(fid, meta);
    if (row && applyRemoteCustomPatternRow(row)) changed = true;
  }
  // Imports here the family has never seen at all — the backfill, or an op
  // lost from the outbox. Pull is where that is noticed.
  Object.keys(cpatIndex).forEach(id => {
    if (!newest[id] && cpatLocalClock(id)) enqueue('cpat', id);
  });
  return changed;
}

// ─────────────────────────────────────────────
// PUSH — 'done' | 'retry' | 'drop'
// ─────────────────────────────────────────────

async function pushCustomPattern(id, uid) {
  const e = cpatEntry(id);
  const mine = cpatLocalClock(id);
  if (!mine) return 'drop';
  const fid = currentFamilyId() || await ensureFamily();
  if (!fid) return 'retry';

  const { data, error } = await sb.from(CPAT_TABLE)
    .select('owner_id,pattern_id,updated_ms,deleted_ms')
    .eq('family_id', fid).eq('pattern_id', id);
  if (error) throw error;
  const newest = newestCustomPatternRows(data)[id];
  const theirs = newest ? (Number(newest.updated_ms) || 0) : 0;

  // Someone in the family changed it since this device did. Take theirs and
  // stop — pushing would undo a newer import or resurrect a removed one.
  if (theirs > mine) {
    const row = newest.deleted_ms ? newest : await fetchCustomPatternDoc(fid, newest);
    if (row && applyRemoteCustomPatternRow(row)) renderAfterSync(false);
    return 'drop';
  }
  if (newest && theirs === mine) {
    cpatIndex[id] = Object.assign(cpatEntry(id), { remoteMs: theirs });
    saveCustomPatternIndex();
    return 'drop';
  }

  let payload;
  if (e.deletedMs && e.deletedMs >= e.localMs) {
    // Sent even when the family has no row: another of this account's devices
    // may hold the pattern and not have pushed yet, and without the tombstone
    // its push would bring it back.
    payload = { name: '', pattern_doc: null, updated_ms: e.deletedMs, deleted_ms: e.deletedMs };
  } else {
    const pat = PATTERNS.find(p => p.id === id && p.custom);
    if (!pat) {
      // The index says it's here and the registry disagrees (storage cleared,
      // or a write that failed). Nothing to send — correct the index.
      console.warn('[patternsync] no custom pattern ' + id + ' — clearing its index entry');
      delete cpatIndex[id];
      saveCustomPatternIndex();
      return 'drop';
    }
    const doc = JSON.parse(JSON.stringify(pat));
    delete doc.custom;
    payload = { name: unescapeBasicHtml(pat.name || id).slice(0, 400), pattern_doc: doc,
                updated_ms: e.localMs, deleted_ms: null };
  }

  const { error: upErr } = await sb.from(CPAT_TABLE).upsert(Object.assign({
    owner_id: uid, family_id: fid, pattern_id: id
  }, payload), { onConflict: 'owner_id,pattern_id' });
  if (upErr) throw upErr;

  cpatIndex[id] = Object.assign(cpatEntry(id), { remoteMs: mine });
  saveCustomPatternIndex();
  return 'done';
}

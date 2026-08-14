// ─────────────────────────────────────────────
// SYNCING THE ORIGINAL PATTERN PDF
//
// The bytes live in a private Supabase Storage bucket; the fact of them lives
// in `pattern_pdfs` (see supabase/migrations/20260814135536_pattern_pdfs.sql).
// This file is the only thing that talks to either.
//
// ── METADATA SYNCS, BYTES DO NOT ──
//
// This is the whole design. Attaching a PDF on the phone makes the iPad say
// "there's a copy in your account" within the minute — a few hundred bytes.
// The megabytes are fetched only when someone actually taps Open on a device
// that hasn't got them. A knitting app that sits open for weeks must not pull
// 8MB in the background on the off-chance, on mobile data, per device.
//
// So a pattern is in one of four states here, and the sheet says which:
//
//   none          nothing anywhere
//   local         this device has it, the account does not yet (queued to push)
//   synced        same copy both places
//   remote-newer  the account has one this device hasn't got, or has an older
//                 copy of. One tap downloads it.
//
// ── LAST-WRITE-WINS, NOT A MERGE ──
//
// A PDF is one opaque blob: there are no fields, so there is nothing for the
// three-way merge to do and no conflict worth raising. Two devices attaching
// different files for the same pattern is rare and cheap to be wrong about —
// the newest attach wins, exactly as a project rename does. `localMs` and
// `remoteMs` are both syncNow() clocks, so they are already skew-corrected.
//
// A REMOVE is a tombstone, for the same reason a deleted project is: absence
// means "never seen", so a hard delete would have the other device helpfully
// upload its copy straight back.
// ─────────────────────────────────────────────

const PDF_BUCKET = 'pattern-pdfs';
const PDF_INDEX_KEY = 'pt3_pdfs';

// { [patternId]: { name, size, localMs, deletedMs, remoteMs, remoteName, remoteSize } }
//
// Global, not per-project: a PDF belongs to the pattern, and every project
// knitted from it refers to the same one.
//
// Kept in localStorage rather than read from IndexedDB because every caller is
// synchronous — the sheet, the push loop, the state badge. The blob is the
// heavy thing and stays where it is; this is the few hundred bytes describing
// it, which is also exactly what syncs.
let pdfIndex = {};

function loadPdfIndex() {
  try { pdfIndex = JSON.parse(localStorage.getItem(PDF_INDEX_KEY) || '{}') || {}; }
  catch (e) { pdfIndex = {}; }
}

function savePdfIndex() {
  try { localStorage.setItem(PDF_INDEX_KEY, JSON.stringify(pdfIndex)); }
  catch (e) { showSaveError(e); }
}

function pdfEntry(patternId) {
  const e = pdfIndex[patternId] || {};
  return {
    name: e.name || '', size: e.size || 0,
    localMs: e.localMs || 0, deletedMs: e.deletedMs || 0,
    remoteMs: e.remoteMs || 0, remoteName: e.remoteName || '', remoteSize: e.remoteSize || 0
  };
}

// The clock this device is claiming for a pattern: whichever of "attached" and
// "removed" happened last. A remove has to be able to beat an older attach on
// the other device, or deleting would never propagate.
function pdfLocalClock(patternId) {
  const e = pdfEntry(patternId);
  return Math.max(e.localMs, e.deletedMs);
}

// What the sheet shows. 'none' | 'local' | 'synced' | 'remote-newer'
function pdfSyncState(patternId) {
  const e = pdfEntry(patternId);
  const mine = pdfLocalClock(patternId);
  if (e.remoteMs > mine) return 'remote-newer';
  if (e.localMs && e.localMs >= e.deletedMs) return e.remoteMs === e.localMs ? 'synced' : 'local';
  return 'none';
}

// Called by js/core/pdf.js once a blob is safely in IndexedDB. Recording it
// here and queueing the push are one action — an attach the outbox never heard
// about is an attach that silently stays on one device.
function notePdfAttached(patternId, name, size) {
  const e = pdfEntry(patternId);
  pdfIndex[patternId] = Object.assign(e, {
    name: name, size: size, localMs: syncNow(), deletedMs: 0
  });
  savePdfIndex();
  enqueue('pdf', patternId);
}

function notePdfRemoved(patternId) {
  const e = pdfEntry(patternId);
  pdfIndex[patternId] = Object.assign(e, { name: '', size: 0, localMs: 0, deletedMs: syncNow() });
  savePdfIndex();
  enqueue('pdf', patternId);
}

function pdfStoragePath(uid, patternId) { return uid + '/' + patternId + '.pdf'; }

// Queue every PDF this device has that the account hasn't got.
//
// Needed because a PDF can be attached long before anyone signs in, and
// notePdfAttached() only queues at the moment of attaching — by which time
// canSync() was false and the op would have sat there anyway. The claim is the
// first point at which sending is allowed, so it is the point at which the
// backlog has to be offered. Same reasoning as claimLocalProjects() walking
// the projects list rather than trusting the outbox.
function enqueueUnsyncedPdfs() {
  Object.keys(pdfIndex).forEach(patternId => {
    if (pdfLocalClock(patternId) > pdfEntry(patternId).remoteMs) enqueue('pdf', patternId);
  });
}

// ─────────────────────────────────────────────
// PUSH
// ─────────────────────────────────────────────

// → 'done' (dequeue) | 'retry' | 'drop'
//
// Ordered so the metadata row is written LAST, after the bytes are known to be
// up. A row claiming a PDF that failed to upload would send every other device
// to fetch an object that isn't there; the reverse — bytes with no row yet — is
// invisible and fixed by the next flush.
async function pushPdf(patternId, uid) {
  const e = pdfEntry(patternId);
  const mine = pdfLocalClock(patternId);
  if (!mine) return 'drop';                    // nothing ever happened here

  const { data: remote, error } = await sb.from('pattern_pdfs')
    .select('pattern_id,file_name,byte_size,updated_ms,deleted_ms,storage_path')
    .eq('owner_id', uid).eq('pattern_id', patternId).maybeSingle();
  if (error) throw error;

  // The account's copy is newer than anything that happened on this device, so
  // this queued push is stale. Take their metadata and stop — the bytes are
  // fetched on demand, not here.
  if (remote && (Number(remote.updated_ms) || 0) > mine) {
    applyRemotePdfRow(remote);
    return 'drop';
  }

  // Already the same copy. Reached by an op queued before a pull that turned
  // out to agree, and by every download (fetchRemotePdf sets localMs to the
  // remote clock) — without this, taking a file down would immediately send
  // the identical megabytes back up.
  if (remote && (Number(remote.updated_ms) || 0) === mine) return 'drop';

  const path = pdfStoragePath(uid, patternId);

  if (e.deletedMs && e.deletedMs >= e.localMs) {
    // Removed here. Drop the object, then tombstone the row. A missing object
    // is not an error worth stopping for — it is the state we are heading for.
    const { error: rmErr } = await sb.storage.from(PDF_BUCKET).remove([path]);
    if (rmErr && !/not found/i.test(rmErr.message || '')) throw rmErr;
    const { error: upErr } = await sb.from('pattern_pdfs').upsert({
      owner_id: uid, pattern_id: patternId, file_name: e.name || 'removed.pdf',
      byte_size: 0, updated_ms: e.deletedMs, deleted_ms: e.deletedMs, storage_path: path
    }, { onConflict: 'owner_id,pattern_id' });
    if (upErr) throw upErr;
    pdfIndex[patternId] = Object.assign(pdfEntry(patternId), { remoteMs: e.deletedMs, remoteName: '', remoteSize: 0 });
    savePdfIndex();
    return 'done';
  }

  // Upload. The blob is read at send time, not queued — so a file replaced
  // twice before the flush uploads the second one, never the first.
  const rec = await pdfGet(patternId);
  if (!rec || !rec.blob) {
    // The index says there is a file and IndexedDB disagrees. Storage was
    // cleared, or a private-mode write failed after the index was written.
    // Nothing to send and nothing to retry — correct the index instead.
    console.warn('[pdfsync] no blob for ' + patternId + ' — clearing its index entry');
    delete pdfIndex[patternId];
    savePdfIndex();
    return 'drop';
  }

  const { error: putErr } = await sb.storage.from(PDF_BUCKET)
    .upload(path, rec.blob, { upsert: true, contentType: rec.type || 'application/pdf' });
  if (putErr) throw putErr;

  const { error: upErr } = await sb.from('pattern_pdfs').upsert({
    owner_id: uid, pattern_id: patternId, file_name: e.name || rec.name,
    byte_size: e.size || rec.size, content_type: rec.type || 'application/pdf',
    updated_ms: e.localMs, deleted_ms: null, storage_path: path
  }, { onConflict: 'owner_id,pattern_id' });
  if (upErr) throw upErr;

  // Server and device now hold the same copy, which is what makes the state
  // 'synced' rather than 'local'.
  pdfIndex[patternId] = Object.assign(pdfEntry(patternId), {
    remoteMs: e.localMs, remoteName: e.name, remoteSize: e.size
  });
  savePdfIndex();
  return 'done';
}

// ─────────────────────────────────────────────
// PULL
// ─────────────────────────────────────────────

// Take a remote row into the index. Metadata only — never the bytes.
// Returns true if anything changed locally.
function applyRemotePdfRow(row) {
  const patternId = row.pattern_id;
  const e = pdfEntry(patternId);
  const remoteMs = Number(row.updated_ms) || 0;
  const deleted = !!row.deleted_ms;
  if (remoteMs <= e.remoteMs && remoteMs <= pdfLocalClock(patternId)) return false;

  const next = Object.assign(e, {
    remoteMs: remoteMs,
    remoteName: deleted ? '' : (row.file_name || ''),
    remoteSize: deleted ? 0 : (Number(row.byte_size) || 0)
  });

  // A remove made on another device. Propagate it — that is what a tombstone
  // is for. Done here rather than left for the user to notice, because the
  // alternative is this device silently re-uploading the file they deleted.
  if (deleted && remoteMs > pdfLocalClock(patternId) && next.localMs) {
    pdfDeleteRec(patternId).then(() => releasePdfUrl(patternId));
    next.name = ''; next.size = 0; next.localMs = 0; next.deletedMs = remoteMs;
  }

  pdfIndex[patternId] = next;
  savePdfIndex();
  return true;
}

// Every row for this account, every pull. There is one per pattern — a handful
// per family — so a cursor would be bookkeeping that costs more than the read
// it saves.
async function pullPdfs(uid) {
  const { data, error } = await sb.from('pattern_pdfs')
    .select('pattern_id,file_name,byte_size,updated_ms,deleted_ms,storage_path')
    .eq('owner_id', uid);
  if (error) throw error;
  let changed = false;
  (data || []).forEach(row => { if (applyRemotePdfRow(row)) changed = true; });
  return changed;
}

// ─────────────────────────────────────────────
// FETCHING THE BYTES — the on-demand half
// ─────────────────────────────────────────────

// Download the account's copy into this device's IndexedDB. Called from the
// sheet when someone taps Download, never from a background timer.
//
// Resolves to true on success. Throws nothing: the sheet is the only caller
// and it renders the failure rather than letting it reach the console alone.
async function fetchRemotePdf(patternId) {
  if (typeof canSync !== 'function' || !canSync()) return false;
  const uid = currentUserId();
  const e = pdfEntry(patternId);
  const path = pdfStoragePath(uid, patternId);
  try {
    const { data, error } = await sb.storage.from(PDF_BUCKET).download(path);
    if (error) throw error;
    if (!data) return false;

    const name = e.remoteName || (patternId + '.pdf');
    const ok = await pdfPut({ id: patternId, name: name, size: data.size,
                              type: 'application/pdf', blob: data, addedAt: e.remoteMs });
    if (!ok) return false;

    // localMs is set to the REMOTE clock, not now(). Claiming a fresh local
    // edit for a file that was only copied down would make this device look
    // newer than the account and push the same bytes straight back up.
    pdfIndex[patternId] = Object.assign(pdfEntry(patternId), {
      name: name, size: data.size, localMs: e.remoteMs, deletedMs: 0
    });
    savePdfIndex();
    releasePdfUrl(patternId);
    return true;
  } catch (err) {
    logSync('error', 'pdf download failed for ' + patternId, err);
    return false;
  }
}

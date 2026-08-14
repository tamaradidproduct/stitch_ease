// ─────────────────────────────────────────────
// THE ORIGINAL PATTERN PDF
//
// The tracker is a transcription. It is deliberately not the whole document —
// no schematics, no photographs, no sizing table, none of the designer's prose.
// When a knitter needs any of that mid-project the answer has always been "go
// and find the email you bought it in", which on a phone, mid-row, is no answer
// at all. This keeps the original one tap from the section they are working.
//
// A PDF belongs to the PATTERN, not the project. It is the source document, so
// every project knitted from that pattern refers to the same one — attach it
// once and both Peacock Tees have it. That is also why deleteProject() does not
// purge it: another project may still be pointing at it, and the pattern
// outlives them all.
//
// TWO SOURCES, one resolution path:
//
//   bundled   the pattern declares `pdf: { file: 'pdf/x.pdf', title: '…' }` and
//             the file ships with the deploy. Reaches every device on its own,
//             precached by the service worker, nothing for the user to do.
//             ONLY for patterns this repo is free to publish — the GitHub Pages
//             site is public, so anything in it is world-readable at a guessable
//             URL. A bought pattern must not go here.
//   attached  the user picks a file on this device. Stored in IndexedDB, never
//             uploaded, never leaves the device.
//
// An attached file WINS over a bundled one. Attaching is a deliberate act on
// this device; a bundle is a default. Removing the attachment falls back.
//
// WHY IndexedDB AND NOT localStorage. localStorage is the progress store, and
// its quota (~5MB of UTF-16 string, shared) is already carrying a 10-40KB frozen
// pattern doc per project. A PDF is megabytes, and base64 adds a third on top.
// Putting one there would not merely fail — it would spend the same quota that
// save() needs, so the first thing to break would be the row the user just
// counted. IndexedDB stores the Blob itself, in its own much larger quota, and a
// failure in here can never reach the progress keys.
//
// NOT SYNCED. An attached PDF stays on the device that attached it; the iPad
// gets its own copy, or the bundled one. Sync would mean Supabase Storage, a
// bucket policy, upload/download states and multi-MB transfers on mobile data —
// a different feature. Bundled PDFs already cover "everyone gets it" for the
// patterns we ship.
// ─────────────────────────────────────────────

const PDF_DB      = 'stitch-ease';
const PDF_DB_VER  = 1;
const PDF_STORE   = 'pdfs';
// Not a quota — IndexedDB would take far more. It is a "you have picked the
// wrong file" guard: a knitting pattern is single-digit megabytes, and a 400MB
// pick is a scan nobody wants to wait on, on a phone, over and over.
const PDF_MAX_BYTES = 100 * 1024 * 1024;

// ── IndexedDB, wrapped in promises ──
//
// Every one of these resolves rather than rejects on an unavailable database.
// IndexedDB is absent or throws on open in private browsing on some iOS
// versions, and this feature going quiet is fine — the app must not.
let pdfDbPromise = null;

function pdfDb() {
  if (pdfDbPromise) return pdfDbPromise;
  pdfDbPromise = new Promise(resolve => {
    let req;
    try { req = indexedDB.open(PDF_DB, PDF_DB_VER); }
    catch (e) { console.warn('PDF storage unavailable', e); return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PDF_STORE)) db.createObjectStore(PDF_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => { console.warn('PDF storage unavailable', req.error); resolve(null); };
    // Safari has been known to fire neither event when a private-mode open is
    // refused. Without this the sheet would sit on its loading line forever.
    req.onblocked = () => resolve(null);
  });
  return pdfDbPromise;
}

function pdfTx(mode, fn) {
  return pdfDb().then(db => {
    if (!db) return null;
    return new Promise(resolve => {
      let tx;
      try { tx = db.transaction(PDF_STORE, mode); }
      catch (e) { console.warn('PDF transaction failed', e); return resolve(null); }
      const req = fn(tx.objectStore(PDF_STORE));
      tx.onabort = tx.onerror = () => { console.warn('PDF transaction failed', tx.error); resolve(null); };
      req.onsuccess = () => resolve(req.result === undefined ? true : req.result);
      req.onerror   = () => { console.warn('PDF request failed', req.error); resolve(null); };
    });
  });
}

function pdfGet(patternId)    { return pdfTx('readonly',  s => s.get(patternId)); }
function pdfPut(rec)          { return pdfTx('readwrite', s => s.put(rec)); }
function pdfDeleteRec(id)     { return pdfTx('readwrite', s => s.delete(id)); }

// ── Object URLs ──
//
// One live URL per pattern, kept until it is replaced. It CANNOT be revoked
// straight after opening: the tab it was handed to is still loading, and
// revoking pulls the document out from under it — a blank viewer, on the one
// screen the user opened specifically to read something. One URL per pattern
// opened this session is a bounded cost; the map exists so a second open does
// not mint a second one.
const pdfUrls = {};

function pdfUrlFor(patternId, blob) {
  if (pdfUrls[patternId]) URL.revokeObjectURL(pdfUrls[patternId]);
  pdfUrls[patternId] = URL.createObjectURL(blob);
  return pdfUrls[patternId];
}

function releasePdfUrl(patternId) {
  if (!pdfUrls[patternId]) return;
  URL.revokeObjectURL(pdfUrls[patternId]);
  delete pdfUrls[patternId];
}

// ── Resolution ──

// The bundled descriptor, normalised. A pattern may write either a bare path
// or the full object, since one of those is what anyone reaches for first.
function bundledPdf(pattern) {
  const p = pattern && pattern.pdf;
  if (!p) return null;
  const file = typeof p === 'string' ? p : p.file;
  if (!file) return null;
  return { url: file, name: (typeof p === 'object' && p.title) || file.split('/').pop() };
}

// What this device can show for a pattern, attached first. Async because the
// stored copy lives in IndexedDB — no render path calls this, only the sheet.
function resolvePatternPdf(pattern) {
  if (!pattern) return Promise.resolve(null);
  return pdfGet(pattern.id).then(rec => {
    if (rec && rec.blob) {
      return { kind: 'attached', url: pdfUrlFor(pattern.id, rec.blob),
               name: rec.name, size: rec.size, addedAt: rec.addedAt };
    }
    const b = bundledPdf(pattern);
    return b ? { kind: 'bundled', url: b.url, name: b.name } : null;
  });
}

function formatBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── The sheet ──
//
// Opened from the phase header, so it is reachable from every section including
// the chart. It is built in two passes: the frame paints immediately and the
// body fills in when IndexedDB answers, because a sheet that waits on a disk
// read before appearing reads as a dead button.

function openPatternPdf() {
  const pat = activePattern();
  if (!pat) return;
  openSheet('Original pattern', '<p class="sheet-sub" id="pdf-loading">Looking for a saved copy…</p>', {
    onOpen: el => {
      resolvePatternPdf(pat).then(src => {
        const body = el.querySelector('.sheet-body');
        if (!body || !document.getElementById('pdf-loading')) return; // sheet closed meanwhile
        body.innerHTML = src ? pdfViewHtml(pat, src) : pdfEmptyHtml(pat);
        wirePdfSheet(body, pat);
      });
    }
  });
}

function pdfViewHtml(pat, src) {
  // A real anchor, not a button calling window.open(). A user-gesture anchor
  // click is the one path no popup blocker interferes with, and on Android
  // Chrome it is also what hands a blob: URL to the system PDF viewer instead
  // of dropping it. target=_blank keeps the tracker alive behind it, which
  // matters — coming back must not mean reloading and rescrolling the chart.
  //
  // Deliberately NO `download` attribute. It looks like the right way to give
  // a blob: URL its filename back, but it changes what the link DOES: the
  // browser saves the file instead of displaying it. The whole point is to
  // read the thing. A UUID in the tab title is the price, and the viewer's own
  // save button is still there for anyone who wants the file.
  const meta = src.kind === 'attached'
    ? [formatBytes(src.size), 'on this device'].filter(Boolean).join(' · ')
    : 'included with the pattern';
  return `
    <div class="pdf-file">
      <div class="pdf-file-name">${escapeHtml(src.name || 'Pattern PDF')}</div>
      <div class="pdf-file-meta">${escapeHtml(meta)}</div>
    </div>
    <div class="sheet-actions">
      <a class="sheet-btn primary" href="${escapeHtml(src.url)}" target="_blank" rel="noopener"
         id="pdf-open">Open</a>
    </div>
    <div class="sheet-actions">
      <button class="sheet-btn" id="pdf-replace">${src.kind === 'attached' ? 'Replace' : 'Use my own file'}</button>
      ${src.kind === 'attached' ? '<button class="sheet-btn" id="pdf-remove">Remove</button>' : ''}
    </div>
    <p class="acct-note">${src.kind === 'attached'
      ? 'Saved on this device only — it isn’t uploaded, and other devices won’t see it.'
      : 'Shipped with the app. Attach your own file to use that instead.'}</p>`;
}

function pdfEmptyHtml(pat) {
  return `
    <p class="sheet-msg">No original pattern saved for ${escapeHtml(pat.name)}.</p>
    <p class="sheet-sub">Add the PDF you bought it in, and it’ll be one tap away from any section — including offline.</p>
    <div class="sheet-actions">
      <button class="sheet-btn primary" id="pdf-replace">Choose a PDF</button>
    </div>
    <p class="acct-note">The file is stored on this device only. It isn’t uploaded anywhere, and other devices won’t see it.</p>`;
}

function wirePdfSheet(body, pat) {
  const replace = body.querySelector('#pdf-replace');
  if (replace) replace.onclick = () => choosePatternPdf(pat);
  const remove = body.querySelector('#pdf-remove');
  if (remove) remove.onclick = () => confirmRemovePatternPdf(pat);
  // Opening is the whole point of the sheet, so it closes behind you rather
  // than leaving a dialog over the tracker to dismiss on the way back.
  const open = body.querySelector('#pdf-open');
  if (open) open.onclick = () => setTimeout(closeSheet, 0);
}

// ── Attaching ──
//
// The input is created per pick and thrown away. A retained one would keep the
// previous File alive (and its bytes) for as long as the app is open, and a
// reused input does not re-fire `change` when the same file is picked twice —
// which is exactly what someone does after a failed save.
function choosePatternPdf(pat) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = () => {
    const file = input.files && input.files[0];
    document.body.removeChild(input);
    if (file) storePatternPdf(pat, file);
  };
  input.click();
}

function storePatternPdf(pat, file) {
  // Type check on both, because a file picked from some Android providers
  // arrives with an empty `type` even when it is a PDF.
  const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!looksPdf) return pdfError('That doesn’t look like a PDF.', 'Pick a .pdf file — the original pattern as you downloaded it.');
  if (file.size > PDF_MAX_BYTES) {
    return pdfError('That file is ' + formatBytes(file.size) + '.',
      'Patterns are usually a few MB. Anything over ' + formatBytes(PDF_MAX_BYTES) + ' is more likely a scan than a pattern, and would be slow to open every time.');
  }

  const rec = { id: pat.id, name: file.name || 'pattern.pdf', size: file.size,
                type: file.type || 'application/pdf', blob: file, addedAt: Date.now() };
  pdfPut(rec).then(ok => {
    if (!ok) {
      return pdfError('Couldn’t save the PDF on this device.',
        'Private browsing blocks file storage, and a full device will refuse it too. Your knitting progress is unaffected.');
    }
    // The stored blob replaces whatever the old URL pointed at.
    releasePdfUrl(pat.id);
    openPatternPdf();   // reopen on the saved file, so the result is visible
  });
}

function confirmRemovePatternPdf(pat) {
  sheetConfirm({
    title: 'Remove PDF',
    message: 'Remove the saved PDF for ' + pat.name + '?',
    detail: 'Only the copy on this device is removed. Your progress and the original file wherever you got it are untouched.',
    confirmLabel: 'Remove',
    danger: true,
    onConfirm: () => {
      pdfDeleteRec(pat.id).then(() => { releasePdfUrl(pat.id); openPatternPdf(); });
    }
  });
}

function pdfError(message, detail) {
  openSheet('Original pattern', `
    <p class="sheet-msg">${escapeHtml(message)}</p>
    <p class="sheet-sub">${escapeHtml(detail)}</p>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Close</button>
      <button class="sheet-btn primary" id="pdf-retry">Pick another file</button>
    </div>`, {
    onOpen: el => {
      const pat = activePattern();
      el.querySelector('#pdf-retry').onclick = () => { if (pat) choosePatternPdf(pat); };
    }
  });
}

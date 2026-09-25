// ─────────────────────────────────────────────
// ON-DEVICE PATTERN IMPORT (CSV → pattern)
//
// Custom patterns live ONLY in localStorage (pt3_custom_patterns) and are
// never written to a committed js/patterns/*.js file. That split is the
// whole point: a bought/licensed pattern the deploy repo has no right to
// redistribute can still be tracked here, because it never leaves the
// device — unless the user signs in, when js/cloud/patternsync.js shares it
// with their family through the private `custom_patterns` table (never the
// public Pages repo). See docs/pattern-csv-template.md for the column format.
//
// A custom pattern is a plain PATTERNS entry (docs/rows-sections-model.md
// shape) with `custom: true` added so it can be told apart from the
// bundled ones for saving/removal. Everything downstream — activateProject,
// structHash, sync, chart (absent) — treats it exactly like any other
// pattern; it was never a special case.
// ─────────────────────────────────────────────

const CUSTOM_PATTERNS_KEY = 'pt3_custom_patterns';

function loadCustomPatterns() {
  let list;
  try { list = JSON.parse(localStorage.getItem(CUSTOM_PATTERNS_KEY) || '[]'); }
  catch (e) { list = []; }
  list.forEach(p => { p.custom = true; PATTERNS.push(p); });
}
loadCustomPatterns();

function saveCustomPatterns() {
  localStorage.setItem(CUSTOM_PATTERNS_KEY, JSON.stringify(PATTERNS.filter(p => p.custom)));
}

// ── CSV parsing ──
// Handles quoted fields, embedded commas/newlines, and "" as an escaped quote.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* ignore, \n ends the row */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(f => f === '')) rows.pop();
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

// Text fields come from an arbitrary file on disk, not authored code, so —
// unlike the bundled patterns — they're escaped once here at import time
// rather than trusted raw the way entryHtml() renders every step.text.
function buildPatternFromRows(rows) {
  if (!rows.length) throw new Error('CSV has no data rows.');
  const patternId = rows[0].pattern_id;
  if (!patternId) throw new Error('First row is missing pattern_id.');
  // Whether patternId may already be taken (a fresh import vs. an update) is
  // importPatternCsvText's call, not this function's — this only builds and
  // validates the shape of what the CSV describes.

  const named = rows.find(r => r.pattern_name);
  const pattern = {
    id: patternId,
    name: escapeHtml((named && named.pattern_name) || patternId),
    phases: [],
    custom: true
  };
  if (named && named.pattern_badge) pattern.badge = escapeHtml(named.pattern_badge);
  if (named && named.pattern_desc) pattern.desc = escapeHtml(named.pattern_desc);

  const phaseById = {};
  const repeatByKey = {};

  rows.forEach((r, i) => {
    const line = i + 2; // header is row 1
    if (r.pattern_id && r.pattern_id !== patternId)
      throw new Error(`Row ${line}: pattern_id "${r.pattern_id}" doesn't match "${patternId}" — one pattern per CSV.`);
    const phaseId = r.phase_id;
    if (!phaseId) throw new Error(`Row ${line} is missing phase_id.`);
    let phase = phaseById[phaseId];
    if (!phase) {
      // p.desc is interpolated unconditionally by renderPhase(), so an absent
      // value must be '' rather than undefined (which would render literally).
      phase = { id: phaseId, name: escapeHtml(r.phase_name || phaseId), desc: escapeHtml(r.phase_desc || ''), entries: [] };
      phaseById[phaseId] = phase;
      pattern.phases.push(phase);
    }

    const kind = r.kind;
    if (!kind) throw new Error(`Row ${line} is missing kind (note, row, or repeat).`);
    const entryId = r.entry_id;
    if (!entryId) throw new Error(`Row ${line} is missing entry_id.`);

    if (kind === 'note' || kind === 'row') {
      const entry = { kind, id: entryId, text: escapeHtml(r.text || '') };
      if (kind === 'note' && r.bullets) {
        entry.bullets = r.bullets.split('|').map(b => escapeHtml(b.trim())).filter(Boolean);
      }
      phase.entries.push(entry);
    } else if (kind === 'repeat') {
      const repKey = phaseId + '::' + entryId;
      let entry = repeatByKey[repKey];
      if (!entry) {
        entry = { kind: 'repeat', id: entryId, times: parseInt(r.repeat_times, 10) || 1, rows: [] };
        if (r.text) entry.text = escapeHtml(r.text);
        repeatByKey[repKey] = entry;
        phase.entries.push(entry);
      }
      if (r.sub_row_id || r.sub_row_text) {
        entry.rows.push({
          id: r.sub_row_id || (entryId + '-' + (entry.rows.length + 1)),
          text: escapeHtml(r.sub_row_text || '')
        });
      }
    } else {
      throw new Error(`Row ${line}: unknown kind "${kind}" (expected note, row, or repeat).`);
    }
  });

  if (!pattern.phases.length) throw new Error('No phases found.');
  pattern.phases.forEach(p => {
    if (!p.entries.length) throw new Error(`Phase "${p.id}" has no entries.`);
    p.entries.forEach(e => {
      if (e.kind === 'repeat' && !e.rows.length)
        throw new Error(`Repeat "${e.id}" in phase "${p.id}" has no sub-rows.`);
    });
  });
  return pattern;
}

// ── New vs. update: the file never decides ──
//
// A fresh import ALWAYS becomes a new pattern with its own id; it never
// replaces anything, whatever its pattern_id or name says. Replacing is only
// ever the explicit "Update" action on a custom pattern's tile, which carries
// the id to replace with it.
//
// Matching by id used to do double duty as "is this an update?", and it was
// too fragile for that: a chart's id is a slug of its NAME, so renaming a
// chart in the exporter made a duplicate, and two unrelated charts both called
// "Swatch" replaced each other. With family sync it would also have reached
// across people — two members importing different "Swatch" charts would
// silently overwrite one another's. A generated suffix makes every import its
// own pattern, on every device, for everyone.

// A sync-safe id for a new import: the file's own id (or name) slugged, plus a
// random suffix. Slugging also keeps ids out of the characters that
// patternsync.js refuses, so a hand-written CSV id can't strand a pattern on
// one device.
function newCustomPatternId(base) {
  const slug = String(base || 'pattern').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40) || 'pattern';
  let id;
  do { id = slug + '-' + Math.random().toString(36).slice(2, 8); } while (patternById(id));
  return id;
}

// Put a built pattern into the library. `updateId` present → replace that
// custom pattern (the tile's Update action); absent → add as a new pattern.
function putCustomPattern(pattern, updateId) {
  if (updateId) {
    const idx = PATTERNS.findIndex(p => p.id === updateId);
    if (idx === -1 || !PATTERNS[idx].custom) throw new Error('That pattern is no longer in your library.');
    pattern.id = updateId;
    PATTERNS[idx] = pattern;
  } else {
    pattern.id = newCustomPatternId(pattern.id);
    PATTERNS.push(pattern);
  }
  saveCustomPatterns();
  if (typeof noteCustomPatternSaved === 'function') noteCustomPatternSaved(pattern.id);
  return pattern;
}

function importPatternCsvText(text, updateId) {
  return putCustomPattern(buildPatternFromRows(parseCsv(text)), updateId);
}

// ── UI wiring (picker screen) ──

// Which pattern the file picker is updating, if any. Set by the tile's Update
// button just before it opens the picker; consumed (and cleared) when the file
// arrives, so a later plain Import can never inherit it.
let patternUpdateTarget = null;

function triggerImportPattern() {
  patternUpdateTarget = null;
  const input = document.getElementById('pattern-csv-input');
  if (input) input.click();
}

function triggerUpdatePattern(id, evt) {
  if (evt) evt.stopPropagation();   // the tile itself starts a project
  const pat = patternById(id);
  if (!pat || !pat.custom) return;
  patternUpdateTarget = id;
  const input = document.getElementById('pattern-csv-input');
  if (input) input.click();
}

// `safeHtml` is trusted HTML the caller has already made safe — either
// escapeHtml()'d raw text, or a pattern field that was escaped once already
// at import time (see buildPatternFromRows) and would be double-escaped by
// escaping it again here.
function importResultSheet(title, safeHtml) {
  openSheet(title, `<p class="sheet-msg">${safeHtml}</p>
    <div class="sheet-actions"><button class="sheet-btn primary" onclick="dismissSheet()">OK</button></div>`);
}

// The file input accepts CSV and .stitchchart.json alike; which parser runs
// is decided from the content by handlePatternFileText() (chartImport.js).
function handlePatternCsvFile(input) {
  const file = input.files && input.files[0];
  const updateId = patternUpdateTarget;
  patternUpdateTarget = null;
  input.value = ''; // allow re-importing the same filename later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => handlePatternFileText(String(reader.result), updateId);
  reader.onerror = () => importResultSheet('Import failed', 'Could not read that file.');
  reader.readAsText(file);
}

function handlePatternCsvText(text, updateId) {
  if (updateId) { confirmUpdatePattern(text, updateId); return; }
  try {
    const pattern = importPatternCsvText(text);
    resetHeaderKey();
    render();
    importResultSheet('Pattern imported', `${pattern.name} was added to the library.`);
  } catch (e) {
    importResultSheet('Import failed', escapeHtml(e.message || String(e)));
  }
}

// Updating is still a structural change to a pattern projects may be
// knitting, so it's confirmed, and parsed first so a broken file fails before
// the question is asked. The patternForProject()/adoptPattern flow (state.js)
// does the rest: a project whose progress predates the change keeps working
// from its frozen snapshot and gets the "Pattern updated · Review" chip.
function confirmUpdatePattern(text, id) {
  const existing = patternById(id);
  if (!existing || !existing.custom) { importResultSheet('Update failed', 'That pattern is no longer in your library.'); return; }
  let built;
  try { built = buildPatternFromRows(parseCsv(text)); }
  catch (e) { importResultSheet('Update failed', escapeHtml(e.message || String(e))); return; }
  const body = `<p class="sheet-msg">Replace "${existing.name}" with "${built.name}" from this file?</p>
    <p class="sheet-sub">${updateSharedNote()}</p>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Cancel</button>
      <button class="sheet-btn primary" id="pattern-replace-ok">Update</button>
    </div>`;
  openSheet('Update pattern?', body, {
    onOpen: el => {
      el.querySelector('#pattern-replace-ok').onclick = () => {
        closeSheet();
        try {
          const pattern = putCustomPattern(built, id);
          resetHeaderKey();
          render();
          importResultSheet('Pattern updated', `${pattern.name} was updated.`);
        } catch (e) {
          importResultSheet('Update failed', escapeHtml(e.message || String(e)));
        }
      };
    }
  });
}

// Said on both update sheets (CSV and chart), so the two can't drift.
function updateSharedNote() {
  return 'Existing projects keep their progress — they’ll show “Pattern updated” so you can review what changed.' +
    (typeof currentUserId === 'function' && currentUserId() ? ' The update also reaches your other devices and your family.' : '');
}

function removeCustomPattern(id) {
  const idx = PATTERNS.findIndex(p => p.id === id && p.custom);
  if (idx === -1) return;
  PATTERNS.splice(idx, 1);
  saveCustomPatterns();
  // A tombstone, not just an absence — see js/cloud/patternsync.js.
  if (typeof noteCustomPatternRemoved === 'function') noteCustomPatternRemoved(id);
  render();
}

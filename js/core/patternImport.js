// ─────────────────────────────────────────────
// ON-DEVICE PATTERN IMPORT (CSV → pattern)
//
// Custom patterns live ONLY in localStorage (pt3_custom_patterns) and are
// never written to a committed js/patterns/*.js file. That split is the
// whole point: a bought/licensed pattern the deploy repo has no right to
// redistribute can still be tracked here, because it never leaves the
// device. See docs/pattern-csv-template.md for the column format.
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

// `replace: true` is the caller's confirmation that overwriting an existing
// custom pattern is intended (see confirmReplacePattern below) — without it,
// a same-id CSV is treated as a mistake rather than silently applied, since
// it changes what every project on that pattern knits.
function importPatternCsvText(text, opts) {
  opts = opts || {};
  const pattern = buildPatternFromRows(parseCsv(text));
  const existingIdx = PATTERNS.findIndex(p => p.id === pattern.id);
  if (existingIdx === -1) {
    PATTERNS.push(pattern);
  } else {
    const existing = PATTERNS[existingIdx];
    if (!existing.custom) {
      throw new Error(`"${existing.name}" is a built-in pattern and can't be replaced by CSV import.`);
    }
    if (!opts.replace) {
      const err = new Error(`already-exists`);
      err.existingId = pattern.id;
      throw err;
    }
    PATTERNS[existingIdx] = pattern;
  }
  saveCustomPatterns();
  return pattern;
}

// ── UI wiring (picker screen) ──

function triggerImportPattern() {
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

function handlePatternCsvFile(input) {
  const file = input.files && input.files[0];
  input.value = ''; // allow re-importing the same filename later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    try {
      const pattern = importPatternCsvText(text);
      resetHeaderKey();
      render();
      importResultSheet('Pattern imported', `${pattern.name} was added to the library.`);
    } catch (e) {
      if (e.existingId) confirmReplacePattern(text, e.existingId);
      else importResultSheet('Import failed', escapeHtml(e.message || String(e)));
    }
  };
  reader.onerror = () => importResultSheet('Import failed', 'Could not read that file.');
  reader.readAsText(file);
}

// A same-id CSV is an update, not a duplicate — but it's still a structural
// change to a pattern projects may already be knitting, so it's confirmed
// rather than applied silently. The existing patternForProject()/adoptPattern
// flow (state.js) already handles that: a project whose progress predates the
// change keeps working from its frozen snapshot and gets the normal
// "Pattern updated · Review" chip, exactly as it would for a bundled pattern
// whose code changed underneath it. Nothing project-side needed adding here.
function confirmReplacePattern(text, id) {
  const existing = patternById(id);
  const body = `<p class="sheet-msg">"${existing.name}" is already in your library. Replace it with this CSV?</p>
    <p class="sheet-sub">Existing projects keep their progress — they'll show "Pattern updated" so you can review what changed.</p>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Cancel</button>
      <button class="sheet-btn primary" id="pattern-replace-ok">Update</button>
    </div>`;
  openSheet('Update pattern?', body, {
    onOpen: el => {
      el.querySelector('#pattern-replace-ok').onclick = () => {
        closeSheet();
        try {
          const pattern = importPatternCsvText(text, { replace: true });
          resetHeaderKey();
          render();
          importResultSheet('Pattern updated', `${pattern.name} was updated.`);
        } catch (e) {
          importResultSheet('Import failed', escapeHtml(e.message || String(e)));
        }
      };
    }
  });
}

function removeCustomPattern(id) {
  const idx = PATTERNS.findIndex(p => p.id === id && p.custom);
  if (idx === -1) return;
  PATTERNS.splice(idx, 1);
  saveCustomPatterns();
  render();
}

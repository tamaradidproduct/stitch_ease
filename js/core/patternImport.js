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
  if (patternById(patternId)) throw new Error(`A pattern with id "${patternId}" already exists.`);

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

function importPatternCsvText(text) {
  const pattern = buildPatternFromRows(parseCsv(text));
  PATTERNS.push(pattern);
  saveCustomPatterns();
  return pattern;
}

// ── UI wiring (picker screen) ──

function triggerImportPattern() {
  const input = document.getElementById('pattern-csv-input');
  if (input) input.click();
}

function importResultSheet(title, message) {
  openSheet(title, `<p class="sheet-msg">${escapeHtml(message)}</p>
    <div class="sheet-actions"><button class="sheet-btn primary" onclick="dismissSheet()">OK</button></div>`);
}

function handlePatternCsvFile(input) {
  const file = input.files && input.files[0];
  input.value = ''; // allow re-importing the same filename later
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const pattern = importPatternCsvText(String(reader.result));
      resetHeaderKey();
      render();
      importResultSheet('Pattern imported', `${pattern.name} was added to the library.`);
    } catch (e) {
      importResultSheet('Import failed', e.message || String(e));
    }
  };
  reader.onerror = () => importResultSheet('Import failed', 'Could not read that file.');
  reader.readAsText(file);
}

function removeCustomPattern(id) {
  const idx = PATTERNS.findIndex(p => p.id === id && p.custom);
  if (idx === -1) return;
  PATTERNS.splice(idx, 1);
  saveCustomPatterns();
  render();
}

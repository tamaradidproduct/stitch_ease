// ─────────────────────────────────────────────
// ON-DEVICE CHART IMPORT (.stitchchart.json → pattern)
//
// The second way into the library, beside CSV (patternImport.js). A
// `.stitchchart.json` is the export from the companion chart-tracing app:
// a sparse list of placed stitches, each [x, y, paletteIndex], plus an
// optional per-cell colour list of the same shape. It becomes a custom
// pattern with ONE chart phase — stored and treated exactly like a CSV
// import (pt3_custom_patterns, `custom: true`, never committed).
//
// Coordinates: y grows UPWARD in the export (the bottom traced row has the
// lowest y), so min-y is row 1 — the row worked first, same as every chart
// here. x grows left → right, matching how CHART_B rows are stored. Any
// cell inside the bounding box with nothing placed is 'E' (no stitch),
// which is also what gives a shaped chart (a triangle, a neckline) its
// outline.
//
// What is deliberately NOT kept: `referenceImage`. It is a base64 PNG and
// typically ~95% of the file; localStorage is the progress store, and
// spending its quota on a tracing aid would break save() first.
// ─────────────────────────────────────────────

// Export stitch id → this app's chart token (a SYMS key, or 'K' for the
// blank knit cell). Several spellings per stitch because the exporting app
// is still evolving; add to this list rather than renaming a token.
const STITCHCHART_IDS = {
  knit: 'K', k: 'K',
  purl: 'P', p: 'P',
  ktbl: 'KTBL', ptbl: 'PTBL',
  yo: 'YO', yarnover: 'YO',
  k2tog: 'K2', ssk: 'SK', skpo: 'SK',
  ssp: 'SSP', p2tog: 'P2TOG', p3tog: 'P3TOG',
  m1: 'M1', m1l: 'M1L', m1r: 'M1R', m1lp: 'M1LP', m1rp: 'M1RP',
  sk2po: 'SK2PO', cdd: 'CDD',
  tk2tog: 'TK2TOG', tssk: 'TSSK',
  brk: 'BRK', brp: 'BRP',
  gp: 'GP', ghostpurl: 'GP',
  none: 'E', nostitch: 'E', empty: 'E',
};

// Tolerant of the exporter's `knit::#d3f3d0` style (id::colour) and of
// case/spacing/hyphens, so "K2tog", "k2-tog" and "k2tog" all resolve.
function stitchChartToken(id) {
  const key = String(id).split('::')[0].toLowerCase().replace(/[\s_-]/g, '');
  return STITCHCHART_IDS[key] || null;
}

const HEX_COLOR = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

// The legend glyph for a yarn colour. One function, because a synced pattern
// doc's `symbol` is rendered raw and patternsync.js only lets one through if it
// is byte-for-byte what this returns for a valid hex.
function colorSwatchSvg(hex) {
  return `<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><rect x="3" y="3" width="18" height="18" rx="2" fill="${hex}" stroke="rgba(0,0,0,.25)"/></svg>`;
}

function chartSlug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'chart';
}

// Parse + validate. Pure: returns a draft (no PATTERNS mutation), so the
// preview sheet can show exactly what will be added before anything is.
function parseStitchChart(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error('That file isn\'t valid JSON.'); }
  if (!d || typeof d !== 'object' || !Array.isArray(d.stitches) || !Array.isArray(d.palette))
    throw new Error('That doesn\'t look like a stitch chart export (no stitches or palette).');
  if (typeof d.v === 'number' && d.v > 3)
    throw new Error(`This chart was exported by a newer version (v${d.v}). Update the app and try again.`);
  if (!d.stitches.length) throw new Error('The chart has no stitches.');

  // Resolve the palette up front so an unknown stitch is reported once, by
  // name, rather than as "cell 412 is invalid".
  const tokens = d.palette.map(stitchChartToken);
  const unknown = d.palette.filter((id, i) => !tokens[i]);
  if (unknown.length)
    throw new Error(`This chart uses stitches the app doesn't know yet: ${unknown.join(', ')}.`);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of d.stitches) {
    if (!Array.isArray(s) || s.length < 3 || !Number.isInteger(s[0]) || !Number.isInteger(s[1]) ||
        !Number.isInteger(s[2]) || s[2] < 0 || s[2] >= tokens.length)
      throw new Error('The chart has a malformed stitch entry.');
    if (s[0] < minX) minX = s[0]; if (s[0] > maxX) maxX = s[0];
    if (s[1] < minY) minY = s[1]; if (s[1] > maxY) maxY = s[1];
  }
  const cols = maxX - minX + 1, rows = maxY - minY + 1;
  if (cols > 400 || rows > 1000) throw new Error(`The chart is too large (${rows} rows × ${cols} sts).`);

  const chart = Array.from({ length: rows }, () => Array(cols).fill('E'));
  for (const [x, y, i] of d.stitches) chart[y - minY][x - minX] = tokens[i];

  // Colours only where a stitch actually sits — a colour on an empty cell
  // would draw a swatch on "no stitch". Kept as a parallel grid (not folded
  // into the token) so every existing reader of CHART_B stays untouched.
  let colors = null;
  if (Array.isArray(d.colors) && d.colors.length) {
    const pal = Array.isArray(d.colorPalette) ? d.colorPalette : [];
    colors = Array.from({ length: rows }, () => Array(cols).fill(null));
    let any = false;
    for (const c of d.colors) {
      if (!Array.isArray(c) || c.length < 3) continue;
      const r = c[1] - minY, col = c[0] - minX;
      if (r < 0 || r >= rows || col < 0 || col >= cols || chart[r][col] === 'E') continue;
      const hex = typeof c[2] === 'number' ? pal[c[2]] : c[2];
      if (typeof hex === 'string' && HEX_COLOR.test(hex)) { colors[r][col] = hex.toLowerCase(); any = true; }
    }
    if (!any) colors = null;
  }

  const counts = {};
  chart.forEach(row => row.forEach(t => { if (t !== 'E') counts[t] = (counts[t] || 0) + 1; }));
  const usedColors = colors ? [...new Set(colors.flat().filter(Boolean))] : [];

  // Row-completeness: a traced-in-progress export has a full bounding box
  // but mostly empty rows. Worth saying in the preview, not worth refusing.
  const sparseRows = chart.filter(row => row.filter(t => t !== 'E').length <= 1).length;

  const name = String(d.name || 'Imported chart').trim().slice(0, 80) || 'Imported chart';
  return {
    name, rows, cols, chart, colors, counts, usedColors, sparseRows,
    colorNames: (d.colorNames && typeof d.colorNames === 'object') ? d.colorNames : {},
    // Optional hints the exporter can add; the preview sheet lets the knitter
    // override both.
    worked: d.worked === 'round' ? 'round' : 'flat',
    wsFirst: d.firstRow === 'WS',
  };
}

// Draft → PATTERNS entry. Text is escaped here once, the same contract as
// buildPatternFromRows(): pattern fields are rendered as trusted HTML.
function buildChartPattern(draft, opts) {
  const name = String((opts && opts.name) || draft.name).trim() || draft.name;
  const flat = (opts && opts.worked ? opts.worked : draft.worked) !== 'round';
  const wsFirst = flat && !!(opts && 'wsFirst' in opts ? opts.wsFirst : draft.wsFirst);
  const phase = {
    id: 'chart', name: 'Chart',
    desc: `${draft.rows} rows · ${draft.cols} sts · worked ${flat ? 'flat' : 'in the round'}`,
    hasChart: true, chart: draft.chart, entries: [],
  };
  if (flat) phase.flatChart = true;
  if (wsFirst) phase.wsFirst = true;
  if (draft.colors) phase.chartColors = draft.colors;

  // Notes defer to the glossary for what a stitch means (see CLAUDE.md);
  // 'K' is the blank cell, so it has no glyph to show.
  const termFor = { K: 'Knit', P: 'Purl' };
  const notes = Object.keys(draft.counts).map(t => {
    const g = typeof GLOSSARY !== 'undefined' ? glossaryEntryBySym(t) : null;
    const n = { term: termFor[t] || (g && g.term) || (STITCH_ABBR_RS[t] || t) };
    if (t !== 'K') n.sym = t;
    return n;
  });
  draft.usedColors.forEach((hex, i) => {
    const label = draft.colorNames[hex] ? String(draft.colorNames[hex]) : `Colour ${i + 1}`;
    notes.push({
      term: label,
      def: 'Chart cells shaded this colour are worked in this yarn.',
      symbol: colorSwatchSvg(hex),
    });
  });

  return {
    id: 'sc-' + chartSlug(name),
    name: escapeHtml(name),
    badge: 'Imported chart',
    desc: escapeHtml(`${draft.rows} rows × ${draft.cols} sts`),
    phases: [phase],
    chart: draft.chart,
    notes,
    custom: true,
  };
}

// Glossary rows carry `sym` (the chart token) for the stitches that have
// chart artwork — the reliable key from a token back to its description.
function glossaryEntryBySym(sym) {
  for (const craft of GLOSSARY)
    for (const group of craft.groups)
      for (const t of group.terms)
        if (t.sym === sym) return t;
  return null;
}

function addCustomPattern(pattern, replace) {
  const idx = PATTERNS.findIndex(p => p.id === pattern.id);
  if (idx !== -1) {
    if (!PATTERNS[idx].custom) throw new Error(`"${PATTERNS[idx].name}" is a built-in pattern and can't be replaced.`);
    if (!replace) { const err = new Error('already-exists'); err.existingId = pattern.id; throw err; }
    PATTERNS[idx] = pattern;
  } else {
    PATTERNS.push(pattern);
  }
  saveCustomPatterns();
  if (typeof noteCustomPatternSaved === 'function') noteCustomPatternSaved(pattern.id);
}

// ── Preview sheet ──

// A small canvas thumbnail, drawn not built from DOM cells: a 60×45 chart
// is 2,700 elements, and this sheet is only here to say "yes, that's it".
function drawChartPreview(canvas, draft) {
  const maxW = Math.min(320, canvas.parentElement ? canvas.parentElement.clientWidth || 320 : 320);
  const cell = Math.max(2, Math.min(10, Math.floor(maxW / draft.cols), Math.floor(220 / draft.rows)));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = draft.cols * cell * dpr; canvas.height = draft.rows * cell * dpr;
  canvas.style.width = draft.cols * cell + 'px'; canvas.style.height = draft.rows * cell + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  for (let r = 0; r < draft.rows; r++) {
    const y = (draft.rows - 1 - r) * cell; // row 1 at the bottom, as knitted
    for (let c = 0; c < draft.cols; c++) {
      const t = draft.chart[r][c];
      if (t === 'E') continue;
      ctx.fillStyle = (draft.colors && draft.colors[r][c]) || '#fffefb';
      ctx.fillRect(c * cell, y, cell - (cell > 3 ? 1 : 0), cell - (cell > 3 ? 1 : 0));
      if (t !== 'K' && cell >= 4) {
        ctx.fillStyle = 'rgba(42,37,32,.7)';
        const d = Math.max(1, Math.round(cell / 3));
        ctx.fillRect(c * cell + (cell - d) / 2 - 0.5, y + (cell - d) / 2 - 0.5, d, d);
      }
    }
  }
}

function openChartImportPreview(draft) {
  const labelFor = t => STITCH_ABBR_RS[t] || t;
  const stitchList = Object.entries(draft.counts).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span class="imp-chip">${t === 'K' ? '' : `<span class="imp-chip-sym">${SYMS[t] || ''}</span>`}${escapeHtml(labelFor(t))} <b>${n}</b></span>`).join('');
  const colorList = draft.usedColors.map((hex, i) =>
    `<span class="imp-chip"><span class="imp-swatch" style="background:${hex}"></span>${escapeHtml(draft.colorNames[hex] || 'Colour ' + (i + 1))}</span>`).join('');
  const sparse = draft.sparseRows > draft.rows / 2
    ? `<p class="sheet-sub imp-warn">${draft.sparseRows} of ${draft.rows} rows have one stitch or none — this chart may not be fully traced yet.</p>` : '';

  const body = `
    <label class="imp-label" for="imp-name">Name</label>
    <input class="sheet-input" id="imp-name" value="${escapeHtml(draft.name)}" maxlength="80" autocomplete="off">
    <div class="imp-preview"><canvas id="imp-canvas" aria-label="Chart preview"></canvas></div>
    <p class="sheet-sub imp-dims">${draft.rows} rows × ${draft.cols} stitches</p>
    ${sparse}
    <div class="imp-chips">${stitchList}${colorList}</div>
    <div class="imp-label">Worked</div>
    <div class="imp-seg" role="radiogroup" aria-label="Worked">
      <button type="button" role="radio" data-worked="flat">Flat</button>
      <button type="button" role="radio" data-worked="round">In the round</button>
    </div>
    <div id="imp-side-wrap">
      <div class="imp-label">Row 1 is a</div>
      <div class="imp-seg" role="radiogroup" aria-label="Row 1 side">
        <button type="button" role="radio" data-side="RS">Right-side row</button>
        <button type="button" role="radio" data-side="WS">Wrong-side row</button>
      </div>
    </div>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Cancel</button>
      <button class="sheet-btn primary" id="imp-ok">Add to library</button>
    </div>`;

  openSheet('Import chart', body, {
    onOpen: el => {
      let worked = draft.worked, side = draft.wsFirst ? 'WS' : 'RS';
      const paint = () => {
        el.querySelectorAll('[data-worked]').forEach(b => b.setAttribute('aria-checked', b.dataset.worked === worked));
        el.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-checked', b.dataset.side === side));
        el.querySelector('#imp-side-wrap').hidden = worked === 'round';
      };
      el.querySelectorAll('[data-worked]').forEach(b => b.onclick = () => { worked = b.dataset.worked; paint(); });
      el.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { side = b.dataset.side; paint(); });
      paint();
      drawChartPreview(el.querySelector('#imp-canvas'), draft);
      const nameEl = el.querySelector('#imp-name');
      const ok = el.querySelector('#imp-ok');
      nameEl.oninput = () => { ok.disabled = !nameEl.value.trim(); };
      ok.onclick = () => {
        const pattern = buildChartPattern(draft, { name: nameEl.value, worked, wsFirst: side === 'WS' });
        closeSheet();
        try {
          addCustomPattern(pattern, false);
          afterPatternImport(pattern, 'Pattern imported', 'was added to the library.');
        } catch (e) {
          if (e.existingId) confirmReplaceChart(pattern, nameEl.value.trim());
          else importResultSheet('Import failed', escapeHtml(e.message || String(e)));
        }
      };
    }
  });
}

// Same reasoning as confirmReplacePattern(): re-exporting a chart you've
// been refining is an update, but it changes what open projects knit, so
// it's confirmed — and the freeze/adopt flow takes it from there.
// `rawName` is the unescaped name: sheetConfirm escapes its message itself.
function confirmReplaceChart(pattern, rawName) {
  sheetConfirm({
    title: 'Update pattern?',
    message: `"${rawName}" is already in your library. Replace it with this chart?`,
    detail: 'Existing projects keep their progress — they\'ll show "Pattern updated" so you can review what changed.',
    confirmLabel: 'Update',
    onConfirm: () => {
      try {
        addCustomPattern(pattern, true);
        afterPatternImport(pattern, 'Pattern updated', 'was updated.');
      } catch (e) {
        importResultSheet('Import failed', escapeHtml(e.message || String(e)));
      }
    }
  });
}

function afterPatternImport(pattern, title, verb) {
  resetHeaderKey();
  render();
  importResultSheet(title, `${pattern.name} ${verb}`);
}

function handleStitchChartText(text) {
  let draft;
  try { draft = parseStitchChart(text); }
  catch (e) { importResultSheet('Import failed', escapeHtml(e.message || String(e))); return; }
  openChartImportPreview(draft);
}

// One entry point for every import format, chosen by content rather than
// extension: iOS's Files picker often hands over a .json with a generic
// type, and a CSV never starts with '{'.
function handlePatternFileText(text) {
  if (/^\s*\{/.test(text)) handleStitchChartText(text);
  else handlePatternCsvText(text);
}

// Desktop convenience: drop a file anywhere on the picker screen.
function onPickerDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => handlePatternFileText(String(reader.result));
  reader.onerror = () => importResultSheet('Import failed', 'Could not read that file.');
  reader.readAsText(file);
}

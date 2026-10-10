// ─────────────────────────────────────────────
// STEP SCREEN MARKUP — playlist, player, repeat, chart window, full chart.
//
// Pure builders: they read the view state and progress that player.js owns (spViewedRow,
// spPlayerOpen, spNotesOpen, stepCursor …) and return HTML strings. Generic pieces come
// from ui.js; styles are in css/step.css and use tokens only. Handlers are inline-onclick
// globals defined in player.js and take row numbers, never ids. Pattern text is raw HTML
// by convention; anything else is escaped.
// ─────────────────────────────────────────────

const STEP_VIEWS = true;

// "2 / 12 rows · 17%" — the one progress figure for the section.
function spProgressText(cursor, total) {
  return cursor + ' / ' + total + ' rows · ' + (total ? Math.round(cursor / total * 100) : 0) + '%';
}

// gap: the designs show one notes card; the spec wants section notes
// collapsible. Collapsed by default so a long materials list doesn't push the
// rows off the screen.
function spNotesHtml(p) {
  const notes = p.notes || [];
  if (!notes.length) return '';
  return `<div class="sp-notes">
    <button class="sp-notes-head" onclick="spToggleNotes()" aria-expanded="${spNotesOpen}">
      <span>Section notes</span><span class="sp-notes-hint">${spNotesOpen ? 'hide' : 'view'}</span></button>
    ${spNotesOpen ? '<div class="sp-notes-body">' + notes.map(n => '<p>' + n + '</p>').join('') + '</div>' : ''}
  </div>`;
}

function spSetupPill(text) {
  return `<div class="sp-pill"><span class="sp-dot"></span><span class="sp-pill-k">Setup:</span><span class="sp-pill-t">${text}</span></div>`;
}

// The `after` checkpoint — labelled like the Setup line rather than marked with
// an icon, so it reads as the same kind of thing: a note about this row.
function spCheckChip(text) {
  return `<div class="sp-pill"><span class="sp-dot"></span><span class="sp-pill-k">Check:</span><span class="sp-pill-t">${text}</span></div>`;
}

// gap: the designs have no browse indicator; this is the spec's chip, styled
// like the setup pill.
function spBrowseChip(cursor, total) {
  const where = cursor >= total ? 'section complete' : 'on row ' + (cursor + 1);
  return `<div class="sp-browse">Viewing row ${spViewedRow} · ${where}
    <button onclick="spBackToCurrent()">Back to current</button></div>`;
}

function spPassNote(row) {
  return row.passes > 1 ? `<span class="sp-pass">Pass ${row.pass} of ${row.passes} · row ${row.rowInPass} of ${row.R}</span>` : '';
}

// A three-row slice of the chart (the row above, the row, the row below) inside
// the selected card, so the playlist shows the stitches without opening the
// player. Tapping it opens the player.
function spMiniChartHtml(p, row) {
  const chart = spChartFor(p, row);
  if (!chart) return '';
  return `<div class="sp-mc-wrap" onclick="spOpenPlayer(${row.n})">${spChartWindowHtml(row.def.chartRow, [], 1, chart)}</div>`;
}

// Same aim as the player's chart window: a wide chart opens at the end the row
// starts from.
function spAimMini() {
  const el = document.querySelector('.sp-mini .sp-cw-scroll');
  if (!el || el.scrollWidth <= el.clientWidth) return;
  const sel = document.querySelector('.sp-row.selected');
  const row = sel && spRowsFor(PHASES[cur])[(+sel.dataset.row) - 1];
  el.scrollLeft = row && row.step.kind === 'row' && row.def.chartRow && !isRSRow(row.def.chartRow) ? 0 : el.scrollWidth;
}

// The selected row — the current one by default, or whichever has been tapped / stepped to —
// is the white card: label, instruction, a three-row chart preview, and the count and Check at
// the foot. Every other row is a plain line. Marking is the dock's job, not the card's.
function spRowHtml(row, cursor, total) {
  const done = row.n <= cursor, current = row.n === cursor + 1;
  const selected = (spViewedRow !== null ? spViewedRow : cursor + 1) === row.n;
  const text = spText(row), co = spCallouts(row);
  const rep = row.step.kind === 'repeat';
  const cnt = spCount(row);
  if (selected) {
    const cr = row.def.chartRow;
    const rs = !rep && cr && spHasChart(PHASES[cur], row) ? (isRSRow(cr) ? 'RS' : 'WS') : '';
    const setup = co.before.length
      ? uiToggleSection({ label: 'SETUP', open: spSetupOpen, onclick: 'spToggleSetup()', html: co.before.map(t => `<p>${t}</p>`).join('') }) : '';
    return `<article class="ui-card sp-row selected" data-row="${row.n}" onclick="spCardTap(event, ${row.n})">
      <div class="sp-card-top">${uiCapsLabel('ROW ' + row.n + (current ? ' · CURRENT' : done ? ' · DONE' : ''))}${rs ? `<span class="sp-read">${rs}</span>` : ''}${rep ? '' : spPassNote(row)}</div>
      ${setup}
      <p class="sp-ins">${text}</p>
      ${spMiniChartHtml(PHASES[cur], row)}
      ${uiFacts({ count: cnt, check: co.after.join(' · ') || null })}
      <button class="sp-open-btn" onclick="spOpenPlayer(${row.n})">Open row ›</button>
    </article>`;
  }
  return `<article class="sp-row ${done ? 'done' : 'upcoming'}${current ? ' current' : ''}" data-row="${row.n}" onclick="spSelectRow(${row.n})">
    <span class="sp-row-n">${spLabel(row)}${done ? ' ✓' : ''}</span>
    <span class="sp-row-t">${text}${current ? '<span class="sp-row-tag">CURRENT ROW</span>' : ''}</span>
    ${cnt === null ? '' : `<span class="sp-row-c">${cnt}</span>`}
  </article>`;
}

function spTasksHtml(p) {
  const tasks = sectionSteps(p, activeDoc).filter(s => s.kind === 'task');
  return `<section class="sp-list"><div class="sp-list-head"><span>Checklist</span></div>` +
    tasks.map((t, i) => `<label class="sp-task${taskDone(t) ? ' done' : ''}" onclick="spToggleTask(${i}); return false;">
      <span class="sp-check">${taskDone(t) ? '✓' : ''}</span><span>${t.text || ''}</span></label>`).join('') + '</section>';
}

// The browse chip sits in the dock, directly above the buttons it relates to.
function spDockChip() {
  if (spViewedRow === null) return '';
  const p = PHASES[cur], total = stepsRowCount(p, activeDoc), c = stepCursor(p);
  return spBrowsing(c, total) ? spBrowseChip(c, total) : '';
}

function spDockHtml(label, doneCall, variant) {
  return uiDock({ label, onclick: doneCall, variant, chip: spDockChip() });
}

function spPdfButton() {
  return typeof PDF_SVG === 'undefined' ? '' :
    uiIconButton({ icon: PDF_SVG, label: 'Original pattern PDF', onclick: 'openPatternPdf()', dot: typeof pdfWaiting === 'function' && pdfWaiting() });
}

// The bar every step screen shares. In the playlist it carries the project's name alone (tap to
// rename) — the section is named, and switched, at the head of the list. In the player (opts.player)
// the project's name sits small over the section's name, which is just a label there: no switching.
// opts.onBack: where the chevron goes (the library by default).
function spTopBarHtml(p, cursor, total, opts) {
  const o = opts || {};
  const proj = typeof activeProject === 'function' ? activeProject() : null;
  const name = proj ? proj.name : '';
  const rename = proj ? `renameProject('${proj.id}')` : null;
  const common = {
    tally: total ? cursor + ' / ' + total + ' rows' : '',
    onBack: o.onBack || 'goHome()',
    actions: spPdfButton() + '<button class="ui-icon-btn ui-icon-btn--bare" onclick="showResetMenu(event)" aria-label="Options">⋮</button>',
  };
  return o.player
    ? uiTopBar(Object.assign({ project: name, onProject: rename, title: p.name }, common))
    : uiTopBar(Object.assign({ title: name, onTitle: rename, titleLabel: 'Rename project', strong: true }, common));
}

// Rows in order. A repeat block is drawn as one unit: while it is the one being
// worked (or looked at) it shows a pass stepper and just that pass's rows;
// otherwise it is a single quiet line.
function spListHtml(rows, cursor, total) {
  const sel = spViewedRow !== null ? spViewedRow : cursor + 1;
  let html = '';
  for (let i = 0; i < rows.length; ) {
    const r = rows[i];
    if (r.step.kind !== 'repeat') { html += spRowHtml(r, cursor, total); i++; continue; }
    let j = i;
    while (j < rows.length && rows[j].step === r.step) j++;
    html += spRepeatHtml(rows.slice(i, j), cursor, total, sel);
    i = j;
  }
  return html;
}

function spRepeatHtml(block, cursor, total, sel) {
  const first = block[0].n, last = block[block.length - 1].n, step = block[0].step;
  const R = step.rows.length, T = step.times | 0;
  const selIn = sel >= first && sel <= last;                 // like any row: open only when selected (the current row by default)
  if (!selIn) {
    const done = last <= cursor, curIn = cursor + 1 >= first && cursor + 1 <= last;
    const pass = curIn ? block[cursor + 1 - first].pass : 0;
    return `<article class="sp-row ${done ? 'done' : 'upcoming'}${curIn ? ' current' : ''}" onclick="spSelectRow(${curIn ? cursor + 1 : first})">
      <span class="sp-row-n">R${first}–${last}${done ? ' ✓' : ''}</span>
      <span class="sp-row-t">Repeat · ${R} rows × ${T}${curIn ? `<span class="sp-row-tag">CURRENT ROW · PASS ${pass} OF ${T}</span>` : ''}<span class="sp-row-sub">${block.slice(0, R).map(spText).join(' · ')}</span></span></article>`;
  }
  const row = block[sel - first];
  return spRepeatCardHtml(block, row, row.n, false, true);
}

function spPlaylistHtml(p, cursor, total, rows) {
  return spTopBarHtml(p, cursor, total) + '<div class="sp-scroll">' + spListHeadHtml(p) + spNotesHtml(p) +
    `<section class="sp-list">` + spListHtml(rows, cursor, total) + '</section></div>';
}

// The head of the list: the section's name with its switcher, then its description. The progress
// lives in the top bar's tally, so it is not repeated here.
function spListHeadHtml(p) {
  return `<div class="sp-lh"><button class="sp-sec-btn" onclick="spOpenSectionSheet()" aria-label="Switch section">${escapeHtml(p.name)} ${UI_CHEV_DOWN}</button>` +
    (p.desc ? `<p class="sp-lh-desc">${p.desc}</p>` : '') + '</div>';
}

// gap: the playlist dock's centre button is labelled "Next row" in the design;
// it records the current row, the same as Mark done. ‹ › browse. Once the
// section is done it becomes the way on to the next one — the old Back / Next
// pair at the foot of the list is gone, section switching being the design's
// "Current section" menu.
function spNextSectionButton() {
  return cur < PHASES.length - 1
    ? { label: 'Next section', call: `go(${cur + 1})` }
    : { label: 'Finished!', call: 'showFinishedScreen()' };
}

function spPlaylistDock(cursor, total) {
  if (cursor < total) return spDockHtml(`Mark row ${cursor + 1} done`, `spDone(${cursor + 1})`);
  const n = spNextSectionButton();
  return spDockHtml(n.label, n.call);
}

// gap: no rows, so no row browsing — ‹ goes to the previous section instead.
function spRowlessDock() {
  const n = spNextSectionButton();
  return `<footer class="ui-dock"><div class="ui-dock-in">
    ${cur > 0 ? `<button class="ui-dock-nav" onclick="go(${cur - 1})" aria-label="Previous section">${SP_CHEV_L}</button>` : ''}
    <button class="ui-dock-main" onclick="${n.call}">${n.label}</button>
  </div></footer>`;
}

const SP_STITCH_NAMES = { K: 'Knit', P: 'Purl', YO: 'YO', K2: 'k2tog', SK: 'SKPO', M1: 'M1', M1L: 'M1L', M1R: 'M1R',
  K2A: 'k2tog', SKA: 'ssk', SSP: 'ssp', P2TOG: 'p2tog', KTBL: 'ktbl', PTBL: 'ptbl', TK2TOG: 'tk2tog', TSSK: 'tssk',
  PU: 'pull up', GP: 'ghost purl', BRK: 'brk', BRP: 'brp', SL: 'sl1' };

// Every stitch type a chart uses, as {type: true} (the legend's input).
function spChartTypes(chart) {
  const types = {};
  chart.forEach(r => r.forEach(t => { types[parseColorCell(t).t] = true; }));
  return types;
}

// One line, never wrapping: Knit, the first three other stitches used, "+N" for the
// rest, and the glossary button at the right.
function spLegendLine(types) {
  const keys = Object.keys(types).filter(t => t !== 'E' && t !== 'K');
  const shown = keys.slice(0, 3), more = keys.length - shown.length;
  const item = t => `<span class="sp-leg"><span class="sp-leg-cc">${SYMS[t] || ''}</span>${SP_STITCH_NAMES[t] || t.toLowerCase()}</span>`;
  return `<div class="sp-legend">${item('K')}${shown.map(item).join('')}${more > 0 ? `<span class="sp-leg-more">+${more}</span>` : ''}` +
    uiIconButton({ icon: typeof GLOSSARY_SVG === 'undefined' ? '?' : GLOSSARY_SVG, label: 'Glossary', onclick: 'openStitchSheet()' }) + '</div>';
}

// ── Stitches on a row ──
// The glossary entry's chart symbol, where the chart draws one (keys of SYMS).
const SP_GLOSSARY_SYM = { p: 'P', yo: 'YO', k2tog: 'K2', skpo: 'SK', ssk: 'SKA', m1: 'M1', m1l: 'M1L', m1r: 'M1R', ssp: 'SSP',
  p2tog: 'P2TOG', ktbl: 'KTBL', ptbl: 'PTBL', tk2tog: 'TK2TOG', tssk: 'TSSK', brk: 'BRK', brp: 'BRP' };

function spSymFor(entry) {
  const key = entry && entry.abbr ? SP_GLOSSARY_SYM[entry.abbr.split('/')[0].trim().toLowerCase()] : null;
  return key && typeof SYMS !== 'undefined' ? SYMS[key] || '' : '';
}

// The stitches a row's text names, in order of appearance, each once: the pattern's own terms
// (with the pattern's definition) first-class, then the craft's glossary. Only abbreviations and
// one-word terms are matched, so ordinary words are left alone; a trailing count ('k13') is ignored.
function spStitchesInText(text, craft, notes) {
  const plain = String(text || '').replace(/<[^>]*>/g, ' ');
  const own = {};
  (notes || []).forEach(n => { if (n && n.term) own[String(n.term).toLowerCase()] = n; });
  const seen = {}, out = [];
  (plain.match(/[A-Za-z][A-Za-z0-9&]*/g) || []).forEach(tok => {
    const t = tok.toLowerCase(), letters = t.replace(/\d+$/, '');
    const note = own[t] || own[letters];
    let item = null;
    if (note) {
      const gl = note.def ? null : (typeof glossaryEntry === 'function' ? glossaryEntry(note.term) : null);
      item = { term: note.term, def: note.def || (gl && gl.def) || '', sym: note.sym && typeof SYMS !== 'undefined' ? SYMS[note.sym] || '' : (note.symbol || '') };
    } else {
      const e = glossaryEntryIn(craft, t) || glossaryEntryIn(craft, letters);
      if (e) item = { term: e.term, def: e.def, sym: spSymFor(e) };
    }
    if (item && !seen[item.term]) { seen[item.term] = true; out.push(item); }
  });
  return out;
}

// What the stitch sheet and the strip list for a row: the chart row's own stitches on a chart
// row, otherwise the stitches its text names.
function spRowStitches(p, row) {
  const pat = typeof activePattern === 'function' ? activePattern() : null;
  const notes = (pat && pat.notes) || [];
  const craft = /tatting/i.test(((pat && pat.badge) || '') + ' ' + ((pat && pat.desc) || '')) ? 'Tatting' : 'Knitting';
  const chart = spChartFor(p, row), cr = row && row.def && row.def.chartRow;
  if (chart && cr && chart[cr - 1]) {
    const types = {};
    chart[cr - 1].forEach(t => { types[parseColorCell(t).t] = true; });
    return Object.keys(types).filter(t => t !== 'E').map(t => {
      const e = glossaryEntry(SP_STITCH_NAMES[t] || t);
      return { term: e ? e.term : (SP_STITCH_NAMES[t] || t), def: e ? e.def : '', sym: SYMS[t] || '' };
    });
  }
  return spStitchesInText(spText(row), craft, notes);
}

// The strip under a row with no chart: the same bar as under a chart, listing the stitches the
// row names (the first three, then "+N"), and the button that opens the stitch sheet.
function spGlossaryBar(items) {
  const shown = (items || []).slice(0, 3), more = (items || []).length - shown.length;
  const one = i => `<span class="sp-leg"><span class="sp-leg-cc">${i.sym || ''}</span>${escapeHtml(i.term)}</span>`;
  return `<div class="sp-legend sp-legend--bare">${shown.length ? shown.map(one).join('') + (more > 0 ? `<span class="sp-leg-more">+${more}</span>` : '') : '<span class="sp-leg-more">Stitch glossary</span>'}` +
    uiIconButton({ icon: typeof GLOSSARY_SVG === 'undefined' ? '?' : GLOSSARY_SVG, label: 'Glossary', onclick: 'openStitchSheet()' }) + '</div>';
}

// The bottom sheet behind the glossary button: this row's stitches, the pattern's own notes,
// and a way on to the whole glossary.
function spStitchSheetHtml(items, notes) {
  const row = (term, def, sym) => `<div class="note-row"><span class="note-term">${sym ? `<span class="note-sym">${sym}</span>` : ''}${escapeHtml(term)}</span><span class="note-def">${escapeHtml(def || '')}</span></div>`;
  const shown = {};
  (items || []).forEach(i => { shown[i.term] = true; });
  const own = (notes || []).filter(n => n && n.term && !shown[n.term]).map(n => {
    const gl = n.def ? null : (typeof glossaryEntry === 'function' ? glossaryEntry(n.term) : null);
    return row(n.term, n.def || (gl && gl.def) || '', n.sym && typeof SYMS !== 'undefined' ? SYMS[n.sym] || '' : (n.symbol || ''));
  });
  return (items && items.length ? `<h4 class="sp-sh-h">ON THIS ROW</h4>${items.map(i => row(i.term, i.def, i.sym)).join('')}` : '') +
    (own.length ? `<h4 class="sp-sh-h">IN THIS PATTERN</h4>${own.join('')}` : '') +
    '<button class="sheet-btn sp-sh-full" onclick="closeSheet(); openGlossary()">Full glossary ›</button>';
}

// The stitch count after this row, from the row's optional `sts`: a number, or an array
// indexed by pass for a repeat. Null when absent or not a finite number; everything that
// shows a count hides it when this is null. (Patterns are given counts separately.)
function spCount(row) {
  const s = row && row.def ? row.def.sts : undefined;
  const n = Array.isArray(s) ? s[row.pass - 1] : s;
  return typeof n === 'number' && isFinite(n) ? n : null;
}

// The count at the end of a pass: the last row of that pass, null when it has none.
function spPassEndCount(block, pass) {
  const rows = block.filter(b => b.pass === pass);
  return rows.length ? spCount(rows[rows.length - 1]) : null;
}

function spCellsHtml(r, active, types, mark, chart) {
  chart = chart || CHART_B;
  const colors = chart === CHART_B ? chartColorRow(r) : null;
  return chart[r - 1].map((t, i) => {
    const tt = parseColorCell(t).t;
    types[tt] = true;
    let c = stitchCell(t, false, colors ? colors[i] : null, active);
    if (mark === i) c = c.replace('class="cc', 'class="sp-cw-mark cc');
    return c;
  }).join('');
}

// The ring + dot on the cell just past the mid-row marker, only once the
// knitter has set one for this chart.
function spMarkCol(N) {
  const b = midRowPos && PHASES[cur] ? midRowPos[PHASES[cur].id] : undefined;
  return Number.isInteger(b) && b >= 0 ? Math.min(N - 1, b) : -1;
}

// How many rows fit in a chart area of this height, never fewer than seven. `pitch` is one row
// (a square cell plus its gaps) and `chrome` the stitch numbers and padding; the defaults are the
// designed values and the player passes what it measured.
function spChartRowsFor(heightPx, pitch, chrome) {
  return Math.max(7, Math.floor((heightPx - (chrome || 44)) / (pitch || 26)));
}

// Which row-number column stays in view while the chart scrolls sideways: the nearer end.
function spChartSideFor(scrollLeft, scrollWidth, clientWidth) {
  const max = scrollWidth - clientWidth;
  return max > 0 && scrollLeft > max / 2 ? 'right' : 'left';
}

// `span` is how many rows to show either side of the current one: 3 in the
// player, 1 for the preview inside the playlist's selected row.
function spChartWindowHtml(chartRow, after, span, chart) {
  // span: rows either side of the current one (a number), or {rows: K} for exactly K rows;
  // 'all' is the whole chart (for the full-chart view, later).
  const all = span === 'all';
  const rowsN = span && typeof span === 'object' ? span.rows : 2 * (span || 3) + 1;
  chart = chart || CHART_B;
  const n = chart.length, N = chart[0].length;
  const first = all ? 1 : Math.max(1, Math.min(chartRow - Math.floor((rowsN - 1) / 2), n - rowsN + 1)), last = all ? n : Math.min(n, first + rowsN - 1);
  const mini = span === 1;
  // Cells are fixed squares (never stretched or squeezed to fit): a chart wider than the screen scrolls sideways.
  const cell = mini ? 'var(--h-cell-mini)' : 'var(--h-cell)', num = mini ? 'var(--h-cell-mini)' : 'var(--h-cell)';
  const cols = `grid-template-columns:${num} repeat(${N}, ${cell}) ${num}`;
  const head = Array.from({ length: N }, (_, i) => `<span>${N - i}</span>`).join('');
  const types = {};
  let rowsHtml = '';
  for (let r = last; r >= first; r--) {
    const active = r === chartRow, d = Math.min(3, Math.abs(r - chartRow));
    rowsHtml += `<div class="sp-cw-row${active ? ' active' : ' d' + d}" style="${cols}">
      <span class="sp-cw-n">${r}</span>${spCellsHtml(r, active, types, active && chart === CHART_B ? spMarkCol(N) : -1, chart)}<span class="sp-cw-n">${r}</span></div>`;
  }
  return `<section class="sp-cw-wrap${mini ? ' sp-mini' : ''}">
    <div class="sp-cw-scroll"${mini ? '' : ' id="sp-cw-scroll" onscroll="spChartSide()"'}><div class="sp-cw">
      <div class="sp-cw-head" style="${cols}"><span></span>${head}<span></span></div>${rowsHtml}</div></div>
  </section>`;
}

function spFullChartHtml(p, cursor, total, rows) {
  const n = CHART_B.length, N = CHART_B[0].length;
  const curRow = rows[cursor] && rows[cursor].def.chartRow;
  const viewRow = spViewedRow !== null && rows[spViewedRow - 1] ? rows[spViewedRow - 1].def.chartRow : null;
  const types = {};
  let body = '';
  for (let r = n; r >= 1; r--) {
    const active = r === curRow;
    body += `<div class="sp-fc-row${active ? ' active' : ''}${r === viewRow ? ' viewing' : ''}" data-r="${r}" onclick="spFcTap(${r})">
      <span class="sp-fc-n l">${r}</span><div class="sp-fc-cells">${spCellsHtml(r, active, types, -1)}</div><span class="sp-fc-n">${r}</span></div>`;
  }
  const v = Math.min(total, spViewedRow !== null ? spViewedRow : cursor + 1);
  const pal = p.colorPalette && typeof openColorSheet === 'function';
  return spTopBarHtml(p, cursor, total, { onBack: 'spCloseChart()' }) +
    (typeof yarnChipsHtml === 'function' && p.colorPalette ? yarnChipsHtml(p) : '') +
    `<div class="sp-fc-tools">
      <button onclick="spZoom(-2)" aria-label="Zoom out">A−</button><button onclick="spZoom(2)" aria-label="Zoom in">A+</button>
      <button onclick="spFcRecenter()" aria-label="Centre on the current row">Current row</button>
      ${pal ? '<button onclick="openColorSheet()" aria-label="Edit yarn colours">Colours</button>' : ''}</div>
    <div class="sp-fc-scroll"><div class="sp-fc" id="sp-fc" style="--cell-sz:${cellSz}px">${body}</div></div>
    ${spLegendLine(types)}` +
    `<footer class="ui-dock"><div class="ui-dock-in"><button class="ui-dock-main" id="sp-fc-back" onclick="spCloseChart()">Back to row ${v}</button></div></footer>`;
}

// ── The player screen ──
// "Row 3 of 12" with the side and reading direction: a heading above the card, quieter than
// the instruction. A repeat row's heading is the repeat itself (its pass line is in the card).
function spPlayerHeadHtml(row, v, total) {
  if (row.step.kind === 'repeat') return `<div class="sp-head"><h2 class="sp-head-t">Repeat · ${row.R} rows × ${row.passes}</h2></div>`;
  const cr = row.def.chartRow;
  const rs = cr ? isRSRow(cr) : null;   // RS/WS belongs to the section's chart, not a motif
  const dir = rs === null ? '' : `<span class="sp-read">${rs ? 'RS · read right → left' : 'WS · read left → right'}</span>`;
  return `<div class="sp-head"><h2 class="sp-head-t">Row ${v} of ${total}</h2>${dir}${spPassNote(row)}</div>`;
}

// The card under it: the row's Setup (collapsed until asked for), the instruction, and the
// count and Check pinned to the foot.
function spPlayerCardHtml(p, row, v, total, hasChart) {
  const co = spCallouts(row);
  const setup = co.before.length
    ? uiToggleSection({ label: 'SETUP', open: spSetupOpen, onclick: 'spToggleSetup()', html: co.before.map(t => `<p>${t}</p>`).join('') }) : '';
  return `<article class="ui-card sp-card${hasChart ? '' : ' sp-card--nochart'}">
    ${setup}
    <p class="sp-ins">${spText(row)}</p>
    ${uiFacts({ count: spCount(row), check: co.after.join(' · ') || null })}
  </article>`;
}

// The player's card for a repeat row: the pass line (− / + are progress actions), every row
// of the viewed pass as a tappable look, Setup, and the count at the end of the pass.
function spRepeatCardHtml(block, row, v, hasChart, inList) {
  const T = row.passes, pass = row.pass, co = spCallouts(row);
  const rows = block.filter(b => b.pass === pass);
  const items = rows.map(b => {
    const n = spCount(b);
    return `<li class="sp-rrow${b.n === v ? ' sel' : ''}${b.n <= stepCursor(PHASES[cur]) ? ' done' : ''}" data-row="${b.n}" onclick="spSelectRow(${b.n})">
      <span class="sp-rrow-n">R${b.rowInPass}</span><span class="sp-rrow-t">${spText(b)}</span>${n === null ? '' : `<span class="sp-rrow-c">${n}</span>`}</li>`;
  }).join('');
  const setup = co.before.length
    ? uiToggleSection({ label: 'SETUP', open: spSetupOpen, onclick: 'spToggleSetup()', html: co.before.map(t => `<p>${t}</p>`).join('') }) : '';
  return `<article class="ui-card ${inList ? 'sp-row selected' : 'sp-card'} sp-card--repeat${hasChart ? '' : ' sp-card--nochart'}"${inList ? ` data-row="${v}" onclick="spCardTap(event, ${v})"` : ''}>
    ${inList ? `<div class="sp-repeat-label">${uiCapsLabel('REPEAT · ' + row.R + ' ROWS × ' + T)}</div>` : ''}
    <div class="sp-pass-line"><span class="sp-pass-n">Pass ${pass} of ${T}</span>
      ${uiIconButton({ icon: '−', label: 'Previous pass', onclick: 'spPass(-1)' })}${uiIconButton({ icon: '+', label: 'Finish this pass', onclick: 'spPass(1)' })}</div>
    ${setup}
    <ul class="sp-rlist">${items}</ul>
    ${uiFacts({ count: spPassEndCount(block, pass), countLabel: 'sts at end of pass ' + pass, check: co.after.join(' · ') || null })}
    ${inList ? `<button class="sp-open-btn" onclick="spOpenPlayer(${v})">Open row ›</button>` : ''}
  </article>`;
}

// The chart fills the rest of the screen, edge to edge; the legend sits beneath it.
function spChartRegionHtml(p, row, chart) {
  return `<section class="sp-chart-region">${spChartWindowHtml(row.def.chartRow, [], { rows: spChartRows }, chart)}${spLegendLine(spChartTypes(chart))}</section>`;
}

function spPlayerHtml(p, cursor, total, rows) {
  const v = Math.min(total, spViewedRow !== null ? spViewedRow : cursor + 1);
  const row = rows[v - 1];
  const done = v <= cursor;
  const rl = row.step.kind === 'repeat' ? `R${row.rowInPass} of pass ${row.pass}` : `row ${v}`;
  const label = done ? `Mark ${rl} not done` : `Mark ${rl} done`;
  const call = done ? `spMarkIncomplete(${v})` : `spDone(${v})`;
  const chart = spChartFor(p, row);
  return spTopBarHtml(p, cursor, total, { player: true, onBack: 'spClosePlayer()' }) +
    `<div class="sp-player">${spPlayerHeadHtml(row, v, total)}${row.step.kind === 'repeat' ? spRepeatCardHtml(rows.filter(r => r.step === row.step), row, v, !!chart) : spPlayerCardHtml(p, row, v, total, !!chart)}${chart ? spChartRegionHtml(p, row, chart) : spGlossaryBar(spRowStitches(p, row))}</div>` +
    spDockHtml(label, call, done ? 'outline' : undefined);
}

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

// The white card is the SELECTED row — the current one by default, or whichever
// row has been tapped / stepped to. The current row, when not selected, is an
// ordinary row marked "Current row".
function spRowHtml(row, cursor, total) {
  const done = row.n <= cursor, current = row.n === cursor + 1;
  const selected = (spViewedRow !== null ? spViewedRow : cursor + 1) === row.n;
  const text = spText(row), co = spCallouts(row);
  const status = current ? '<span class="sp-badge dark">Current row</span>' : done ? '<span class="sp-badge">Completed</span>' : '';
  if (selected) {
    const open = row.step.kind === 'repeat' ? '' : ` onclick="spOpenPlayer(${row.n})"`;
    return `<article class="sp-row selected" data-row="${row.n}">
      <div class="sp-row-top"><div class="sp-row-lbl"><b>${spLabel(row)}</b>${row.step.kind === 'repeat' ? '' : spPassNote(row)}</div>${status}</div>
      ${co.before.map(spSetupPill).join('')}
      <p class="sp-row-text big"${open}>${text}</p>
      ${spMiniChartHtml(PHASES[cur], row)}
      ${co.after.map(spCheckChip).join('')}
      <div class="sp-row-actions">
        ${(PHASES[cur].notes || []).length ? '<button class="sp-note-btn" onclick="spToggleNotes()">Note</button>' : '<span></span>'}
        ${done ? `<button class="sp-done-btn" onclick="spMarkIncomplete(${row.n})">Mark incomplete</button>`
               : `<button class="sp-done-btn" onclick="spDone(${row.n})">Mark done</button>`}
      </div></article>`;
  }
  return `<article class="sp-row ${done ? 'done' : 'upcoming'}${current ? ' current' : ''}" data-row="${row.n}" onclick="spSelectRow(${row.n})">
    <div class="sp-row-top"><div class="sp-row-lbl"><span>${spLabel(row)}</span>${row.step.kind === 'repeat' ? '' : spPassNote(row)}</div>${status}</div>
    <p class="sp-row-text">${text}</p>
    ${co.before.map(t => '<p class="sp-row-aside"><b>Setup:</b> ' + t + '</p>').join('')}
    ${co.after.map(t => '<p class="sp-row-aside"><b>Check:</b> ' + t + '</p>').join('')}
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

// The one bar every step screen shares: back, project over section name (taps open the
// section menu), the section's rows tally, the PDF, and the options menu.
// opts.onBack: where the chevron goes (the library by default).
function spTopBarHtml(p, cursor, total, opts) {
  const o = opts || {};
  const proj = typeof activeProject === 'function' ? activeProject() : null;
  return uiTopBar({
    project: proj ? proj.name : '', title: p.name,
    tally: total ? cursor + ' / ' + total + ' rows' : '',
    onBack: o.onBack || 'goHome()', onTitle: 'spOpenSectionSheet()',
    actions: spPdfButton() + '<button class="ui-icon-btn ui-icon-btn--bare" onclick="showResetMenu(event)" aria-label="Options">⋮</button>',
  });
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
  const selIn = sel >= first && sel <= last, curIn = cursor + 1 >= first && cursor + 1 <= last;
  if (!selIn && !curIn) {
    const done = last <= cursor;
    return `<article class="sp-row ${done ? 'done' : 'upcoming'}" onclick="spSelectRow(${first})">
      <div class="sp-row-top"><div class="sp-row-lbl"><span>Repeat · ${R} rows × ${T}</span></div>${done ? '<span class="sp-badge">Completed</span>' : ''}</div>
      <p class="sp-row-text">${block.slice(0, R).map(spText).join(' · ')}</p></article>`;
  }
  const pass = block[(selIn ? sel : cursor + 1) - first].pass;
  return `<section class="sp-repeat">
    <div class="sp-stepper">
      <button class="sp-step-btn" onclick="spPass(-1)" aria-label="Previous pass">−</button>
      <div class="sp-step-mid"><span class="sp-step-k">Repeat sequence</span><span class="sp-step-v">Pass <b>${pass}</b> of ${T}</span></div>
      <button class="sp-step-btn" onclick="spPass(1)" aria-label="Finish this pass">+</button>
    </div>${block.filter(b => b.pass === pass).map(b => spRowHtml(b, cursor, total)).join('')}</section>`;
}

function spPlaylistHtml(p, cursor, total, rows) {
  return spTopBarHtml(p, cursor, total) + spNotesHtml(p) +
    `<section class="sp-list"><div class="sp-list-head"><span>Instructions</span><span>${p.hasChart ? 'RS / WS playlist' : ''}</span></div>` +
    spListHtml(rows, cursor, total) + '</section>';
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

function spLegendHtml(types) {
  return Object.keys(types).filter(t => t !== 'E').map(t => {
    const sym = SYMS[t];
    return `<span class="sp-leg"><span class="sp-leg-cc">${sym || ''}</span>${SP_STITCH_NAMES[t] || t.toLowerCase()}</span>`;
  }).join('');
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

// `span` is how many rows to show either side of the current one: 3 in the
// player, 1 for the preview inside the playlist's selected row.
function spChartWindowHtml(chartRow, after, span, chart) {
  span = span || 3;
  chart = chart || CHART_B;
  const n = chart.length, N = chart[0].length;
  const first = Math.max(1, Math.min(chartRow - span, n - 2 * span)), last = Math.min(n, first + 2 * span);
  const minCell = span === 1 ? 15 : 20;                       // the preview sits inside a card, so its cells may be narrower
  const cols = `grid-template-columns:${span === 1 ? 18 : 24}px repeat(${N},minmax(${minCell}px,1fr)) ${span === 1 ? 18 : 24}px`;
  const head = Array.from({ length: N }, (_, i) => `<span>${N - i}</span>`).join('');
  const types = {};
  let rowsHtml = '';
  for (let r = last; r >= first; r--) {
    const active = r === chartRow, d = Math.abs(r - chartRow);
    rowsHtml += `<div class="sp-cw-row${active ? ' active' : ' d' + d}" style="${cols}">
      <span class="sp-cw-n">${r}</span>${spCellsHtml(r, active, types, active && chart === CHART_B ? spMarkCol(N) : -1, chart)}<span class="sp-cw-n">${r}</span></div>`;
  }
  return `<section class="sp-cw-wrap${span === 1 ? ' sp-mini' : ''}">
    ${span === 1 ? '' : `<div class="sp-cw-bar"><span>Viewing rows ${first}–${last}</span>
      <span class="sp-cw-bar-r">${after.map(t => `<span class="sp-cw-chip"><b>Check:</b> ${t}</span>`).join('')}</span></div>`}
    <div class="sp-cw-scroll"${span === 1 ? '' : ' id="sp-cw-scroll"'}><div class="sp-cw" style="min-width:${N * (minCell + 3) + (span === 1 ? 44 : 52)}px">
      <div class="sp-cw-head" style="${cols}"><span></span>${head}<span></span></div>${rowsHtml}</div></div>
    <div class="sp-legend">${spLegendHtml(types)}</div>
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
    <div class="sp-legend">${spLegendHtml(types)}</div>` +
    `<footer class="ui-dock"><div class="ui-dock-in"><button class="ui-dock-main" id="sp-fc-back" onclick="spCloseChart()">Back to row ${v}</button></div></footer>`;
}

// ── The player screen ──
//
// A chart row: a compact written strip (the row's label, the reading direction,
// the Setup line), then the chart window. Any other row: the row as a large
// card, its Check line, and a preview of the next row.
function spPlayerChartHtml(p, row, chart) {
  const co = spCallouts(row);
  const rep = row.step.kind === 'repeat';
  const rs = rep ? null : isRSRow(row.def.chartRow);   // RS/WS belongs to the section's chart, not a motif
  return `<div class="sp-strip">
      <div class="sp-strip-top"><span class="sp-lbl-chip">${spLabel(row)}</span>
        ${rs === null ? '' : `<span class="sp-read">read ${rs ? 'right → left' : 'left → right'}</span>`}
        ${co.before.map(t => `<span class="sp-strip-chip"><span class="sp-dot"></span>${t}</span>`).join('')}</div>
      <p class="sp-strip-text">${spText(row)}</p></div>` +
    spChartWindowHtml(row.def.chartRow, co.after, 3, chart);
}

function spPlayerHtml(p, cursor, total, rows) {
  const v = Math.min(total, spViewedRow !== null ? spViewedRow : cursor + 1);
  const row = rows[v - 1];
  const next = rows[v];
  const co = spCallouts(row);
  const current = v === cursor + 1, done = v <= cursor;
  const rl = row.step.kind === 'repeat' ? `R${row.rowInPass} of pass ${row.pass}` : `row ${v}`;
  const label = done ? `Mark ${rl} not done` : `Mark ${rl} done`;
  const call = done ? `spMarkIncomplete(${v})` : `spDone(${v})`;
  const chart = spChartFor(p, row);
  const badge = current ? '<span class="sp-badge light">Current row</span>' : done ? '<span class="sp-badge">Completed</span>' : '<span class="sp-badge muted">Upcoming</span>';
  const bar = spTopBarHtml(p, cursor, total, { onBack: 'spClosePlayer()' });
  if (chart) return bar + spPlayerChartHtml(p, row, chart) + spDockHtml(label, call);
  const rs = row.def.chartRow && row.step.kind === 'row' ? isRSRow(row.def.chartRow) : null;
  return bar + co.before.map(spSetupPill).join('') +
    `<article class="sp-hero">
      <div class="sp-row-top"><div class="sp-row-lbl"><span class="sp-lbl-chip">${spLabel(row)}</span>
        ${rs === null ? '' : `<span class="sp-read">read ${rs ? 'right → left' : 'left → right'}</span>`}</div>${badge}</div>
      <p class="sp-hero-text">${spText(row)}</p>
      <div class="sp-hero-foot">${spPassNote(row)}${co.after.map(spCheckChip).join('')}</div>
    </article>` +
    (next ? `<article class="sp-next"><div class="sp-row-top"><span>${spLabel(next)}</span><span class="sp-next-k">Next</span></div><p>${spText(next)}</p></article>` : '') +
    spDockHtml(label, call);
}

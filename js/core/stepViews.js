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
    return `<article class="ui-card sp-row selected" data-row="${row.n}">
      <div class="sp-card-top">${uiCapsLabel('ROW ' + row.n + (current ? ' · CURRENT' : done ? ' · DONE' : ''))}${rs ? `<span class="sp-read">${rs}</span>` : ''}${rep ? '' : spPassNote(row)}</div>
      ${setup}
      <p class="sp-ins"${rep ? '' : ` onclick="spOpenPlayer(${row.n})"`}>${text}</p>
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
      <span class="sp-row-n">Repeat${done ? ' ✓' : ''}</span>
      <span class="sp-row-t">Repeat · ${R} rows × ${T}<span class="sp-row-sub">${block.slice(0, R).map(spText).join(' · ')}</span></span></article>`;
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
  return spTopBarHtml(p, cursor, total) + spListHeadHtml(p) + spNotesHtml(p) +
    `<section class="sp-list">` + spListHtml(rows, cursor, total) + '</section>';
}

// The section's description. The progress lives in the top bar's tally, so it is not repeated here.
function spListHeadHtml(p) {
  return p.desc ? `<div class="sp-lh"><p class="sp-lh-desc">${p.desc}</p></div>` : '';
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
    uiIconButton({ icon: typeof GLOSSARY_SVG === 'undefined' ? '?' : GLOSSARY_SVG, label: 'Glossary', onclick: 'openGlossary()' }) + '</div>';
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

// `span` is how many rows to show either side of the current one: 3 in the
// player, 1 for the preview inside the playlist's selected row.
function spChartWindowHtml(chartRow, after, span, chart) {
  const all = span === 'all';
  span = all ? 0 : (span || 3);
  chart = chart || CHART_B;
  const n = chart.length, N = chart[0].length;
  const first = all ? 1 : Math.max(1, Math.min(chartRow - span, n - 2 * span)), last = all ? n : Math.min(n, first + 2 * span);
  const mini = span === 1;
  const minCell = mini ? 15 : 20;                             // the preview sits inside a card, so its cells may be narrower
  const cols = `grid-template-columns:${mini ? 18 : 24}px repeat(${N},minmax(${minCell}px,1fr)) ${mini ? 18 : 24}px`;
  const head = Array.from({ length: N }, (_, i) => `<span>${N - i}</span>`).join('');
  const types = {};
  let rowsHtml = '';
  for (let r = last; r >= first; r--) {
    const active = r === chartRow, d = Math.min(3, Math.abs(r - chartRow));
    rowsHtml += `<div class="sp-cw-row${active ? ' active' : ' d' + d}" style="${cols}">
      <span class="sp-cw-n">${r}</span>${spCellsHtml(r, active, types, active && chart === CHART_B ? spMarkCol(N) : -1, chart)}<span class="sp-cw-n">${r}</span></div>`;
  }
  return `<section class="sp-cw-wrap${mini ? ' sp-mini' : ''}">
    <div class="sp-cw-scroll"${mini ? '' : ' id="sp-cw-scroll"'}><div class="sp-cw" style="min-width:${N * (minCell + 3) + (mini ? 44 : 52)}px">
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
// The card at the top of the player: the row's position (once), its Setup (collapsed until
// asked for), the instruction, and the count and Check pinned to the foot.
function spPlayerCardHtml(p, row, v, total, hasChart) {
  const co = spCallouts(row), rep = row.step.kind === 'repeat';
  const cr = row.def.chartRow;
  const rs = !rep && cr ? isRSRow(cr) : null;   // RS/WS belongs to the section's chart, not a motif
  const where = rep ? `ROW ${row.rowInPass} OF ${row.R}` : `ROW ${v} OF ${total}`;
  const dir = rs === null ? '' : `<span class="sp-read">${rs ? 'RS · read right → left' : 'WS · read left → right'}</span>`;
  const setup = co.before.length
    ? uiToggleSection({ label: 'SETUP', open: spSetupOpen, onclick: 'spToggleSetup()', html: co.before.map(t => `<p>${t}</p>`).join('') }) : '';
  return `<article class="ui-card sp-card${hasChart ? '' : ' sp-card--nochart'}">
    <div class="sp-card-top">${uiCapsLabel(where)}${dir}${spPassNote(row)}</div>
    ${setup}
    <p class="sp-ins">${spText(row)}</p>
    ${uiFacts({ count: spCount(row), check: co.after.join(' · ') || null })}
  </article>`;
}

// The player's card for a repeat row: the pass line (− / + are progress actions), every row
// of the viewed pass as a tappable look, Setup, and the count at the end of the pass.
function spRepeatCardHtml(block, row, v, hasChart) {
  const T = row.passes, pass = row.pass, co = spCallouts(row);
  const rows = block.filter(b => b.pass === pass);
  const items = rows.map(b => {
    const n = spCount(b);
    return `<li class="sp-rrow${b.n === v ? ' sel' : ''}${b.n <= stepCursor(PHASES[cur]) ? ' done' : ''}" data-row="${b.n}" onclick="spSelectRow(${b.n})">
      <span class="sp-rrow-n">R${b.rowInPass}</span><span class="sp-rrow-t">${spText(b)}</span>${n === null ? '' : `<span class="sp-rrow-c">${n}</span>`}</li>`;
  }).join('');
  const setup = co.before.length
    ? uiToggleSection({ label: 'SETUP', open: spSetupOpen, onclick: 'spToggleSetup()', html: co.before.map(t => `<p>${t}</p>`).join('') }) : '';
  return `<article class="ui-card sp-card sp-card--repeat${hasChart ? '' : ' sp-card--nochart'}">
    <div class="sp-pass-line">${uiCapsLabel('REPEAT')}<span class="sp-pass-n">Pass ${pass} of ${T}</span>
      ${uiIconButton({ icon: '−', label: 'Previous pass', onclick: 'spPass(-1)' })}${uiIconButton({ icon: '+', label: 'Finish this pass', onclick: 'spPass(1)' })}</div>
    ${setup}
    <ul class="sp-rlist">${items}</ul>
    ${uiFacts({ count: spPassEndCount(block, pass), countLabel: 'sts at end of pass ' + pass, check: co.after.join(' · ') || null })}
  </article>`;
}

// The chart fills the rest of the screen, edge to edge; the legend sits beneath it.
function spChartRegionHtml(p, row, chart) {
  return `<section class="sp-chart-region">${spChartWindowHtml(row.def.chartRow, [], 'all', chart)}${spLegendLine(spChartTypes(chart))}</section>`;
}

function spPlayerHtml(p, cursor, total, rows) {
  const v = Math.min(total, spViewedRow !== null ? spViewedRow : cursor + 1);
  const row = rows[v - 1];
  const done = v <= cursor;
  const rl = row.step.kind === 'repeat' ? `R${row.rowInPass} of pass ${row.pass}` : `row ${v}`;
  const label = done ? `Mark ${rl} not done` : `Mark ${rl} done`;
  const call = done ? `spMarkIncomplete(${v})` : `spDone(${v})`;
  const chart = spChartFor(p, row);
  return spTopBarHtml(p, cursor, total, { onBack: 'spClosePlayer()' }) +
    `<div class="sp-player">${row.step.kind === 'repeat' ? spRepeatCardHtml(rows.filter(r => r.step === row.step), row, v, !!chart) : spPlayerCardHtml(p, row, v, total, !!chart)}${chart ? spChartRegionHtml(p, row, chart) : ''}</div>` +
    spDockHtml(label, call, done ? 'outline' : undefined);
}

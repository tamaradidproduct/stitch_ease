// ─────────────────────────────────────────────
// CHART RENDERER — SYMS, stitchCell, buildChartTracker
//
// Renders the knitting chart viewport, row tracker, zoom, and legend.
//
// Symbol artwork is the exact vector paths from this app's own Figma
// "Stitches" component set (mSct8t0TpsyYJad4teKfwl, node 1:258), kept in
// their native 24-unit cell box so each glyph's inset (e.g. the triangles
// span 4..20) is the designed padding rather than something re-derived
// here. Every svg is 100%x100% of its container, so one set of paths
// serves the chart (scales with --cell-sz), the legend and the notes
// sheet. `currentColor` replaces the export's hardcoded fill/stroke so
// the active-row color swap (.crow-active .cc-sym) keeps working.
// ─────────────────────────────────────────────
const SYMS = {
  P:   '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><rect x="8" y="8" width="8" height="8" rx="4" fill="currentColor" /></svg>',
  YO:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12.0001 17.7143C15.156 17.7143 17.7143 15.1559 17.7143 12C17.7143 8.84408 15.156 6.28571 12.0001 6.28571C8.84414 6.28571 6.28577 8.84408 6.28577 12C6.28577 15.1559 8.84414 17.7143 12.0001 17.7143Z" fill="currentColor" /></svg>',
  K2:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M20 4V20H4L20 4Z" fill="currentColor" /></svg>',
  SK:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M4 4V20H20L4 4Z" fill="currentColor" /></svg>',
  M1:  '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M7.38477 4.47806V4.47903H7.38672C7.38835 4.47984 7.39133 4.48135 7.39453 4.48294C7.40094 4.48612 7.41056 4.49148 7.42285 4.49759C7.44775 4.50997 7.4844 4.5279 7.53125 4.5513C7.6256 4.59843 7.76217 4.66687 7.92969 4.7515C8.26463 4.9207 8.72451 5.15583 9.22559 5.41751C10.1988 5.92575 11.3316 6.53872 11.999 6.97318C12.7329 6.49387 13.8686 5.87939 14.8271 5.38138C15.3191 5.12575 15.7663 4.9004 16.0898 4.7388C16.2514 4.65811 16.3821 4.59298 16.4727 4.54837C16.5179 4.52609 16.5533 4.50929 16.5771 4.49759C16.5891 4.49174 16.5984 4.48692 16.6045 4.48392C16.6074 4.48249 16.6098 4.48173 16.6113 4.48099L16.6133 4.48001L16.709 4.43314L16.75 4.53079L17.2227 5.65677L17.2588 5.74368L17.1738 5.78568H17.1729L17.1719 5.78665C17.1706 5.78728 17.1686 5.78834 17.166 5.78958C17.1608 5.7921 17.1527 5.7954 17.1426 5.80032C17.1221 5.81024 17.0916 5.8253 17.0527 5.84427C16.975 5.88217 16.8625 5.93682 16.7236 6.0054C16.4454 6.14285 16.0606 6.33479 15.6357 6.55228C14.8368 6.96131 13.899 7.46106 13.2549 7.85892C14.279 8.63071 15.3451 9.56084 16.165 10.6411C17.0167 11.7633 17.6074 13.0524 17.6074 14.4947C17.6072 17.585 15.0967 20.0894 12 20.0894C8.90325 20.0894 6.3928 17.585 6.39258 14.4947C6.39258 13.0526 6.98335 11.7634 7.83496 10.6411C8.6543 9.56139 9.71884 8.63136 10.7422 7.85989C10.2488 7.56159 9.33357 7.07321 8.50781 6.64505C8.05834 6.412 7.63692 6.19637 7.32812 6.03958C7.17393 5.96129 7.04756 5.89723 6.95996 5.85306C6.91646 5.83112 6.88253 5.81392 6.85938 5.80228C6.84776 5.79644 6.83799 5.79258 6.83203 5.78958C6.82934 5.78823 6.82764 5.78641 6.82617 5.78568L6.82422 5.7847H6.82324L6.74023 5.74271L6.77637 5.65677L7.24805 4.52884L7.28906 4.43118L7.38477 4.47806ZM11.999 8.69876C11.0694 9.36548 10.0335 10.1885 9.22461 11.1509C8.39846 12.134 7.81641 13.2546 7.81641 14.4947C7.81663 16.7996 9.68926 18.6685 12 18.6685C14.3107 18.6685 16.1834 16.7996 16.1836 14.4947C16.1836 13.2546 15.6015 12.134 14.7754 11.1509C13.9662 10.188 12.929 9.36564 11.999 8.69876Z" fill="currentColor" stroke="currentColor" stroke-width="0.2" /></svg>',
  M1L: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M18 21L18 3M4 3L17.9642 11.0623" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>',
  M1R: '<svg width="100%" height="100%" viewBox="0 0 24 24" style="display:block"><path d="M6 21L6 3M6 11L19.9642 2.93774" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>',
};

function stitchCell(type) {
  if (type === 'E') return '<div class="cc cc-e"></div>';
  const sym = SYMS[type] || '';
  return `<div class="cc">${sym ? `<span class="cc-sym">${sym}</span>` : ''}</div>`;
}

function buildChartTracker(phaseHeaderHtml) {
  let html = '<div class="chart-tracker">';

  // Top panel: just the phase header (minimized grab bar when idle) — the
  // general instructions now live in the row recap dock, and the zoom
  // controls sit next to the recenter FAB (see chart-stage below).
  html += `<div class="chart-overlay-top" id="chart-overlay-top">`;
  html += phaseHeaderHtml;
  html += '</div>';

  // Stage: the scrolling chart viewport + floating recenter/zoom buttons
  html += '<div class="chart-stage">';
  html += '<div class="chart-vp" id="chart-vp"><div class="chart-inner" id="chart-inner">';

  // Render rows top-to-bottom visually (row 44 at top, row 1 at bottom).
  // The last-worked row (44) carries the post-chart confirm step directly
  // underneath it, rather than as a separate block below the whole chart.
  for (let r = CHART_TOTAL; r >= 1; r--) {
    const rowData = CHART_B[r - 1];
    const isActive = (r === chartCurrentRow);
    const isDone   = (r < chartCurrentRow);

    let numCls = 'crow-num';
    if (isActive) numCls += ' crow-num-active';
    else if (isDone) numCls += ' crow-num-done';

    html += `<div class="crow${isActive ? ' crow-active' : ''}" data-row="${r}">`;
    html += '<div class="crow-cells">';
    for (const t of rowData) html += stitchCell(t);
    html += '</div>';
    html += `<div class="${numCls}">${r}</div>`;
    html += '</div>';
  }

  html += '</div></div>'; // chart-inner + chart-vp
  html += `<div class="chart-fabs">
    <button class="chart-fab-btn" onclick="resizeChart(2)" aria-label="Zoom in">A+</button>
    <button class="chart-fab-btn" onclick="resizeChart(-2)" aria-label="Zoom out">A−</button>
    <button class="chart-fab-btn chart-recenter" onclick="centerOnCurrentRow()" aria-label="Center on current row">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3" fill="currentColor"/>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M9 0.5V3M9 15v2.5M17.5 9H15M3 9H0.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>`;
  html += '</div>'; // chart-stage

  // Bottom panel: legend (kept for the pattern-notes sheet, hidden here)
  html += `<div class="chart-overlay-bottom" id="chart-overlay-bottom">`;
  html += `<div class="chart-legend">
    <div class="leg"><div class="leg-cc"></div>knit</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.P}</div>purl</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.YO}</div>yarn over</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.K2}</div>k2tog</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.SK}</div>SKPO</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1}</div>M1</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1L}</div>M1L</div>
    <div class="leg"><div class="leg-cc" style="color:var(--ch-def-symbol)">${SYMS.M1R}</div>M1R</div>
    <div class="leg"><div class="leg-cc leg-cc-e"></div>no stitch</div>
  </div>`;
  html += '</div>';

  html += '</div>'; // chart-tracker
  return html;
}

function centerOnCurrentRow() {
  scrollChartToCurrent('smooth');
}

// ─────────────────────────────────────────────
// ROW RECAP — plain-language summary of the stitches in a row.
//
// Patterns worked IN THE ROUND (e.g. Peacock Tee) have only one kind of
// row: always read right → left, always the RS-facing stitch names. The
// stored chart array is left → right, so that case always reverses it.
//
// Patterns worked FLAT (`PHASES[cur].flatChart`, e.g. Frost Flower)
// alternate sides every row: odd rows are RS (right → left, RS stitch
// names), even rows are WS (left → right — the stored array is already
// left → right, so no reverse — WS stitch names). See isRSRow().
// ─────────────────────────────────────────────
const STITCH_ABBR_RS = { K: 'k', P: 'p', YO: 'yo', K2: 'k2tog', SK: 'ssk', M1: 'm1', M1L: 'M1L', M1R: 'M1R' };
const STITCH_ABBR_WS = { K: 'p', P: 'k', YO: 'yo', K2: 'p2tog', SK: 'ssp', M1: 'm1', M1L: 'M1LP', M1R: 'M1RP' };

function isRSRow(row) {
  return !(PHASES[cur] && PHASES[cur].flatChart) || row % 2 === 1;
}

function rleStitches(types, abbr) {
  const out = [];
  for (let i = 0; i < types.length; ) {
    let j = i;
    while (j < types.length && types[j] === types[i]) j++;
    const n = j - i, t = types[i];
    if (t === 'K' || t === 'P') out.push(abbr[t] + n);
    else out.push(n > 1 ? abbr[t] + ' ×' + n : abbr[t]);
    i = j;
  }
  return out;
}

function collapseRepeats(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; ) {
    let best = null;
    const maxLen = Math.floor((tokens.length - i) / 2);
    for (let L = 2; L <= maxLen; L++) {
      let reps = 1;
      while (i + (reps + 1) * L <= tokens.length) {
        let match = true;
        for (let k = 0; k < L; k++) {
          if (tokens[i + k] !== tokens[i + reps * L + k]) { match = false; break; }
        }
        if (!match) break;
        reps++;
      }
      if (reps >= 2 && (!best || reps * L > best.reps * best.len)) best = { len: L, reps };
    }
    if (best) {
      out.push(`*${tokens.slice(i, i + best.len).join(', ')}* rep ${best.reps} times`);
      i += best.len * best.reps;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out;
}

function rowRecap(row) {
  const rs = isRSRow(row);
  let types = CHART_B[row - 1].filter(t => t !== 'E');
  if (rs) types = types.reverse(); // RS: right → left. WS: already stored left → right.
  if (!types.length) return '';
  return collapseRepeats(rleStitches(types, rs ? STITCH_ABBR_RS : STITCH_ABBR_WS)).join(', ');
}

function recapHtml(row) {
  const flat = !!(PHASES[cur] && PHASES[cur].flatChart);
  const rs = isRSRow(row);
  // Row-specific only — state what's true for THIS row, not a general
  // rule covering both parities (flat patterns alternate RS/WS every row,
  // so a blanket "odd rows.../even rows..." statement makes the reader
  // work out which half applies to them; just say it directly instead).
  const headText = flat
    ? `Row ${row} (${rs ? 'RS' : 'WS'}) · read ${rs ? 'right → left' : 'left → right'}, bottom to top`
    : 'Work Chart B in the round · read right → left, bottom to top';
  let html = `<div class="recap-head">${headText}</div>
    <div class="recap-body"><strong>Row ${row}:</strong> ${rowRecap(row)}</div>`;

  // Post-chart confirm step — the last step of the chart phase, surfaced
  // alongside the row instructions (same "what do I do now" panel) rather
  // than as a separate block further down. Only relevant once the last row
  // is reached — it's the count you take after finishing the chart.
  //
  // A converted section holds it as a note entry; a frozen snapshot from
  // before the conversion still holds it as a step. Both are read, and each
  // gets the toggle that owns its progress key.
  const ph = PHASES[cur];
  const confirmEntry = (ph.entries || []).find(e => e.postChart);
  const confirmStep  = confirmEntry || (ph.steps || []).find(s => s.postChart);
  if (confirmStep && row === CHART_TOTAL) {
    const done = confirmEntry ? entryDone(confirmEntry, entryProg) : state[confirmStep.id];
    const handler = confirmEntry ? 'toggleEntry' : 'toggleStep';
    html += `<div class="chart-confirm-step ${done ? 'done' : ''}" onclick="${handler}('${confirmStep.id}')">
      <div class="step-circle">${CHECK_SVG}</div>
      <div class="step-text">${confirmStep.text}</div>
    </div>`;
  }
  return html;
}

function renderChartDock() {
  const dock = document.getElementById('chart-dock');
  let html = `<div class="chart-recap" id="chart-recap">${recapHtml(chartCurrentRow)}</div>`;
  html += `<div class="chart-footer">
    <button class="cc-ctrl cc-minus" onclick="changeChartRow(-1)">−</button>
    <div class="cc-stats">
      <span class="cc-stat-lbl">Current row</span>
      <span class="cc-cur-val" id="cc-cur">${chartCurrentRow}</span>
      <span class="cc-total-lbl">Total rows ${CHART_TOTAL}</span>
    </div>
    <button class="cc-ctrl cc-plus" onclick="changeChartRow(1)">+</button>
  </div>`;

  html += '<div class="nav-btns" id="chart-nav-btns">';
  if (cur > 0) html += `<button class="nav-btn" onclick="go(${cur - 1})">← Back</button>`;
  if (cur < PHASES.length - 1) html += `<button class="nav-btn primary" onclick="go(${cur + 1})">Next →</button>`;
  else html += `<button class="nav-btn primary" onclick="showFinishedScreen()">Finished! 🎉</button>`;
  html += '</div>';

  dock.innerHTML = html;
}

// ─────────────────────────────────────────────
// CHART SCROLL — centre current row in viewport
// ─────────────────────────────────────────────
function getRowH() { return cellSz + 4; } // must match .crow height in CSS (var(--cell-sz) + 4px)

function scrollChartToCurrent(behavior) {
  // Centre the current row in the chart viewport. The viewport itself grows
  // and shrinks as the panels collapse/expand, so a plain centre is enough —
  // the visible area is always exactly the space left by the panels.
  const vp = document.getElementById('chart-vp');
  const inner = document.getElementById('chart-inner');
  if (!vp || !inner) return;

  const vpH = vp.clientHeight;
  const ROW_H = getRowH();
  const visIdx = CHART_TOTAL - chartCurrentRow; // row 44 = index 0 (top), row 1 = index 43 (bottom)
  const padTop = parseFloat(getComputedStyle(inner).paddingTop) || 8;
  const rowCenter = padTop + visIdx * ROW_H + ROW_H / 2;
  const target = rowCenter - vpH / 2;
  const maxScroll = inner.scrollHeight - vpH;

  vp.scrollTo({ top: Math.max(0, Math.min(maxScroll, target)), behavior: behavior || 'instant' });
}

function smartScrollChart(rowEl, delta) {
  // Keep the active row centered in the viewport once it reaches the midpoint
  // in the direction of travel.
  // Going up (+): track once row hits the upper half.
  // Going down (−): track once row hits the lower half.
  if (!rowEl) return;
  const vp = document.getElementById('chart-vp');
  if (!vp) return;

  const vpRect = vp.getBoundingClientRect();
  const rowRect = rowEl.getBoundingClientRect();
  const centerY = vpRect.top + vpRect.height / 2;
  const rowCenterY = rowRect.top + rowRect.height / 2;

  const shouldScroll = delta > 0 ? rowCenterY <= centerY : rowCenterY >= centerY;
  if (shouldScroll) {
    const target = vp.scrollTop + (rowCenterY - centerY);
    const maxScroll = vp.scrollHeight - vpRect.height;
    vp.scrollTo({ top: Math.max(0, Math.min(maxScroll, target)), behavior: 'smooth' });
  }
}

function resizeChart(delta) {
  cellSz = Math.max(10, Math.min(32, cellSz + delta));
  document.documentElement.style.setProperty('--cell-sz', cellSz + 'px');
  save();
  requestAnimationFrame(scrollChartToCurrent);
}

function changeChartRow(delta) {
  const prevRow = chartCurrentRow;
  chartCurrentRow = Math.max(1, Math.min(CHART_TOTAL, chartCurrentRow + delta));
  if (chartCurrentRow === prevRow) return; // clamped tap — nothing moved, nothing to stamp
  // Remember this phase's own position, so switching to another chart phase
  // and back returns to the row you were on rather than a shared one.
  if (PHASES[cur]) {
    chartRows[PHASES[cur].id] = chartCurrentRow;
    // Per-phase row means a per-phase clock. A single 'chart_row' key would
    // make two devices sitting on two different chart phases look like they
    // were fighting over one field, and merging them would move somebody to a
    // row of a chart they aren't knitting.
    stampClock(chartRowKey(PHASES[cur].id));
  }
  // No tally nudge here any more — the Rows total is derived from
  // chartRows/entryProg on read (globalRowsNow()), and save() stamps
  // global_rows if the derived value actually moved.
  renderGlobalRows();
  save();

  // Targeted DOM update — no full re-render
  const prevEl = document.querySelector('.crow[data-row="' + prevRow + '"]');
  if (prevEl) {
    prevEl.classList.remove('crow-active');
    const num = prevEl.querySelector('.crow-num');
    if (num) {
      num.classList.remove('crow-num-active');
      if (prevRow < chartCurrentRow) num.classList.add('crow-num-done');
      else num.classList.remove('crow-num-done');
    }
  }
  const newEl = document.querySelector('.crow[data-row="' + chartCurrentRow + '"]');
  if (newEl) {
    newEl.classList.add('crow-active');
    const num = newEl.querySelector('.crow-num');
    if (num) { num.classList.remove('crow-num-done'); num.classList.add('crow-num-active'); }
  }

  const ccur = document.getElementById('cc-cur');
  if (ccur) ccur.textContent = chartCurrentRow;
  const recap = document.getElementById('chart-recap');
  if (recap) recap.innerHTML = recapHtml(chartCurrentRow);

  // Smart scroll: keep active row centered once it reaches the viewport midpoint
  smartScrollChart(newEl, delta);
}


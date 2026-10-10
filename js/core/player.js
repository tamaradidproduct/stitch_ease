// ─────────────────────────────────────────────
// STEP SCREEN — playlist and player.
//
// docs/superpowers/specs/2026-10-05-step-screen-design.md, laid out as in the
// Stitch project "Stitch Ease Knitting Tracker" (Playlist / Player screens).
// Where the designs are silent the choice is noted inline as "gap".
//
// Progress lives in steps.js (one cursor per section). This file is view state
// plus markup: which row is being LOOKED AT (`spViewedRow`, ephemeral — never
// persisted or synced) and whether the player page is open. Looking never
// changes progress; only spDone / spMarkIncomplete do.
//
// Handlers are inline-onclick globals like the rest of the app, and take row
// numbers, never ids, so nothing authored ever lands inside an attribute.
// Pattern text is raw HTML by convention (synced docs are re-escaped on the way
// in by sanitizeSyncedPattern), so it is interpolated as-is.
// ─────────────────────────────────────────────

let spViewedRow = null;     // null = follow the cursor
let spPlayerOpen = false;
let spNotesOpen = false;
let spSetupOpen = false;     // the player card's Setup toggle (collapsed until asked for)
let spChartOpen = false;    // the full chart screen
let spKey = null;           // project|section the view state belongs to

// ── Rows, flattened ──
//
// One entry per physical row, in order. gap: a repeat is flattened here, so each
// of its rows is a list item carrying its pass. The designs' repeat card
// (Task 6) replaces this for repeats.
function spRows(section) {
  const out = [];
  let n = 0;
  sectionSteps(section, activeDoc).forEach(step => {
    if (step.kind === 'row') {
      out.push({ n: ++n, step, def: step, pass: 1, passes: 1, rowInPass: 1, R: 1 });
    } else if (step.kind === 'repeat') {
      const R = step.rows.length, T = step.times | 0;
      for (let p = 1; p <= T; p++) for (let r = 1; r <= R; r++)
        out.push({ n: ++n, step, def: step.rows[r - 1], pass: p, passes: T, rowInPass: r, R });
    }
  });
  return out;
}

// Memoised on the row: rowRecap() is the expensive call, and Done must not
// redo it for every row in the section.
function spText(row) {
  if (row.text === undefined) {
    const d = row.def;
    row.text = d.text || (d.chartRow ? rowRecap(d.chartRow) : '');
  }
  return row.text;
}

// The flattened rows live as long as the section is on screen. A full render
// (renderStepSection) drops them, so a pattern or yarn-colour change is seen;
// the repaints that follow a tap reuse them.
let spRowsCache = null;
function spRowsFor(p) {
  if (!spRowsCache || spRowsCache.p !== p || spRowsCache.proj !== activeProjectId)
    spRowsCache = { p, proj: activeProjectId, rows: spRows(p) };
  return spRowsCache.rows;
}

// "R11 (RS)" for a chart row, "R3" otherwise — the label the designs use.
function spLabel(row) {
  if (row.step.kind === 'repeat') return 'R' + row.rowInPass;   // numbered within its pass, as the repeat design does
  const cr = row.def.chartRow;
  return 'R' + row.n + (cr ? ' (' + (isRSRow(cr) ? 'RS' : 'WS') + ')' : '');
}

function spCallouts(row) {
  return calloutsFor(row.step, { pass: row.pass, passes: row.passes, rowInPass: row.rowInPass });
}

// ── View state ──

function spSyncKey() {
  const key = activeProjectId + '|' + (PHASES[cur] && PHASES[cur].id);
  if (key !== spKey) { spKey = key; spViewedRow = null; spPlayerOpen = false; spNotesOpen = false; spChartOpen = false; spSetupOpen = false; }
}

// null means "on the cursor row" — also when the viewed row is dropped back
// onto it, so the browse chip never says "viewing row 11 · on row 11".
function spBrowsing(cursor, total) {
  return spViewedRow !== null && spViewedRow !== cursor + 1 && spViewedRow >= 1 && spViewedRow <= total;
}

// ── Markup ──

const BACK_CHEV = (typeof BACK_CHEVRON_SVG !== 'undefined') ? BACK_CHEVRON_SVG : '‹';
const SP_CHEV_L = UI_CHEV_L;
const SP_CHEV_R = UI_CHEV_R;

// ── Chart window (inside the player) and the full chart screen ──
//
// Laid out as the Stitch "Player – Chart Focused" design. The cells are the
// app's own stitchCell() — real symbols and per-cell yarn colours — not the
// design's text glyphs, which only sketch five stitches.

// Only a row of the section's own chart — a motif repeat's rows (Task 6) point
// at a different, smaller chart.
function spHasChart(p, row) {
  return !!(p.hasChart && row && row.step.kind === 'row' && row.def.chartRow && CHART_B.length && CHART_B[0]);
}

// The chart a row is worked from: the section's own chart for a chart row, or
// the repeat's motif chart (`step.motif`, a small grid) for a row inside it.
function spChartFor(p, row) {
  if (!row) return null;
  if (spHasChart(p, row)) return CHART_B;
  const st = row.step;
  return st.kind === 'repeat' && st.motif && st.motif[0] && row.def.chartRow ? st.motif : null;
}

function spChartRowToN(rows, chartRow) {
  const i = rows.findIndex(r => r.step.kind === 'row' && r.def.chartRow === chartRow);
  return i < 0 ? null : i + 1;
}

function spInnerHtml(p) {
  const rows = spRowsFor(p);
  const total = rows.length;
  const cursor = stepCursor(p);
  if (!total) {
    return spTopBarHtml(p, 0, 0) + '<div class="sp-scroll">' + spNotesHtml(p) + spTasksHtml(p) + '</div>' + spRowlessDock();
  }
  if (spViewedRow !== null && (spViewedRow < 1 || spViewedRow > total)) spViewedRow = null;
  if (spChartOpen && spPlayerOpen && spHasChart(p, rows[0])) return spFullChartHtml(p, cursor, total, rows);
  if (spPlayerOpen && (cursor < total || spViewedRow !== null)) return spPlayerHtml(p, cursor, total, rows);
  return spPlaylistHtml(p, cursor, total, rows) + spPlaylistDock(cursor, total);
}

// Called by renderPhase(). The wrapper is what spRender() repaints, so the
// section header, tabs and the fixed dock all stay in step without rebuilding
// the page.
function renderStepSection(p) {
  spSyncKey();
  spRowsCache = null;
  const html = `<div class="sp" id="sp-root">${spInnerHtml(p)}</div>`;
  document.body.classList.add('sp-on');
  requestAnimationFrame(spSyncPlayerLayout);
  return html;
}

function spRender() {
  const root = document.getElementById('sp-root');
  if (!root) return;
  const keep = root.querySelector('.sp-scroll'), kept = keep ? keep.scrollTop : 0;
  root.innerHTML = spInnerHtml(PHASES[cur]);
  const again = root.querySelector('.sp-scroll');
  if (again) again.scrollTop = kept;
  root.classList.toggle('sp-browsing', root.querySelector('.sp-browse') !== null);
  renderTabs();
  spSyncPlayerLayout();
  spAimChart();
  spAimMini();
}

// A wide window opens on the end the row starts from: right for RS, left for WS.
function spAimChart() {
  const el = document.getElementById('sp-cw-scroll');
  if (!el) return;
  const active = el.querySelector('.sp-cw-row.active');
  if (active) el.scrollTop = active.offsetTop - el.clientHeight / 2 + active.offsetHeight / 2;
  if (el.scrollWidth <= el.clientWidth) return;
  const p = PHASES[cur], c = stepCursor(p), total = stepsRowCount(p, activeDoc);
  const v = spViewedRow !== null ? spViewedRow : Math.min(total, c + 1);
  const row = spRowsFor(p)[v - 1];
  el.scrollLeft = row && row.step.kind === 'row' && row.def.chartRow && !isRSRow(row.def.chartRow) ? 0 : el.scrollWidth;
}

// Pin the player between the bars: measured, because vh units mis-report in Chrome Custom Tabs.
function spSyncPlayerLayout() {
  const bar = document.querySelector('.ui-top'), dock = document.querySelector('.ui-dock');
  const st = document.documentElement.style;
  st.setProperty('--sp-top', (bar ? Math.round(bar.getBoundingClientRect().bottom) : 0) + 'px');
  st.setProperty('--sp-bottom', (dock ? Math.round(dock.getBoundingClientRect().height) : 0) + 'px');
}

function leaveStepMode() { document.body.classList.remove('sp-on'); }

// ── Looking (never changes progress) ──

function spScrollCurrent() { spFocusSelected(); }

// Keep the row being looked at just below the bar, with the row before it showing above it —
// after every ‹ ›, row tap, Done and when the playlist opens. Smooth unless motion is reduced.
function spFocusSelected() {
  if (spPlayerOpen) return window.scrollTo({ top: 0 });
  const sc = document.querySelector('.sp-scroll'), el = document.querySelector('.sp-row.selected');
  if (!sc || !el) return;
  const prev = el.previousElementSibling;
  const anchor = prev && prev.classList.contains('sp-row') ? prev : el;
  const top = anchor.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 8;
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  sc.scrollTo({ top: Math.max(0, top), behavior: calm ? 'auto' : 'smooth' });
}

function spOpenPlayer(row) {
  const c = stepCursor(PHASES[cur]);
  spViewedRow = row === c + 1 ? null : row;
  spPlayerOpen = true;
  spRender();
  window.scrollTo({ top: 0 });
}

function spClosePlayer() {
  spPlayerOpen = false;
  spRender();
  spScrollCurrent();
}

// ‹ › step through rows, and carry on into the neighbouring section at either
// end — the last row of one section is followed by the first of the next.
function spBrowse(delta) {
  const p = PHASES[cur], total = stepsRowCount(p, activeDoc), c = stepCursor(p);
  const from = total ? (spViewedRow !== null ? spViewedRow : Math.min(total, c + 1)) : (delta < 0 ? 1 : 0);
  const to = from + delta;
  if (to < 1 || to > total) return spBrowseSection(delta);
  spViewedRow = to === c + 1 ? null : to;
  spRender();
  spScrollToViewed();
}

// After any ‹ › move, bring the row now being looked at into view: the top of
// the page in the player, the row itself (centred) in the playlist.
function spScrollToViewed() { spFocusSelected(); }

function spBrowseSection(delta) {
  const target = cur + (delta < 0 ? -1 : 1);
  if (target < 0 || target >= PHASES.length) return;
  const keepPlayer = spPlayerOpen;
  go(target);
  const p = PHASES[cur];
  if (!isStepSection(p)) return;
  const total = stepsRowCount(p, activeDoc);
  if (total) {
    const row = delta < 0 ? total : 1;
    spViewedRow = row === stepCursor(p) + 1 ? null : row;
    spPlayerOpen = keepPlayer;
    spRender();
  }
  spScrollToViewed();
}

// Tap a row in the playlist to select it. Looking only — progress is untouched.
function spSelectRow(n) {
  const c = stepCursor(PHASES[cur]);
  spViewedRow = n === c + 1 ? null : n;
  spRender();
  spFocusSelected();
}

function spBackToCurrent() {
  spViewedRow = null;
  spRender();
  spScrollToViewed();
}

function spOpenChart() { spChartOpen = true; spRender(); window.scrollTo({ top: 0 }); spFcRecenter(); }
function spCloseChart() { spChartOpen = false; spRender(); window.scrollTo({ top: 0 }); }

// Tapping a chart row looks at it — class swaps only, so a 100-row chart is not
// rebuilt on every tap.
function spFcTap(chartRow) {
  const p = PHASES[cur], c = stepCursor(p);
  const n = spChartRowToN(spRowsFor(p), chartRow);
  if (!n) return;
  spViewedRow = n === c + 1 ? null : n;
  document.querySelectorAll('.sp-fc-row.viewing').forEach(e => e.classList.remove('viewing'));
  const el = document.querySelector('.sp-fc-row[data-r="' + chartRow + '"]');
  if (el && n !== c + 1) el.classList.add('viewing');
  const back = document.getElementById('sp-fc-back');
  if (back) back.textContent = 'Back to row ' + n;
}

function spZoom(d) {
  cellSz = Math.max(10, Math.min(32, cellSz + d));
  const fc = document.getElementById('sp-fc');
  if (fc) fc.style.setProperty('--cell-sz', cellSz + 'px');
  save();
}

function spFcRecenter() {
  const el = document.querySelector('.sp-fc-row.active');
  if (el) el.scrollIntoView({ block: 'center' });
}

function spToggleSetup() { spSetupOpen = !spSetupOpen; spRender(); }
function spToggleNotes() { spNotesOpen = !spNotesOpen; spRender(); }

// "Mark rows 1–3 done?" — one row reads "Mark row 3 done?".
function spRangeQuestion(from, to, what) {
  return from === to ? `Mark row ${to} ${what}?` : `Mark rows ${from}–${to} ${what}?`;
}

// The section name in the top bar opens this: the section's notes, then every
// section to switch to. Looking only — nothing here changes progress.
function spOpenSectionSheet() {
  const p = PHASES[cur];
  const notes = (p.notes || []).length
    ? '<p class="sheet-sub">' + p.notes.map(n => n).join('</p><p class="sheet-sub">') + '</p>' : '';
  const list = PHASES.map((s, i) =>
    `<button class="sheet-btn${i === cur ? ' primary' : ''}" onclick="closeSheet(); go(${i})">${escapeHtml(s.name)}</button>`).join('');
  openSheet(p.name, notes + '<div class="sheet-actions" style="flex-direction:column">' + list + '</div>');
}

// ── Progress (explicit actions only) ──

// The common tap — Done on the cursor row from the playlist — touches two rows,
// the progress figures and the dock, so it patches those instead of rebuilding
// the list. Anything else (browsing, the player, a jump) repaints.
function spPatchPlaylist(p, prev, next) {
  const root = document.getElementById('sp-root');
  if (!root || spPlayerOpen || spViewedRow !== null || next !== prev + 1) return false;
  const rows = spRowsFor(p), total = rows.length;
  // A repeat is one card for the whole block, so a tap inside or into one repaints instead of patching two rows.
  if ([prev + 1, next + 1].some(n => rows[n - 1] && rows[n - 1].step.kind === 'repeat')) return false;
  const swap = n => {
    if (n < 1 || n > total) return true;
    const el = root.querySelector('.sp-row[data-row="' + n + '"]');
    if (!el) return false;
    el.outerHTML = spRowHtml(rows[n - 1], next, total);
    return true;
  };
  if (!swap(prev + 1) || !swap(next + 1)) return false;
  const tallyEl = root.querySelector('.ui-top-tally');
  if (tallyEl) tallyEl.textContent = next + ' / ' + total + ' rows';
  const tally = document.getElementById('prog-rows');
  if (tally) tally.textContent = globalRowsNow() + ' / ' + patternTotalRows();
  const dock = root.querySelector('.ui-dock');
  if (dock) dock.outerHTML = spPlaylistDock(next, total);
  if (next >= total) renderTabs();   // the section's "complete" dot
  spAimMini();
  return true;
}

function spApplyCursor(p, cursor) {
  const prev = stepCursor(p);
  const patched = !spPlayerOpen && spViewedRow === null && cursor === prev + 1;
  setStepCursor(p, cursor);
  if (patched && spPatchPlaylist(p, prev, cursor)) { spScrollCurrent(); return; }
  spViewedRow = null;
  if (cursor >= stepsRowCount(p, activeDoc)) spPlayerOpen = false;   // nothing left to stand on
  spRender();
  if (!spPlayerOpen) spScrollCurrent();
}

function spDone(row) {
  const p = PHASES[cur];
  const r = doneAt(p, activeDoc, stepCursor(p), row);
  if (r.cursor === stepCursor(p)) return;
  if (!r.confirm) return spApplyCursor(p, r.cursor);
  sheetConfirm({
    title: spRangeQuestion(r.confirm.from, r.confirm.to, 'done'),
    message: 'Rows before it will be counted as worked.',
    confirmLabel: 'Mark done',
    onConfirm: () => spApplyCursor(p, r.cursor),
  });
}

function spMarkIncomplete(row) {
  const p = PHASES[cur];
  const r = markIncompleteAt(stepCursor(p), row);
  if (r.cursor === stepCursor(p)) return;
  if (!r.confirm) return spApplyCursor(p, r.cursor);
  sheetConfirm({
    title: spRangeQuestion(r.confirm.from, r.confirm.to, 'not done'),
    message: 'You\'ll go back to the start of this row.',
    confirmLabel: 'Mark not done',
    onConfirm: () => spApplyCursor(p, r.cursor),
  });
}

// Pass − / + are progress actions: + finishes the current pass (using it IS the
// statement that the pass was knitted), − steps back to the start of this one
// or the previous one. See passPlus / passMinus in steps.js.
function spPass(delta) {
  const p = PHASES[cur], c = stepCursor(p);
  const n = delta > 0 ? passPlus(p, activeDoc, c) : passMinus(p, activeDoc, c);
  if (n === c) return;
  spViewedRow = null;
  spApplyCursor(p, n);
}

function spToggleTask(i) {
  const p = PHASES[cur];
  const task = sectionSteps(p, activeDoc).filter(s => s.kind === 'task')[i];
  if (!task) return;
  toggleTask(task);
  spRender();
}

window.addEventListener('resize', () => { if (document.body.classList.contains('sp-on')) spSyncPlayerLayout(); });

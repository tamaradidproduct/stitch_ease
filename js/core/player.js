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
let spChartRows = 7;         // rows the chart window shows (fitted to the screen)
let spChartWatched = null;
let spChartWatch = null;     // ResizeObserver on the chart area, so a changing screen height refits it
let spSetupOpen = false;     // the player card's Setup toggle (collapsed until asked for)
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
      const R = (step.rows || []).length, T = step.times | 0;
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
  if (key !== spKey) { spKey = key; spViewedRow = null; spPlayerOpen = false; spNotesOpen = spEnterNotes(); spSetupOpen = false; }
}

// null means "on the cursor row" — also when the viewed row is dropped back
// onto it, so the browse chip never says "viewing row 11 · on row 11".
function spBrowsing(cursor, total) {
  return spViewedRow !== null && spViewedRow !== cursor + 1 && spViewedRow >= 1 && spViewedRow <= total;
}

// ── Markup ──

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

function spInnerHtml(p) {
  const rows = spRowsFor(p);
  const total = rows.length;
  const cursor = stepCursor(p);
  if (!total) {
    return spTopBarHtml(p, 0, 0) + '<div class="sp-scroll">' + spListHeadHtml(p) + spNotesHtml(p) + spTasksHtml(p) + '</div>' + spRowlessDock();
  }
  if (spViewedRow !== null && (spViewedRow < 1 || spViewedRow > total)) spViewedRow = null;
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
  if (spTakeEnter()) {
    const el = root.querySelector('.sp-player') || root.querySelector('.sp-row.selected');
    if (el) el.classList.add('sp-enter');
  }
  root.classList.toggle('sp-browsing', root.querySelector('.sp-browse') !== null);
  renderTabs();
  spSyncPlayerLayout();
  if (spFitChart()) return;   // the window was re-fitted and repainted
  spAimChart();
  spAimMini();
}

// A wide window opens on the end the row starts from: right for RS, left for WS.
// Fit the chart window to the height it was given: as many rows as fit, never fewer than seven,
// and no vertical scrolling (a full-chart view comes later). Re-renders once if the count changed.
function spFitChart() {
  const el = document.getElementById('sp-cw-scroll');
  if (!el || !el.clientHeight) return false;
  // A chart narrower than the screen grows its (square) cells to run the full width; a wider one keeps them
  // at the minimum and scrolls.
  const cols = el.querySelectorAll('.sp-cw-row')[0] ? el.querySelectorAll('.sp-cw-row')[0].querySelectorAll('.cc').length : 0;
  if (cols) el.style.setProperty('--h-cell', spChartCellFor(el.clientWidth, cols) + 'px');
  const row = el.querySelector('.sp-cw-row'), head = el.querySelector('.sp-cw-head'), box = el.querySelector('.sp-cw');
  const pitch = row ? row.offsetHeight + 2 : 0;                                   // a row plus the gap under it
  const pad = box ? parseFloat(getComputedStyle(box).paddingTop) + parseFloat(getComputedStyle(box).paddingBottom) : 0;
  const chrome = head ? head.offsetHeight + 2 + pad : 0;                          // the stitch numbers and the padding
  const rows = spChartRowsFor(el.clientHeight, pitch, chrome);
  if (!spChartWatch && window.ResizeObserver) spChartWatch = new ResizeObserver(() => { spFitChart(); });
  if (spChartWatch && spChartWatched !== el) { spChartWatch.disconnect(); spChartWatch.observe(el); spChartWatched = el; }   // once per element: observing fires a first callback
  if (rows === spChartRows) return false;
  spChartRows = rows;
  spRender();
  return true;
}

// Keep the nearer row-number column in view: which end the chart is scrolled closer to.
function spChartSide() {
  const el = document.getElementById('sp-cw-scroll');
  if (!el) return;
  const side = spChartSideFor(el.scrollLeft, el.scrollWidth, el.clientWidth);
  el.classList.toggle('sp-side-right', side === 'right');
}

function spAimChart() {
  const el = document.getElementById('sp-cw-scroll');
  if (!el) return;
  if (el.scrollWidth > el.clientWidth) {
    const p = PHASES[cur], c = stepCursor(p), total = stepsRowCount(p, activeDoc);
    const v = spViewedRow !== null ? spViewedRow : Math.min(total, c + 1);
    const row = spRowsFor(p)[v - 1];
    el.scrollLeft = row && row.step.kind === 'row' && row.def.chartRow && !isRSRow(row.def.chartRow) ? 0 : el.scrollWidth;
  }
  spChartSide();
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

// Where the playlist should scroll to keep the row being looked at in view, without moving when it
// does not have to: the view stays put while the selected row and a short preview of the next one are
// visible; when the selection reaches the end of the view it scrolls just enough to show the selected
// row whole and a preview (about 48 px) of the next; a row cut off at the top is brought back; a row
// nowhere in view is jumped to, with the row before it showing above. All rects share one frame.
// Returns {delta, jump}: how far to move scrollTop, and whether to jump rather than glide.
function spScrollDelta({ view, sel, prev, next }) {
  const PREVIEW = 48, MARGIN = 8;
  if (sel.bottom <= view.top || sel.top >= view.bottom) return { delta: (prev ? prev.top : sel.top) - view.top - MARGIN, jump: true };
  if (sel.top < view.top) return { delta: sel.top - view.top - MARGIN, jump: false };
  if (sel.bottom - sel.top + MARGIN >= view.bottom - view.top) return { delta: 0, jump: false };   // taller than the view: its top is showing
  const need = next ? next.top + Math.min(next.bottom - next.top, PREVIEW) + MARGIN : sel.bottom;
  return { delta: need > view.bottom ? need - view.bottom : 0, jump: false };
}

function spFocusSelected() {
  if (spPlayerOpen) return window.scrollTo({ top: 0 });
  const sc = document.querySelector('.sp-scroll'), el = document.querySelector('.sp-row.selected');
  if (!sc || !el) return;
  const rect = e => { if (!e || !e.classList || !e.classList.contains('sp-row')) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
  const v = sc.getBoundingClientRect(), r = el.getBoundingClientRect();
  const d = spScrollDelta({ view: { top: v.top, bottom: v.bottom }, sel: { top: r.top, bottom: r.bottom }, prev: rect(el.previousElementSibling), next: rect(el.nextElementSibling) });
  if (!d.delta) return;
  const calm = d.jump || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  sc.scrollTo({ top: Math.max(0, sc.scrollTop + d.delta), behavior: calm ? 'auto' : 'smooth' });
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
  spNoteChange();   // the row you move to eases in, like after a change of progress
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
    spNoteChange();
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

// The glossary button: a bottom sheet with this row's stitches and the pattern's own notes, and a
// way on to the whole glossary. Looking only.
function openStitchSheet() {
  const p = PHASES[cur], rows = spRowsFor(p), c = stepCursor(p);
  const v = Math.min(rows.length, spViewedRow !== null ? spViewedRow : c + 1);
  const row = rows[v - 1], pat = typeof activePattern === 'function' ? activePattern() : null;
  openSheet('Stitches', spStitchSheetHtml(row ? spRowStitches(p, row) : [], (pat && pat.notes) || []));
}

// A tap on the selected playlist card opens its row, except taps on what is interactive inside it
// (buttons, the Setup toggle, the rows of a repeat), which keep doing their own thing.
function spCardTap(e, n) {
  if (e && e.target && e.target.closest && e.target.closest('button, a, .sp-rrow, .ui-toggle')) return;
  spOpenPlayer(n);
}

// Feedback for a change of progress: the next screen eases in once.
let spEnterPending = false;
function spNoteChange() { spEnterPending = true; }
function spTakeEnter() { const was = spEnterPending; spEnterPending = false; return was; }

function spToggleSetup() { spSetupOpen = !spSetupOpen; spRender(); }
// ── Section notes: open on the first visit to a section in a project, collapsed on later visits, and
// whatever the knitter taps is remembered for that section. A device preference: never synced.
// Stored per project as {sectionId: 'seen' | 'open' | 'closed'} under pt3_proj_<id>_notesui.
function spNotesInitial(stored) { return stored === undefined ? true : stored === 'open'; }
function spNotesUi() { try { return JSON.parse(localStorage.getItem(pkey('notesui'))) || {}; } catch (e) { return {}; } }
function spNotesUiSave(map) { try { localStorage.setItem(pkey('notesui'), JSON.stringify(map)); } catch (e) { /* storage full or off: the default applies next time */ } }
function spEnterNotes() {
  const p = PHASES[cur];
  if (!p || !(p.notes || []).length) return false;
  const map = spNotesUi(), v = map[p.id];
  if (v === undefined) { map[p.id] = 'seen'; spNotesUiSave(map); }
  return spNotesInitial(v);
}
function spToggleNotes() {
  spNotesOpen = !spNotesOpen;
  const p = PHASES[cur];
  if (p) { const map = spNotesUi(); map[p.id] = spNotesOpen ? 'open' : 'closed'; spNotesUiSave(map); }
  spRender();
}

// "Mark rows 1–3 done?" — one row reads "Mark row 3 done?".
function spRangeQuestion(from, to, what) {
  return from === to ? `Mark row ${to} ${what}?` : `Mark rows ${from}–${to} ${what}?`;
}

// The section name in the top bar opens this: the section's notes, then every
// section to switch to. Looking only — nothing here changes progress.
function spOpenSectionSheet() { openSheet(spName(PHASES[cur].name), spSectionSheetHtml()); }

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
  const fresh = root.querySelector('.sp-row.selected');
  if (fresh && spTakeEnter()) fresh.classList.add('sp-enter');   // the new current row eases in
  return true;
}

function spApplyCursor(p, cursor) {
  const prev = stepCursor(p);
  const patched = !spPlayerOpen && spViewedRow === null && cursor === prev + 1;
  setStepCursor(p, cursor);
  uiHaptic(cursor > prev ? 12 : 8);
  spNoteChange();
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

window.addEventListener('resize', () => { if (document.body.classList.contains('sp-on')) { spSyncPlayerLayout(); spFitChart(); } });

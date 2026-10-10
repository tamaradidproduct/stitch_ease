// ─────────────────────────────────────────────
// SELF-TEST for the step-screen markup (js/core/stepViews.js). Not shipped.
// Run after loading steps.demo.selftest.js: it activates a demo project, builds the
// markup, and restores every pt3_* key it touched. Returns {passed, failed, failures}.
// ─────────────────────────────────────────────
function stepViewsSelfTest() {
  const results = [];
  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }
  const has = (s, t) => String(s).indexOf(t) !== -1;
  const count = (s, t) => String(s).split(t).length - 1;

  const snap = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^pt3_/.test(k)) snap[k] = localStorage.getItem(k); }
  const saved = { cur, view: typeof view !== 'undefined' ? view : undefined };
  try {
    const proj = createProject('step-demo');
    activateProject(proj.id || proj);
    cur = 0;
    const p = PHASES[0];

    check('step markup module is loaded', typeof STEP_VIEWS, 'boolean');

    const rows = spRowsFor(p);
    const html = spPlaylistHtml(p, 0, rows.length, rows);
    check('playlist: one card per row, one selected', [count(html, 'data-row='), count(html, 'sp-row selected')], [3, 1]);
    check('player: dock labelled for the current row', has(spPlayerHtml(p, 0, rows.length, rows), 'Mark row 1 done'), true);

    // ── Task 4: top bar, dock copy, confirm sheets ──
    const bar = spTopBarHtml(p, 2, 3);
    const projName = activeProject().name;
    check('playlist top bar: the project name (tap to rename), tally, PDF button, back; no section name or switcher',
      [has(bar, projName), has(bar, 'renameProject('), has(bar, '2 / 3 rows'), has(bar, 'aria-label="Original pattern PDF"'), has(bar, 'goHome()'), has(bar, p.name), has(bar, 'spOpenSectionSheet()')], [true, true, true, true, true, false, false]);
    const pbar = spTopBarHtml(p, 2, 3, { player: true, onBack: 'spClosePlayer()' });
    check('player top bar: the project name small, the section name, no switcher or chevron',
      [has(pbar, projName), has(pbar, 'renameProject('), has(pbar, p.name), has(pbar, 'spOpenSectionSheet()'), has(pbar, '<svg width="12"')], [true, true, true, false, false]);
    const headHtml = spPlaylistHtml(p, 0, spRowsFor(p).length, spRowsFor(p));
    check('playlist: the section name heads the list, with the switcher',
      [has(headHtml, 'class="sp-sec-btn"'), has(headHtml, 'spOpenSectionSheet()'), headHtml.indexOf('sp-sec-btn') > headHtml.indexOf('</header>')], [true, true, true]);
    setStepCursor(p, 2);
    spViewedRow = 1;
    check('player: a done row offers "not done"', has(spPlayerHtml(p, 2, rows.length, rows), 'Mark row 1 not done'), true);
    spViewedRow = null;
    check('playlist dock: records the current row', has(spPlaylistDock(2, rows.length), 'Mark row 3 done'), true);
    const rp = PHASES[1], rrows = spRowsFor(rp);
    check('repeat row: the dock names the row like any other', [has(spPlayerHtml(rp, 0, rrows.length, rrows), 'Mark row 1 done'), has(spPlayerHtml(rp, 0, rrows.length, rrows), 'of pass')], [true, false]);

    // ── Task 5: player card and chart region ──
    const wHtml = spPlayerHtml(p, 0, rows.length, rows);
    check('card (no chart): row label once, CHECK shown, no count, no chart region',
      [count(wHtml, 'Row 1 of 3'), has(wHtml, 'CHECK'), has(wHtml, 'class="ui-count"'), has(wHtml, 'sp-chart-region')], [1, true, false, false]);
    check('the row heading sits above the card, outside it, in heading style',
      [wHtml.indexOf('sp-head') > -1, wHtml.indexOf('sp-head') < wHtml.indexOf('sp-card'), has(spPlayerCardHtml(p, rows[0], 1, 3, false), 'Row 1 of 3'), has(wHtml, 'ROW 1 OF 3')], [true, true, false, false]);
    check('a written row still has the glossary bar (no chart): one glossary button, no chart region',
      [count(wHtml, 'aria-label="Glossary"'), has(wHtml, 'sp-chart-region'), has(wHtml, 'sp-legend')], [1, false, true]);
    check('Setup is collapsed by default', has(wHtml, 'Cast on 88 sts'), false);
    spSetupOpen = true;
    check('Setup shows once opened', has(spPlayerHtml(p, 0, rows.length, rows), 'Cast on 88 sts'), true);
    spSetupOpen = false;
    check('spCount is null until rows carry a count', spCount(rows[0]), null);

    const cp = PHASES[2], crows = spRowsFor(cp);
    const realChart = CHART_B;
    CHART_B = cp.chart;   // what syncActiveChart() does when the section is opened
    spViewedRow = 3;
    const cHtml = spPlayerHtml(cp, 3, crows.length, crows);
    spViewedRow = null;
    CHART_B = realChart;
    check('chart row: label, instruction, chart region and glossary button once each',
      [count(cHtml, 'Row 3 of 12'), count(cHtml, 'k2, yo, k2tog — authored override'), count(cHtml, 'sp-chart-region'), count(cHtml, 'aria-label="Glossary"')], [1, 1, 1, 1]);
    check('chart row: no old strip or hero markup', [has(cHtml, 'sp-strip'), has(cHtml, 'sp-hero'), has(cHtml, 'sp-next')], [false, false, false]);
    check('legend line truncates to Knit + 3 stitches and counts the rest',
      [has(spLegendLine({ K: 1, P: 1, YO: 1, K2: 1, SK: 1, M1: 1 }), 'Knit'), has(spLegendLine({ K: 1, P: 1, YO: 1, K2: 1, SK: 1, M1: 1 }), '+2'), has(spLegendLine({ K: 1, P: 1 }), '+')], [true, true, false]);

    // ── Task 6: repeat state in the player ──
    const rpR = spRowsFor(PHASES[1]);
    const rep1 = spPlayerHtml(PHASES[1], 0, rpR.length, rpR);
    check('repeat: pass line with − / +, only the viewed pass\'s rows, no count or end-of-pass line yet',
      [has(rep1, 'Pass 1 of 4'), has(rep1, 'spPass(-1)'), has(rep1, 'spPass(1)'), has(rep1, 'aria-label="Previous pass"'), count(rep1, 'data-row='), has(rep1, 'sp-rrow-c'), has(rep1, 'at end of pass')],
      [true, true, true, true, 2, false, false]);
    check('player: the repeat heading sits above the card, in heading style, like a row heading',
      [rep1.indexOf('sp-head') > -1, rep1.indexOf('sp-head') < rep1.indexOf('sp-card'), has(rep1, 'Repeat · 2 rows × 4'), has(rep1, 'REPEAT · 2 ROWS × 4')], [true, true, true, false]);
    check('repeat: rows are tappable looks, one is selected', [has(rep1, 'spSelectRow(2)'), count(rep1, 'sp-rrow sel')], [true, 1]);
    check('repeat with a motif draws the chart region', has(rep1, 'sp-chart-region'), true);
    spViewedRow = 5;
    check('repeat: the pass follows the viewed row', has(spPlayerHtml(PHASES[1], 0, rpR.length, rpR), 'Pass 3 of 4'), true);
    const realCountFn = spCount;
    spCount = () => 70;
    const rep3 = spPlayerHtml(PHASES[1], 0, rpR.length, rpR);
    spCount = realCountFn; spViewedRow = null;
    check('repeat with counts: a count per row and the count at the end of the pass',
      [count(rep3, 'sp-rrow-c'), has(rep3, 'at end of pass 3'), has(rep3, '<b>70</b>')], [2, true, true]);
    check('spPassEndCount is null when the last row has no count', spPassEndCount(rpR.filter(r => r.step === rpR[0].step), 1), null);

    // ── Task 7: playlist ──
    const pl = spPlaylistHtml(p, 1, rows.length, rows);
    check('playlist heading: just the description (the bar already shows the progress)', [has(pl, 'INSTRUCTIONS'), has(pl, 'sp-lh-pg'), has(pl, 'sp-lh-bar'), has(pl, 'Rows with callouts')], [false, false, false, true]);
    check('playlist: a done row is marked ✓, once', count(pl, '✓'), 1);
    check('playlist: the selected card opens the row and has no Mark button',
      [count(pl, 'Open row'), has(pl, 'sp-done-btn'), /sp-row-h[^<]*>Row 2<\/h3><span class="sp-tag">Current/.test(pl)], [1, false, true]);
    spViewedRow = 3;
    const pl2 = spPlaylistHtml(p, 1, rows.length, rows);
    spViewedRow = null;
    check('browsing: the selected card is the looked-at row and the current row is tagged',
      [has(pl2, '>Row 3</h3>'), /Row 3<\/h3><span class="sp-tag">Current/.test(pl2), count(pl2, 'class="sp-tag">Current')], [true, false, 1]);
    check('spFocusSelected is safe with nothing on screen', (() => { try { spFocusSelected(); return true; } catch (e) { return String(e); } })(), true);

    // ── Task 8: counts ──
    const fake = (sts, pass) => ({ def: { sts }, pass: pass || 1 });
    check('spCount reads a number', spCount(fake(41)), 41);
    check('spCount reads the pass from an array', [spCount(fake([66, 68, 70], 2)), spCount(fake([66, 68, 70], 3)), spCount(fake([66, 68], 3))], [68, 70, null]);
    check('spCount: zero counts, junk does not', [spCount(fake(0)), spCount(fake('41')), spCount(fake(NaN)), spCount(fake(undefined)), spCount(fake(Infinity)), spCount(fake([]))], [0, null, null, null, null, null]);
    check('spCount: no def, no throw', spCount({ pass: 1 }), null);
    const withCount = { def: { sts: 41 }, step: rows[0].step, n: 1, pass: 1, passes: 1, rowInPass: 1, R: 1 };
    check('a count shows in the card and in the playlist when present',
      [has(spPlayerCardHtml(p, withCount, 1, 3, false), '<b>41</b> sts'), has(spRowHtml(withCount, 5, 9), 'sp-row-c')], [true, true]);

    // ── Final review fixes ──
    const realFocus = spFocusSelected;
    let focused = 0;
    spFocusSelected = () => { focused++; };
    spSelectRow(2);
    spFocusSelected = realFocus; spViewedRow = null;
    check('tapping a row brings it into view', focused, 1);
    const prow = spRowsFor(PHASES[1]);
    const collapsed = spPlaylistHtml(PHASES[1], 8, prow.length, prow);
    check('a collapsed repeat line carries no v1 class names',
      ['sp-row-top', 'sp-row-lbl', 'sp-badge', 'sp-row-text'].map(c => has(collapsed, c)), [false, false, false, false]);
    check('a collapsed repeat line still reads as a done repeat', [has(collapsed, 'Repeat · 2 rows × 4'), has(collapsed, '✓')], [true, true]);

    // ── Repeat in the playlist: one card for the whole repeat ──
    const rPl = spPlaylistHtml(PHASES[1], 0, prow.length, prow);
    check('playlist repeat: one card with the pass line, the pass rows and one Open row',
      [count(rPl, 'Pass 1 of 4'), count(rPl, 'Open row'), count(rPl, 'sp-rrow sel'), count(rPl, 'spOpenPlayer(1)'), has(rPl, 'sp-stepper'), has(rPl, 'spPass(1)')], [1, 1, 1, 1, false, true]);
    spViewedRow = 2;
    const rPl2 = spPlaylistHtml(PHASES[1], 0, prow.length, prow);
    spViewedRow = null;
    check('the repeat card carries its own summary (rows x passes) in the label', [has(rPl, 'REPEAT · 2 ROWS × 4'), has(rPl, '4 passes × 2 rows')], [true, false]);
    check('the repeat label sits on its own line above the pass line',
      [rPl.indexOf('REPEAT · 2 ROWS × 4') < rPl.indexOf('sp-pass-line'), /sp-pass-line[^]*?<\/div>/.exec(rPl)[0].indexOf('REPEAT')], [true, -1]);
    check('playlist repeat: Open row follows the selected row of the repeat', [count(rPl2, 'spOpenPlayer(2)'), has(rPl2, 'spOpenPlayer(1)')], [1, false]);

    // ── Repeat modes: expanded only when it holds the selected row, like any other row ──
    spViewedRow = 9;
    const away = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    spViewedRow = null;
    check('repeat with the current row but the selection elsewhere: collapsed, tagged CURRENT ROW, and only one card is open',
      [has(away, 'sp-card--repeat'), count(away, 'Open row'), has(away, 'Repeat · 2 rows × 4'), has(away, 'class="sp-tag">Current'), has(away, 'Pass 2 of 4')], [false, 1, true, true, true]);
    const here = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    check('repeat holding the selection (the current row by default): expanded', [has(here, 'sp-card--repeat'), count(here, 'Open row')], [true, 1]);
    spViewedRow = 2;
    const other = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    spViewedRow = null;
    check('selecting a row of the repeat while the cursor is elsewhere expands it', has(other, 'sp-card--repeat'), true);

    // ── Stitches on this row and the stitch sheet ──
    const names = list => list.map(i => i.term);
    check('stitches found in a written instruction, in order, without English words',
      names(spStitchesInText('k2, yo, k2tog, *p1, k3* rep to end of row', 'Knitting', [])), ['Knit', 'Yarn over', 'Knit two together', 'Purl']);
    check('a pattern\'s own terms are found too, with the pattern\'s definition',
      spStitchesInText('Work DS, then k1', 'Knitting', [{ term: 'DS', def: 'Double stitch: turn and slip.' }]).map(i => i.term + '=' + i.def), ['DS=Double stitch: turn and slip.', 'Knit=' + glossaryEntry('k').def]);
    check('craft keeps tatting terms out of knitting rows', names(spStitchesInText('Join and R', 'Knitting', [])), []);
    check('nothing found: no items', spStitchesInText('Work in pattern to the end.', 'Knitting', []), []);
    const strip = spGlossaryBar(spStitchesInText('k2, yo, k2tog, p1, ssk', 'Knitting', []));
    check('the written-row strip lists the first three stitches, +N and a button that opens the stitch sheet',
      [has(strip, 'Knit'), has(strip, 'Yarn over'), has(strip, '+2'), has(strip, 'openStitchSheet()'), has(strip, 'openGlossary()')], [true, true, true, true, false]);
    check('the strip falls back to a label when no stitch is found', has(spGlossaryBar([]), 'Stitch glossary'), true);
    check('the chart legend button opens the stitch sheet too', [has(spLegendLine({ K: 1, P: 1 }), 'openStitchSheet()'), has(spLegendLine({ K: 1, P: 1 }), 'openGlossary()')], [true, false]);
    const sheet = spStitchSheetHtml(spStitchesInText('k2, yo', 'Knitting', []), [{ term: 'DS', def: 'Double stitch.' }]);
    check('the stitch sheet: this row, this pattern, and a link to the full glossary',
      [has(sheet, 'ON THIS ROW'), has(sheet, 'Yarn over'), has(sheet, 'IN THIS PATTERN'), has(sheet, 'Double stitch.'), has(sheet, 'Full glossary')], [true, true, true, true, true]);
    check('the stitch sheet with nothing on the row still offers the glossary', [has(spStitchSheetHtml([], []), 'ON THIS ROW'), has(spStitchSheetHtml([], []), 'Full glossary')], [false, true]);

    // ── Chart cells are always square: fixed size, the chart scrolls sideways ──
    const win = spChartWindowHtml(2, [], 'all', cp.chart);
    check('chart cells have a fixed size, never a stretchy minmax(…1fr) track',
      [has(win, 'minmax'), has(win, '1fr'), has(win, 'repeat(12, var(--h-cell))')], [false, false, true]);
    check('the playlist preview uses the smaller fixed square cell', [has(spChartWindowHtml(2, [], 1, cp.chart), 'repeat(12, var(--h-cell-mini))'), has(spChartWindowHtml(2, [], 1, cp.chart), 'minmax')], [true, false]);

    // ── Chart window: no vertical scroll, as many rows as fit; the nearer row-number column stays in view ──
    check('rows that fit a region height: at least 7, using every full row of room',
      [spChartRowsFor(100), spChartRowsFor(230), spChartRowsFor(400), spChartRowsFor(400, 28, 50)], [7, 7, 13, 12]);
    const w7 = spChartWindowHtml(6, [], { rows: 7 }, cp.chart), w8 = spChartWindowHtml(6, [], { rows: 8 }, cp.chart), wMax = spChartWindowHtml(6, [], { rows: 40 }, cp.chart);
    check('the window shows exactly the rows asked for (even counts too), clamped at the chart ends', [count(w7, 'class="sp-cw-row'), count(w8, 'class="sp-cw-row'), count(wMax, 'class="sp-cw-row')], [7, 8, 12]);
    check('the window holds the current row and clamps at both ends',
      [has(spChartWindowHtml(1, [], { rows: 7 }, cp.chart), 'sp-cw-row active'), count(spChartWindowHtml(1, [], { rows: 7 }, cp.chart), 'class="sp-cw-row'), count(spChartWindowHtml(12, [], { rows: 7 }, cp.chart), 'class="sp-cw-row'), has(spChartWindowHtml(12, [], { rows: 7 }, cp.chart), 'sp-cw-row active')], [true, 7, 7, true]);
    const oneRow = spChartWindowHtml(1, [], { rows: 1 }, cp.chart);
    check('a stitch has two states, default and current, set by the row: no per-cell highlight classes',
      [has(oneRow, 'sp-sym'), has(oneRow, 'sp-cw-row active')], [false, true]);
    check('which row-number column to keep in view: the nearer side',
      [spChartSideFor(0, 648, 375), spChartSideFor(273, 648, 375), spChartSideFor(136, 648, 375), spChartSideFor(0, 300, 375)], ['left', 'right', 'left', 'left']);

    // ── Small wins: whole-card tap, haptics, a short transition ──
    const cardRows = spRowsFor(p), selHtml = spPlaylistHtml(p, 0, cardRows.length, cardRows);
    check('the selected playlist card opens its row when tapped anywhere (not just the button)', [has(selHtml, 'class="ui-card sp-row selected"'), has(selHtml, 'spCardTap(event, 1)')], [true, true]);
    check('a repeat card opens on a tap too', has(spPlaylistHtml(PHASES[1], 0, prow.length, prow), 'spCardTap(event, 1)'), true);
    let opened = [];
    const realOpen = spOpenPlayer; spOpenPlayer = n => opened.push(n);
    spCardTap({ target: { closest: () => null } }, 3);
    spCardTap({ target: { closest: sel => (/button/.test(sel) ? {} : null) } }, 4);
    spOpenPlayer = realOpen;
    check('spCardTap opens the row, but leaves taps on buttons, toggles and repeat rows alone', opened, [3]);

    const buzz = []; const realNav = navigator.vibrate;
    navigator.vibrate = ms => { buzz.push(ms); return true; };
    uiHaptic(12);
    navigator.vibrate = undefined;
    let threw = false; try { uiHaptic(12); } catch (e) { threw = true; }
    navigator.vibrate = realNav;
    check('uiHaptic vibrates where the browser can, and is a quiet no-op where it cannot (iOS)', [buzz, threw], [[12], false]);

    const realHaptic = uiHaptic; let buzzes = 0; uiHaptic = () => { buzzes++; };
    setStepCursor(p, 0);
    spApplyCursor(p, 1);
    spApplyCursor(p, 0);
    uiHaptic = realHaptic; setStepCursor(p, 0);
    check('every change of progress gives haptic feedback', buzzes, 2);

    spNoteChange();
    check('a row change plays the transition once', [spTakeEnter(), spTakeEnter()], [true, false]);

    // ── ‹ › browsing eases in too ──
    spTakeEnter();
    const bp = PHASES[0]; cur = 0;
    spViewedRow = null; spBrowse(1);
    check('browsing with › eases the next row in', spTakeEnter(), true);
    spBrowse(-1);
    check('browsing with ‹ eases the previous row in', spTakeEnter(), true);
    spViewedRow = null; spTakeEnter();

    // ── Playlist scroll policy: stay put unless the current row would be cut off ──
    const V = { top: 100, bottom: 500 }, R = (top, bottom) => ({ top, bottom });
    check('no scroll while the selected row and a preview of the next are in view',
      spScrollDelta({ view: V, sel: R(200, 300), prev: R(150, 195), next: R(305, 360) }), { delta: 0, jump: false });
    check('the selected row last in view: scroll just enough to preview the next row',
      spScrollDelta({ view: V, sel: R(380, 470), prev: R(330, 375), next: R(475, 540) }), { delta: 475 + 48 + 8 - 500, jump: false });
    check('the selected row cut off at the bottom: scroll to show it whole and a preview of the next',
      spScrollDelta({ view: V, sel: R(430, 560), prev: R(380, 425), next: R(565, 620) }), { delta: 565 + 48 + 8 - 500, jump: false });
    check('the selected row cut off at the top: scroll back to it', spScrollDelta({ view: V, sel: R(60, 180), prev: R(10, 55), next: R(185, 240) }), { delta: 60 - 100 - 8, jump: false });
    check('a selected row nowhere in view: jump, with the row before it showing above',
      spScrollDelta({ view: V, sel: R(900, 1000), prev: R(850, 895), next: R(1005, 1060) }), { delta: 850 - 100 - 8, jump: true });
    check('the last row has no preview to make room for', spScrollDelta({ view: V, sel: R(400, 480), prev: R(350, 395), next: null }), { delta: 0, jump: false });
    check('a card taller than the view: show its top', spScrollDelta({ view: V, sel: R(150, 800), prev: R(100, 145), next: R(805, 860) }), { delta: 0, jump: false });
    check('a card taller than the view, starting above it: align its top', spScrollDelta({ view: V, sel: R(20, 700), prev: R(-30, 15), next: R(705, 760) }), { delta: 20 - 100 - 8, jump: false });

    // ── A narrow chart fills the width: cells grow, staying square ──
    check('cell size that makes a chart run the full width (24 px minimum, 40 px maximum)',
      [spChartCellFor(432, 12), spChartCellFor(432, 23), spChartCellFor(800, 12), spChartCellFor(375, 12), spChartCellFor(375, 8)], [29, 24, 40, 24, 35]);
    check('cells never shrink below the minimum even on a very narrow screen', spChartCellFor(200, 12), 24);

    // ── The playlist's main button follows the selected row, like the player's ──
    const total9 = prow.length;
    check('playlist dock: nothing selected elsewhere, it is the current row',
      [has(spPlaylistDock(2, total9), 'Mark row 3 done'), has(spPlaylistDock(2, total9), 'spDone(3)')], [true, true]);
    spViewedRow = 6;
    const ahead = spPlaylistDock(2, total9);
    spViewedRow = 2;
    const behind = spPlaylistDock(3, total9);
    spViewedRow = null;
    check('playlist dock: follows the selected row, even inside a repeat',
      [has(ahead, 'Mark row 6 done'), has(ahead, 'spDone(6)'), has(ahead, 'ui-dock-main--outline')], [true, true, false]);
    check('playlist dock: a selected row that is already done offers "not done" (outlined)',
      [has(behind, 'Mark row 2 not done'), has(behind, 'spMarkIncomplete(2)'), has(behind, 'ui-dock-main--outline')], [true, true, true]);
    spViewedRow = 2;
    const doneSection = spPlaylistDock(total9, total9);
    spViewedRow = null;
    check('playlist dock: a finished section still moves on once nothing is selected, and follows a selected row otherwise',
      [has(spPlaylistDock(total9, total9), 'Next section') || has(spPlaylistDock(total9, total9), 'Finished!'), has(doneSection, 'Mark row 2 not done')], [true, true]);

    // ── App shell: the document never scrolls on step screens ──
    check('playlist: everything under the bar lives in one scroll container',
      [count(pl, 'class="sp-scroll"'), pl.indexOf('ui-top') < pl.indexOf('sp-scroll'), pl.indexOf('sp-scroll') < pl.indexOf('sp-row')], [1, true, true]);
    check('checklist section: also inside the scroll container', count(spInnerHtml(PHASES[3]), 'class="sp-scroll"'), 1);

    // ── Glossary Back ──
    const gid = proj.id || proj;
    check('Back from the glossary returns to the project it was opened from',
      [glossaryReturnTo('project', gid), glossaryReturnTo('home', gid), glossaryReturnTo('project', null), glossaryReturnTo('project', 'nope')], [gid, null, null, null]);

    const realConfirm = sheetConfirm;
    let asked = null;
    sheetConfirm = o => { asked = o; };
    try {
      setStepCursor(p, 3);
      spMarkIncomplete(1);
      check('confirm copy for un-completing several rows', asked && [asked.title, asked.confirmLabel], ['Mark rows 1–3 not done?', 'Mark not done']);
      setStepCursor(p, 0); asked = null;
      spDone(3);
      check('confirm copy for marking rows ahead', asked && [asked.title, asked.confirmLabel], ['Mark rows 1–3 done?', 'Mark done']);
    } finally { sheetConfirm = realConfirm; setStepCursor(p, 0); }
  } finally {
    Object.keys(snap).forEach(k => localStorage.setItem(k, snap[k]));
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^pt3_/.test(k) && !(k in snap)) localStorage.removeItem(k); }
    cur = saved.cur;
  }

  const failed = results.filter(r => !r.ok);
  console.log('[stepViews selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  failed.forEach(f => console.log('FAIL', f.case, '\n  got ', f.got, '\n  want', f.want));
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

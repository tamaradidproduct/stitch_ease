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
    check('top bar: tally, PDF button, back, section menu',
      [has(bar, '2 / 3 rows'), has(bar, 'aria-label="Original pattern PDF"'), has(bar, 'goHome()'), has(bar, 'spOpenSectionSheet()')], [true, true, true, true]);
    setStepCursor(p, 2);
    spViewedRow = 1;
    check('player: a done row offers "not done"', has(spPlayerHtml(p, 2, rows.length, rows), 'Mark row 1 not done'), true);
    spViewedRow = null;
    check('playlist dock: records the current row', has(spPlaylistDock(2, rows.length), 'Mark row 3 done'), true);
    const rp = PHASES[1], rrows = spRowsFor(rp);
    check('repeat row: dock names the row and pass', has(spPlayerHtml(rp, 0, rrows.length, rrows), 'Mark R1 of pass 1 done'), true);

    // ── Task 5: player card and chart region ──
    const wHtml = spPlayerHtml(p, 0, rows.length, rows);
    check('card (no chart): row label once, CHECK shown, no count, no chart region',
      [count(wHtml, 'Row 1 of 3'), has(wHtml, 'CHECK'), has(wHtml, 'class="ui-count"'), has(wHtml, 'sp-chart-region')], [1, true, false, false]);
    check('the row heading sits above the card, outside it, in heading style',
      [wHtml.indexOf('sp-head') > -1, wHtml.indexOf('sp-head') < wHtml.indexOf('sp-card'), has(spPlayerCardHtml(p, rows[0], 1, 3, false), 'Row 1 of 3'), has(wHtml, 'ROW 1 OF 3')], [true, true, false, false]);
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
      [count(pl, 'Open row'), has(pl, 'sp-done-btn'), has(pl, 'ROW 2 · CURRENT')], [1, false, true]);
    spViewedRow = 3;
    const pl2 = spPlaylistHtml(p, 1, rows.length, rows);
    spViewedRow = null;
    check('browsing: the selected card is the looked-at row and the current row is tagged',
      [has(pl2, 'ROW 3<'), has(pl2, 'ROW 3 · CURRENT'), has(pl2, 'CURRENT ROW')], [true, false, true]);
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
    check('playlist repeat: Open row follows the selected row of the repeat', [count(rPl2, 'spOpenPlayer(2)'), has(rPl2, 'spOpenPlayer(1)')], [1, false]);

    // ── Repeat modes: expanded only when it holds the selected row, like any other row ──
    spViewedRow = 9;
    const away = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    spViewedRow = null;
    check('repeat with the current row but the selection elsewhere: collapsed, tagged CURRENT ROW, and only one card is open',
      [has(away, 'sp-card--repeat'), count(away, 'Open row'), has(away, 'Repeat · 2 rows × 4'), has(away, 'CURRENT ROW'), has(away, 'PASS 2 OF 4')], [false, 1, true, true, true]);
    const here = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    check('repeat holding the selection (the current row by default): expanded', [has(here, 'sp-card--repeat'), count(here, 'Open row')], [true, 1]);
    spViewedRow = 2;
    const other = spPlaylistHtml(PHASES[1], 2, prow.length, prow);
    spViewedRow = null;
    check('selecting a row of the repeat while the cursor is elsewhere expands it', has(other, 'sp-card--repeat'), true);

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

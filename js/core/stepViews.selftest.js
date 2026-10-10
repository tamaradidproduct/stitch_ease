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
      [count(wHtml, 'ROW 1 OF 3'), has(wHtml, 'CHECK'), has(wHtml, 'class="ui-count"'), has(wHtml, 'sp-chart-region')], [1, true, false, false]);
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
      [count(cHtml, 'ROW 3 OF 12'), count(cHtml, 'k2, yo, k2tog — authored override'), count(cHtml, 'sp-chart-region'), count(cHtml, 'aria-label="Glossary"')], [1, 1, 1, 1]);
    check('chart row: no old strip or hero markup', [has(cHtml, 'sp-strip'), has(cHtml, 'sp-hero'), has(cHtml, 'sp-next')], [false, false, false]);
    check('legend line truncates to Knit + 3 stitches and counts the rest',
      [has(spLegendLine({ K: 1, P: 1, YO: 1, K2: 1, SK: 1, M1: 1 }), 'Knit'), has(spLegendLine({ K: 1, P: 1, YO: 1, K2: 1, SK: 1, M1: 1 }), '+2'), has(spLegendLine({ K: 1, P: 1 }), '+')], [true, true, false]);

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

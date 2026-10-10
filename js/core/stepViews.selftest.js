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
    check('player: dock labelled for the current row', has(spPlayerHtml(p, 0, rows.length, rows), 'Done row 1'), true);
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

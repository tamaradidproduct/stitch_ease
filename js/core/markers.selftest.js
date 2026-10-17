// ─────────────────────────────────────────────
// SELF-TEST for the row-marker model (js/core/markers.js). Not shipped.
// Load js/core/steps.demo.selftest.js first, then this file, then call
// markersSelfTest(). It makes a step-demo project and restores every pt3_* key.
// ─────────────────────────────────────────────
function markersSelfTest() {
  const results = [];
  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }

  const snap = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^pt3_/.test(k)) snap[k] = localStorage.getItem(k); }
  const saved = { cur };
  try {
    const proj = createProject('step-demo');
    activateProject(proj.id || proj);
    cur = 0;
    const p = PHASES[0];
    const tomb = { t: '', x: '' };

    check('normalize: trims text', normalizeMarker({ t: 'lifeline', x: '  in at 253  ' }), { t: 'lifeline', x: 'in at 253' });
    check('normalize: unknown type is a tombstone', normalizeMarker({ t: 'banana', x: 'y' }), tomb);
    check('normalize: null and strings are tombstones', [normalizeMarker(null), normalizeMarker('<img>')], [tomb, tomb]);
    check('normalize: text clamped to 120', normalizeMarker({ t: 'note', x: 'a'.repeat(200) }).x.length, 120);
    check('normalize: non-string text coerced', normalizeMarker({ t: 'note', x: 42 }).x, '42');
    check('normalize: whitespace-only text is empty', normalizeMarker({ t: 'note', x: '   ' }).x, '');
    check('normalize: a tombstone drops its text', normalizeMarker({ t: '', x: 'left over' }), tomb);

    check('markerKey', markerKey('sd-written', 2), 'mk:sd-written:2');

    check('setMarker saves a lifeline', [setMarker(p, 2, 'lifeline', 'in at 253'), markerAt(p, 2)], [true, { t: 'lifeline', x: 'in at 253' }]);
    check('setMarker stamps a clock', typeof clocks[markerKey(p.id, 2)], 'number');
    check('setMarker refuses a bad type or out-of-range row', [setMarker(p, 2, 'banana', ''), setMarker(p, 99, 'note', '')], [false, false]);
    check('setMarker with blank text keeps the type', [setMarker(p, 3, 'note', '   '), markerAt(p, 3)], [true, { t: 'note', x: '' }]);

    clearMarker(p, 2);
    check('clearMarker leaves a tombstone, not a hole', [markerAt(p, 2), entryProg[markerKey(p.id, 2)]], [null, tomb]);
    const before = JSON.stringify(entryProg);
    clearMarker(p, 1);
    check('clearMarker on an unmarked row is a no-op', JSON.stringify(entryProg), before);

    entryProg[markerKey(p.id, 99)] = { t: 'note', x: 'stale' };
    check('a marker past the last row is ignored', markerAt(p, 99), null);

    const rows = spRows(p);
    check('blockMarker prefers a lifeline', [setMarker(p, 1, 'note', 'a'), setMarker(p, 2, 'lifeline', 'b'), blockMarker(rows).t], [true, true, 'lifeline']);
    check('blockMarker is null when none are marked', blockMarker([{ n: 98, step: {} }]), null);

    // A whole-project reset empties entryProg: every live marker must come back as a stamped tombstone,
    // or the other device keeps it and pushes it back.
    clearMarker(p, 3);   // a tombstone is not listed
    const live = markerKeys();
    check('markerKeys lists every live marker (even one past the last row), not tombstones', live.sort(), [1, 2, 99].map(n => markerKey(p.id, n)));
    entryProg = {};
    delete clocks[markerKey(p.id, 1)];
    tombstoneMarkers(live);
    check('after a reset every marker is a stamped tombstone',
      [markerAt(p, 1), markerAt(p, 2), entryProg[markerKey(p.id, 1)], typeof clocks[markerKey(p.id, 1)]], [null, null, tomb, 'number']);
  } finally {
    Object.keys(snap).forEach(k => localStorage.setItem(k, snap[k]));
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^pt3_/.test(k) && !(k in snap)) localStorage.removeItem(k); }
    cur = saved.cur;
  }

  const failed = results.filter(r => !r.ok);
  console.log('[markers selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  failed.forEach(f => console.log('FAIL', f.case, '\n  got ', f.got, '\n  want', f.want));
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

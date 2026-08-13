// ─────────────────────────────────────────────
// SELF-TEST for diffProgress(). Not shipped.
//
// Deliberately absent from index.html and from the service worker precache, so
// it costs the app nothing. To run it, from the console on a loaded page:
//
//   const s = document.createElement('script');
//   s.src = 'js/cloud/sync.selftest.js';
//   document.body.append(s);
//
// then call syncSelfTest(). It logs a table and returns {passed, failed}.
//
// The merge is the one piece of sync whose bugs are silent: a wrong answer
// here does not throw, it quietly drops a row someone knitted. So the cases
// below are the specification, not a smoke test — each row of the §B decision
// table, plus the ones that table does not obviously cover.
// ─────────────────────────────────────────────
function syncSelfTest() {
  const results = [];

  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }

  // Shorthand: t0 is the baseline moment, t1 is later.
  const t0 = 1000, t1 = 2000, t2 = 3000;

  // ── The five rows of the decision table ──

  // 1. Neither side changed since the baseline.
  check('neither changed → untouched, no prompt',
    (() => {
      const r = diffProgress(
        { values: { 's:a': true }, clocks: { 's:a': t0 } },
        { values: { 's:a': false }, clocks: { 's:a': t0 } },   // remote differs but is stale
        { 's:a': t0 });
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': true }, conflicts: 0 });

  // 2. Local moved, remote did not.
  check('local only → keep local',
    (() => {
      const r = diffProgress(
        { values: { 's:a': true }, clocks: { 's:a': t1 } },
        { values: { 's:a': false }, clocks: { 's:a': t0 } },
        { 's:a': t0 });
      return { merged: r.merged, clock: r.mergedClocks['s:a'], conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': true }, clock: t1, conflicts: 0 });

  // 3. Remote moved, local did not.
  check('remote only → take remote, adopt its clock',
    (() => {
      const r = diffProgress(
        { values: { 's:a': false }, clocks: { 's:a': t0 } },
        { values: { 's:a': true }, clocks: { 's:a': t1 } },
        { 's:a': t0 });
      return { merged: r.merged, clock: r.mergedClocks['s:a'], conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': true }, clock: t1, conflicts: 0 });

  // 4. Both moved to different values.
  check('both changed, values differ → conflict, merged keeps local',
    (() => {
      const r = diffProgress(
        { values: { 'cr:yoke': 31 }, clocks: { 'cr:yoke': t1 } },
        { values: { 'cr:yoke': 23 }, clocks: { 'cr:yoke': t2 } },
        { 'cr:yoke': t0 });
      return { merged: r.merged, conflicts: r.conflicts };
    })(),
    { merged: { 'cr:yoke': 31 },
      conflicts: [{ key: 'cr:yoke', local: 31, remote: 23, localClock: t1, remoteClock: t2 }] });

  // 5. Both moved, but landed on the same value.
  check('both changed, values equal → no prompt, newest clock',
    (() => {
      const r = diffProgress(
        { values: { 'c:x': 12 }, clocks: { 'c:x': t1 } },
        { values: { 'c:x': 12 }, clocks: { 'c:x': t2 } },
        { 'c:x': t0 });
      return { merged: r.merged, clock: r.mergedClocks['c:x'], conflicts: r.conflicts.length };
    })(),
    { merged: { 'c:x': 12 }, clock: t2, conflicts: 0 });

  // ── The case the whole design exists for ──

  // Disjoint edits must merge in silence: three steps ticked on the phone
  // while the iPad sat on the chart.
  check('disjoint fields → both survive, nothing to ask',
    (() => {
      const r = diffProgress(
        { values: { 's:m1': true, 's:m2': true, 's:m3': true, 'cr:yoke': 1 },
          clocks: { 's:m1': t1, 's:m2': t1, 's:m3': t1, 'cr:yoke': t0 } },
        { values: { 's:m1': false, 's:m2': false, 's:m3': false, 'cr:yoke': 31 },
          clocks: { 's:m1': t0, 's:m2': t0, 's:m3': t0, 'cr:yoke': t1 } },
        { 's:m1': t0, 's:m2': t0, 's:m3': t0, 'cr:yoke': t0 });
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:m1': true, 's:m2': true, 's:m3': true, 'cr:yoke': 31 }, conflicts: 0 });

  // Chart rows are keyed per phase (chartRowKey). A pattern can have several
  // charts — Frost Flower has a gauge swatch and a raglan — and two devices
  // sitting on DIFFERENT charts are not in conflict. Under a single shared
  // 'chart_row' key they would have been, and merging would have jumped
  // somebody to a row of a chart they were not knitting.
  check('different chart phases → independent, no conflict',
    (() => {
      const r = diffProgress(
        { values: { 'cr:swatch': 14, 'cr:raglan': 1 }, clocks: { 'cr:swatch': t1, 'cr:raglan': t0 } },
        { values: { 'cr:swatch': 1, 'cr:raglan': 9 }, clocks: { 'cr:swatch': t0, 'cr:raglan': t1 } },
        { 'cr:swatch': t0, 'cr:raglan': t0 });
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 'cr:swatch': 14, 'cr:raglan': 9 }, conflicts: 0 });

  // ── Baselines ──

  // Empty base = never synced. Both sides read as changed, so genuinely
  // differing values ARE conflicts — the devices have never agreed on
  // anything. This is why migrateAddClocks() writes base = clocks: a migrated
  // device reads as having nothing pending, so it takes remote cleanly instead
  // of conflicting on every field it has ever touched.
  check('empty base → differing values conflict',
    (() => {
      const r = diffProgress(
        { values: { 's:a': true }, clocks: { 's:a': t1 } },
        { values: { 's:a': false }, clocks: { 's:a': t1 } },
        {});
      return { conflicts: r.conflicts.length };
    })(),
    { conflicts: 1 });

  check('migrated base (base == clocks) → remote taken cleanly',
    (() => {
      const clocks = { 's:a': t0, 'c:b': t0 };
      const r = diffProgress(
        { values: { 's:a': false, 'c:b': 0 }, clocks: clocks },
        { values: { 's:a': true, 'c:b': 7 }, clocks: { 's:a': t1, 'c:b': t1 } },
        clocks);                                  // base identical to local clocks
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': true, 'c:b': 7 }, conflicts: 0 });

  // ── Cases the table does not spell out ──

  // Equal clocks, different values: neither side is demonstrably later, so
  // picking one would be a coin flip presented as a decision.
  check('clock tie, values differ → conflict, not a guess',
    (() => {
      const r = diffProgress(
        { values: { chart_row: 5 }, clocks: { chart_row: t1 } },
        { values: { chart_row: 9 }, clocks: { chart_row: t1 } },
        { chart_row: t0 });
      return { conflicts: r.conflicts.length };
    })(),
    { conflicts: 1 });

  // A field this device has never heard of (created on the other device).
  check('key only on remote → adopted',
    (() => {
      const r = diffProgress(
        { values: {}, clocks: {} },
        { values: { 's:new': true }, clocks: { 's:new': t1 } },
        {});
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:new': true }, conflicts: 0 });

  // A clock with no value behind it is malformed. Acting on the timestamp
  // alone would delete a field the user still has.
  check('remote clock with no value → ignored, local kept',
    (() => {
      const r = diffProgress(
        { values: { 's:a': true }, clocks: { 's:a': t0 } },
        { values: {}, clocks: { 's:a': t1 } },
        { 's:a': t0 });
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': true }, conflicts: 0 });

  // A local-only field (created offline here) must not be dropped.
  check('key only on local → survives untouched',
    (() => {
      const r = diffProgress(
        { values: { 's:mine': true }, clocks: { 's:mine': t1 } },
        { values: {}, clocks: {} },
        {});
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:mine': true }, conflicts: 0 });

  // Falsy values are real values. `false` and `0` must not be treated as
  // absent — unticking a step and zeroing a counter are edits.
  check('falsy values are real → false and 0 propagate',
    (() => {
      const r = diffProgress(
        { values: { 's:a': true, 'c:b': 5 }, clocks: { 's:a': t0, 'c:b': t0 } },
        { values: { 's:a': false, 'c:b': 0 }, clocks: { 's:a': t1, 'c:b': t1 } },
        { 's:a': t0, 'c:b': t0 });
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: { 's:a': false, 'c:b': 0 }, conflicts: 0 });

  // Purity: the inputs must come back untouched, or a failed sync would leave
  // the caller's live state half-merged.
  check('inputs not mutated',
    (() => {
      const localVals = { 's:a': true }, localClocks = { 's:a': t0 }, base = { 's:a': t0 };
      diffProgress({ values: localVals, clocks: localClocks },
                   { values: { 's:a': false }, clocks: { 's:a': t1 } }, base);
      return { localVals, localClocks, base };
    })(),
    { localVals: { 's:a': true }, localClocks: { 's:a': t0 }, base: { 's:a': t0 } });

  // Degenerate inputs: a first pull with nothing on either side.
  check('empty everything → empty result',
    (() => {
      const r = diffProgress({ values: {}, clocks: {} }, { values: {}, clocks: {} }, {});
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: {}, conflicts: 0 });

  check('missing arguments → no throw',
    (() => {
      const r = diffProgress(null, undefined, null);
      return { merged: r.merged, conflicts: r.conflicts.length };
    })(),
    { merged: {}, conflicts: 0 });

  // ── Field-key adapters ──
  //
  // These convert between the three shapes the same progress lives in
  // (localStorage buckets / flat field keys / Postgres columns). A wrong answer
  // here is as silent as a wrong merge: the merge would compare a counter of 3
  // against the string "3" and call it a conflict the user never made.

  check('splitFields → bucketed shape, types preserved',
    splitFields({ 's:a': true, 's:b': false, 'c:a': 12, 'cr:yoke': 31, 'cr:swatch': 4,
                  cur: 2, global_rows: 97 }),
    { steps: { a: true, b: false }, counters: { a: 12 },
      cur: 2, chart_rows: { yoke: 31, swatch: 4 }, global_rows: 97 });

  // A key from a newer version of the app: dropped, not guessed at. Inventing
  // a bucket for it would write nonsense that a later version has to unpick.
  check('splitFields drops unknown prefixes',
    splitFields({ 's:a': true, 'zz:mystery': 9 }),
    { steps: { a: true }, counters: {}, cur: 0, chart_rows: {}, global_rows: 0 });

  check('joinFields → flat field keys',
    joinFields({ steps: { a: true, b: false }, counters: { a: 12 },
                 cur: 2, chart_rows: { yoke: 31 }, global_rows: 97,
                 clocks: { 's:a': t1 } }),
    { values: { 's:a': true, 's:b': false, 'c:a': 12, 'cr:yoke': 31, cur: 2, global_rows: 97 },
      clocks: { 's:a': t1 } });

  // Postgres column defaults mean a freshly-inserted row arrives with empty
  // objects and no clocks at all; that must read as "nothing set", not throw.
  check('joinFields on a defaulted/empty row',
    joinFields({ steps: {}, counters: {}, cur: 0, chart_rows: {}, global_rows: 0, clocks: {} }),
    { values: { cur: 0, global_rows: 0 }, clocks: {} });

  check('joinFields on a missing row → no throw',
    joinFields(null),
    { values: { cur: 0, global_rows: 0 }, clocks: {} });

  // The round trip is what actually has to hold: a merged result written to
  // the server and pulled back by the other device must be the same values.
  check('splitFields → joinFields round trip',
    (() => {
      const values = { 's:a': true, 's:b': false, 'c:a': 12, 'c:b': 0,
                       'cr:yoke': 31, cur: 2, global_rows: 97 };
      return joinFields(splitFields(values)).values;
    })(),
    { 's:a': true, 's:b': false, 'c:a': 12, 'c:b': 0, 'cr:yoke': 31, cur: 2, global_rows: 97 });

  // The failure this guards against: localStorage hands back strings, so a
  // counter that went through the buckets and came back as "12" would compare
  // unequal to the remote 12 and be reported as a conflict on every sync.
  check('round trip keeps ints as ints, not strings',
    (() => {
      const v = joinFields(splitFields({ 'c:a': 12, cur: 2, global_rows: 97 })).values;
      return [typeof v['c:a'], typeof v.cur, typeof v.global_rows];
    })(),
    ['number', 'number', 'number']);

  const failed = results.filter(r => !r.ok);
  console.table(results.map(r => ({ case: r.case, ok: r.ok })));
  failed.forEach(f => console.error('FAIL ' + f.case + '\n  got  ' + f.got + '\n  want ' + f.want));
  console.info('[sync selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

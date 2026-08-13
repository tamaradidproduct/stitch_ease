// ─────────────────────────────────────────────
// SELF-TEST for the sections/rows/repeats model (js/core/rows.js). Not shipped.
//
// Deliberately absent from index.html and from the service worker precache, so
// it costs the app nothing. To run it, from the console on a loaded page:
//
//   const s = document.createElement('script');
//   s.src = 'js/core/rows.selftest.js';
//   document.body.append(s);
//
// then call rowsSelfTest(). It logs a table and returns {passed, failed}.
//
// As of step 3 every pattern is converted, so the fixtures are the REAL shipped
// sections rather than copies — a copy would quietly stop testing what ships
// the moment the two drifted. The only hand-written fixtures left are the
// pre-conversion shapes, kept so the fallback that frozen snapshots still rely
// on stays covered, and so the row-count changes the conversion introduced stay
// pinned rather than merely happening.
// ─────────────────────────────────────────────
function rowsSelfTest() {
  const results = [];

  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }
  const sec = (pat, id) => pat.phases.find(p => p.id === id);

  const PEACOCK = patternById('peacock-tee');
  const TAT     = patternById('tatted-triangle');
  const LENORE  = patternById('lenore');
  const FROST   = patternById('frost-flower-cardigan');

  const COL   = sec(PEACOCK, 'col');
  const GSR   = sec(PEACOCK, 'gsr');
  const RAG   = sec(PEACOCK, 'rag');
  const BODY  = sec(PEACOCK, 'body');
  const SLV   = sec(PEACOCK, 'slv');
  const TAT1  = sec(TAT, 'tat-t1');
  const ROW1  = sec(LENORE, 'len-row1');

  const REP_C2 = COL.entries.find(e => e.id === 'c2');    // R=1, times 7
  const REP_R2 = RAG.entries.find(e => e.id === 'r2');    // R=2, times 4 — was the cadence step
  const REP_QR = ROW1.entries.find(e => e.id === 'r1-qr');// R=2, times 11, legacyCount 'passes'

  // The pre-conversion shapes. Not history for its own sake: every project
  // frozen before step 3 still renders through the legacy branch of
  // sectionRowCount(), so it has to keep working.
  const LEGACY_COL = { id: 'col', steps: [
    { id: 'c1', text: 'Cast on 88 sts' },
    { id: 'c2', text: 'Work 7 rounds k1, p1 rib', rows: true, target: 7, lbl: 'rib rounds' },
    { id: 'c3', text: 'Increase round → 99 sts' },
    { id: 'c4', text: 'Switch to 4 mm circular needle' },
  ] };
  const LEGACY_GSR = { id: 'gsr', steps: [
    { id: 'g1' }, { id: 'g2' }, { id: 'g3' }, { id: 'g4' }, { id: 'g5' }, { id: 'g6' }, { id: 'g7' },
  ] };
  const LEGACY_CHART = { id: 'chart', hasChart: true, steps: [{ id: 'ch2', postChart: true }] };
  const LEGACY_TAT1  = { id: 'tat-t1', countable: true, steps: TAT1.entries.map(e => ({ id: e.id })) };
  const LEGACY_PEACOCK = { id: 'legacy-peacock', chart: PEACOCK.chart,
                           phases: [LEGACY_COL, LEGACY_GSR, LEGACY_CHART] };

  // ── A. Row counts, per section ──

  check('collar: 7 rib rounds + 1 increase round = 8 rows',
    sectionRowCount(COL, PEACOCK), 8);
  check('short rows: seven rows',
    sectionRowCount(GSR, PEACOCK), 7);
  check('raglan: notes contribute nothing, 4 passes × 2 rows = 8',
    sectionRowCount(RAG, PEACOCK), 8);
  check('chart section: its rows are the chart\'s 44, the confirm note adds none',
    sectionRowCount(sec(PEACOCK, 'chart'), PEACOCK), 44);
  check('body: 1 divide round + 70 stockinette + 14 rib (b3/b5 are notes)',
    sectionRowCount(BODY, PEACOCK), 85);
  check('sleeves: 27 + 5, the "at 5 cm" decreases are notes inside them',
    sectionRowCount(SLV, PEACOCK), 32);
  check('tat-t1: 25 rings and chains, one row each',
    sectionRowCount(TAT1, TAT), 25);
  check('lenore row 1: 16 singles + (3×6) + (2×6) + (11×2)',
    sectionRowCount(ROW1, LENORE), 68);

  // ── B. Whole-pattern totals ──
  //
  // Pinned so a stray edit to a `times` shows up here rather than as a header
  // that quietly reads differently.

  check('pattern totals after conversion',
    PATTERNS.map(p => p.id + '=' + patternRowTotal(p)),
    ['peacock-tee=184', 'tatted-triangle=50', 'lenore=132', 'frost-flower-cardigan=50']);
  check('the shipped patternTotalRows() agrees with the derived total',
    PATTERNS.map(p => legacyTotalFor(p)), PATTERNS.map(p => patternRowTotal(p)));

  // ── C. The legacy branch still serves frozen snapshots ──

  check('legacy sections still count the old way',
    [sectionRowCount(LEGACY_COL, LEGACY_PEACOCK),
     sectionRowCount(LEGACY_GSR, LEGACY_PEACOCK),
     sectionRowCount(LEGACY_CHART, LEGACY_PEACOCK),
     sectionRowCount(LEGACY_TAT1, LEGACY_PEACOCK)],
    [7, 0, 44, 25]);
  check('a frozen snapshot totals what it always did',
    patternRowTotal(LEGACY_PEACOCK), 51);

  // ── D. Where the conversion DELIBERATELY changed the count ──
  //
  // The old tally only counted row-counter targets, chart rows and countable
  // steps. A plain step that was genuinely one round counted nothing, and a
  // repeat-unit step counted one per motif rather than one per ring. Both are
  // corrections, but they mean the header total legitimately moved.

  check('collar: old 7 (counter only) → new 8 (+ the increase round)',
    [sectionRowCount(LEGACY_COL, LEGACY_PEACOCK), sectionRowCount(COL, PEACOCK)], [7, 8]);
  check('short rows: old 0 (no counters at all) → new 7',
    [sectionRowCount(LEGACY_GSR, LEGACY_PEACOCK), sectionRowCount(GSR, PEACOCK)], [0, 7]);
  check('tat-t1 unchanged: countable already counted one per step',
    [sectionRowCount(LEGACY_TAT1, LEGACY_PEACOCK), sectionRowCount(TAT1, TAT)], [25, 25]);
  check('lenore Ring Q–Chain R: old 11 (motifs) → new 22 (rings and chains)',
    [11, repeatRowCount(REP_QR)], [11, 22]);

  // ── E. The full walk, forward then back ──
  //
  // The doc's requirement: a knitter who taps + once too often must be able to
  // tap − once and land exactly where they were.

  const forward = (() => {
    const seen = [];
    let p = { y: 0, z: 1 };
    seen.push([p.y, p.z, repeatRowsDone(REP_R2, p)]);
    for (let i = 0; i < 10; i++) {           // 8 real rows + 2 over-taps
      p = advanceRepeat(REP_R2, p, 1);
      seen.push([p.y, p.z, repeatRowsDone(REP_R2, p)]);
    }
    return seen;
  })();

  check('raglan walk: (y,z,done) for +1 × 10 from the start, clamping at 8',
    forward, [
      [0, 1, 0],  // standing on plain round 1, nothing done
      [0, 2, 1],  // increase round of pass 1
      [1, 1, 2],  // pass 1 finished
      [1, 2, 3],
      [2, 1, 4],
      [2, 2, 5],
      [3, 1, 6],
      [3, 2, 7],
      [4, 1, 8],  // all four passes done
      [4, 1, 8],  // over-tap: clamped, not {y:5}
      [4, 1, 8],
    ]);

  // Mirror the nine REAL positions only. The over-taps are excluded on both
  // sides because clamping is not symmetric under reversal — it pins the end
  // of whichever direction you walked.
  check('raglan walk back visits the same nine positions in reverse',
    (() => {
      const seen = [];
      let p = { y: 4, z: 1 };
      seen.push([p.y, p.z, repeatRowsDone(REP_R2, p)]);
      for (let i = 0; i < 8; i++) {
        p = advanceRepeat(REP_R2, p, -1);
        seen.push([p.y, p.z, repeatRowsDone(REP_R2, p)]);
      }
      return seen;
    })(),
    forward.slice(0, 9).reverse());

  check('+1 then −1 returns to the identical position, across a pass boundary',
    (() => {
      const at = { y: 0, z: 2 };
      const fwd = advanceRepeat(REP_R2, at, 1);
      return [fwd, advanceRepeat(REP_R2, fwd, -1)];
    })(),
    [{ y: 1, z: 1 }, { y: 0, z: 2 }]);

  // ── F. Boundaries and clamping ──

  check('off the front of pass 0 clamps, no y:-1',
    advanceRepeat(REP_R2, { y: 0, z: 1 }, -1), { y: 0, z: 1 });
  check('past the last row of the last pass clamps',
    advanceRepeat(REP_R2, { y: 4, z: 1 }, 1), { y: 4, z: 1 });
  check('z = R, +1 → next pass, row 1',
    advanceRepeat(REP_R2, { y: 1, z: 2 }, 1), { y: 2, z: 1 });
  check('z = 1, −1 → previous pass, row R',
    advanceRepeat(REP_R2, { y: 2, z: 1 }, -1), { y: 1, z: 2 });
  check('completion is y === times, z pinned to 1',
    [repeatComplete(REP_R2, { y: 4, z: 1 }), repeatComplete(REP_R2, { y: 3, z: 2 })],
    [true, false]);
  check('a junk stored position is clamped, not trusted',
    [clampRepeatPos(REP_R2, { y: 99, z: 99 }), clampRepeatPos(REP_R2, undefined),
     clampRepeatPos(REP_R2, { y: -3, z: 0 })],
    [{ y: 4, z: 1 }, { y: 0, z: 1 }, { y: 0, z: 1 }]);
  check('a multi-step delta lands where the same number of single taps would',
    advanceRepeat(REP_R2, { y: 0, z: 1 }, 5),
    (() => { let p = { y: 0, z: 1 }; for (let i = 0; i < 5; i++) p = advanceRepeat(REP_R2, p, 1); return p; })());

  // ── G. R = 1, via the collar's rib repeat ──

  check('R=1: seven advances walk y 0→7 with z pinned at 1',
    (() => {
      const seen = [];
      let p = { y: 0, z: 1 };
      for (let i = 0; i < 8; i++) { seen.push([p.y, p.z]); p = advanceRepeat(REP_C2, p, 1); }
      return seen;
    })(),
    [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]]);
  check('R=1: rows done equals passes done',
    [repeatRowsDone(REP_C2, { y: 0, z: 1 }), repeatRowsDone(REP_C2, { y: 4, z: 1 }),
     repeatRowsDone(REP_C2, { y: 7, z: 1 })],
    [0, 4, 7]);

  // ── H. Absolute row ──
  //
  // Rows before the raglan repeat: materials 0 + collar 8 + short rows 7 +
  // chart 44 = 59, plus the r1 note (0). So pass 1 row 1 is pattern row 60.

  check('rows before the raglan repeat = 0 + 8 + 7 + 44',
    rowsBeforeEntry(PEACOCK, 'rag', 'r2'), 59);
  check('pass 1 row 1 is pattern row 60',
    absoluteRow(PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 0, z: 1 } }), 60);
  check('pass 2 row 1 is pass 1 row 1 + R — the doc arithmetic',
    absoluteRow(PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 1, z: 1 } }),
    absoluteRow(PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 0, z: 1 } }) + repeatLength(REP_R2));
  check('the collar increase round is pattern row 8',
    absoluteRow(PEACOCK, 'col', 'c3', {}), 8);
  check('absolute row is rows-done + 1 for the same position',
    (() => {
      const pr = { 'rp:r2': { y: 2, z: 2 } };
      return absoluteRow(PEACOCK, 'rag', 'r2', pr) - (59 + repeatRowsDone(REP_R2, pr['rp:r2']));
    })(), 1);
  check('a note has no absolute row, and unknown ids are null not 0',
    [absoluteRow(PEACOCK, 'rag', 'r1', {}),
     absoluteRow(PEACOCK, 'rag', 'nope', {}),
     rowsBeforeEntry(PEACOCK, 'nope', 'r2')],
    [null, null, null]);

  // ── I. Done-counts meet the totals ──

  check('empty progress: nothing done anywhere',
    [sectionRowsDone(COL, {}), sectionRowsDone(RAG, {}), sectionRowsDone(GSR, {})],
    [0, 0, 0]);
  check('fully worked collar: rows done equals row count, section complete',
    (() => {
      const pr = { 'n:c1': true, 'rp:c2': { y: 7, z: 1 }, 'r:c3': true, 'n:c4': true };
      return [sectionRowsDone(COL, pr), sectionRowCount(COL, PEACOCK), sectionComplete(COL, pr)];
    })(),
    [8, 8, true]);
  check('a finished repeat with an unticked note: rows done, section not complete',
    (() => {
      const pr = { 'n:r1': true, 'rp:r2': { y: 4, z: 1 } };   // r3 note left unticked
      return [sectionRowsDone(RAG, pr), sectionComplete(RAG, pr)];
    })(),
    [8, false]);
  check('notes never add rows, however many are ticked',
    sectionRowsDone(RAG, { 'n:r1': true, 'n:r3': true }), 0);
  check('mid-repeat: standing on row 1 of pass 3 = 4 rows done',
    sectionRowsDone(RAG, { 'rp:r2': { y: 2, z: 1 } }), 4);

  // ── J. The legacy read-through ──
  //
  // Converted sections keep their ids, so a project mid-section must not appear
  // to lose it. The failure this guards against is silent: nothing throws when
  // a tick simply is not rendered.

  check('a pre-conversion collar reads through: ticks and counter both land',
    seedEntryProgress({}, { c1: true, c3: true }, { c2: 4 }, [COL]),
    { 'n:c1': true, 'rp:c2': { y: 4, z: 1 }, 'r:c3': true });
  check('R=1 makes the counter → position mapping exact, not lossy',
    repeatRowsDone(REP_C2, seedEntryProgress({}, {}, { c2: 5 }, [COL])['rp:c2']), 5);
  check('an entry that already has a value is left alone',
    seedEntryProgress({ 'rp:c2': { y: 1, z: 1 } }, {}, { c2: 6 }, [COL])['rp:c2'],
    { y: 1, z: 1 });
  check('an explicit reset survives the read-through — the key exists, so it wins',
    seedEntryProgress({ 'n:c1': false, 'rp:c2': { y: 0, z: 1 } }, { c1: true }, { c2: 4 }, [COL]),
    { 'n:c1': false, 'rp:c2': { y: 0, z: 1 } });
  check('nothing to read through leaves an untouched project empty',
    seedEntryProgress({}, {}, {}, [COL]), {});

  // ── K. Passes vs rows: the trap Lenore exposed ──
  //
  // The old counter meant ROWS on a plain counter step and on the cadence
  // step, but PASSES on a repeat-unit step (counter + bullets). On a
  // single-row repeat those coincide, which is why it went unnoticed until a
  // motif six rings long turned up.

  check('a passes-counter seeds y directly: 5 motifs of 2 = 10 rows, not 5',
    (() => {
      const pos = seedEntryProgress({}, {}, { 'r1-qr': 5 }, [ROW1])['rp:r1-qr'];
      return [pos, repeatRowsDone(REP_QR, pos)];
    })(),
    [{ y: 5, z: 1 }, 10]);
  check('reading that same counter as rows would land less than half as far',
    repeatRowsDone(REP_QR, repeatPosFromRowsDone(REP_QR, 5)), 5);
  check('half-worked motif: the old bullets restore the position inside the pass',
    (() => {
      const legacyState = { 'r1-qr__b0': true };            // Ring Q done, Chain R not
      const pos = seedEntryProgress({}, legacyState, { 'r1-qr': 5 }, [ROW1])['rp:r1-qr'];
      return [pos, repeatRowsDone(REP_QR, pos)];
    })(),
    [{ y: 5, z: 2 }, 11]);
  check('a rows-counter (the old cadence step) is NOT read as passes',
    (() => {
      const pos = seedEntryProgress({}, {}, { r2: 5 }, [RAG])['rp:r2'];
      return [pos, repeatRowsDone(REP_R2, pos)];
    })(),
    [{ y: 2, z: 2 }, 5]);
  check('a passes-counter at its target clamps to complete, not past it',
    seedEntryProgress({}, {}, { 'r1-qr': 99 }, [ROW1])['rp:r1-qr'], { y: 11, z: 1 });

  const failed = results.filter(r => !r.ok);
  console.table(results.map(r => ({ case: r.case, ok: r.ok })));
  failed.forEach(f => console.error('FAIL ' + f.case + '\n  got  ' + f.got + '\n  want ' + f.want));
  console.info('[rows selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

// Run the SHIPPED patternTotalRows() against an arbitrary pattern. It reads
// the PHASES / activeDoc globals, so they are swapped and restored — in a
// finally, because a throw here would otherwise leave the running app pointed
// at the wrong pattern.
function legacyTotalFor(pattern) {
  const savedPhases = PHASES, savedId = activePatternId, savedDoc = activeDoc;
  try {
    PHASES = pattern.phases;
    activePatternId = pattern.id;
    activeDoc = pattern;
    return patternTotalRows();
  } finally {
    PHASES = savedPhases;
    activePatternId = savedId;
    activeDoc = savedDoc;
  }
}

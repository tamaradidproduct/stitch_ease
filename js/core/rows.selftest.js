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
// The fixtures below are REAL sections converted by hand — Peacock's Collar,
// Short rows and Raglan, and one tatted-triangle phase. The pattern files
// themselves are untouched; these live here only, and are the reference
// conversions for step 3. Converting real sections rather than synthetic ones
// is the point: it is where the model gets to be wrong about something that
// actually exists.
// ─────────────────────────────────────────────
function rowsSelfTest() {
  const results = [];

  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }

  // ── Fixtures: Peacock Tee, sections converted in place ──
  //
  // Ordering matches the real pattern so the absolute-row arithmetic is real:
  // Materials → Collar → Short rows → Yoke chart → Raglan.

  // Materials: four notes. Buying yarn is not knitting a row.
  const FX_MAT = {
    id: 'mat', name: 'Materials', entries: [
      { kind: 'note', id: 'm1', text: 'Yarn: 400 g fingering' },
      { kind: 'note', id: 'm2', text: '3 mm and 4 mm circulars' },
      { kind: 'note', id: 'm3', text: 'DPNs: 3 mm and 4 mm' },
      { kind: 'note', id: 'm4', text: 'Knit gauge swatch on 4 mm' },
    ]
  };

  // Collar. The judgment calls:
  //   c1 casting on is not a row — note.
  //   c2 "Work 7 rounds k1,p1 rib" is one row worked 7 times — repeat, R=1.
  //   c3 IS a round (it is worked) — row, not note. Today it counts for
  //      nothing in the tally; see the divergence case at the bottom.
  //   c4 changing needles is not a row — note.
  const FX_COL = {
    id: 'col', name: 'Collar', entries: [
      { kind: 'note', id: 'c1', text: 'Cast on 88 sts on 3 mm circular. Join to round.' },
      { kind: 'repeat', id: 'c2', times: 7, rows: [
        { id: 'c2-1', text: 'Rib round — k1, p1 to end' },
      ] },
      { kind: 'row', id: 'c3', text: 'Increase round: rib 4, *M1, rib 8*, rep to last 4, M1, rib 4 → 99 sts' },
      { kind: 'note', id: 'c4', text: 'Switch to 4 mm circular needle' },
    ]
  };

  // Short rows: seven steps that each say "Row N" — seven rows, no counters.
  // Today these contribute 0 to the tally, because only counter steps count.
  const FX_GSR = {
    id: 'gsr', name: 'Short rows', entries: [
      { kind: 'row', id: 'g1', text: 'Row 1 (RS): K 27 sts. Turn.' },
      { kind: 'row', id: 'g2', text: 'Row 2 (WS): GSR, p 53 sts. Turn.' },
      { kind: 'row', id: 'g3', text: 'Row 3 (RS): GSR, k 57 sts. Turn.' },
      { kind: 'row', id: 'g4', text: 'Row 4 (WS): GSR, p 61 sts. Turn.' },
      { kind: 'row', id: 'g5', text: 'Row 5 (RS): GSR, K3, *k2tog…* × 6, k8. Turn.' },
      { kind: 'row', id: 'g6', text: 'Row 6 (WS): GSR, p 69 sts. Turn.' },
      { kind: 'row', id: 'g7', text: 'Row 7 (RS): GSR, k to mid-back. Now in the round.' },
    ]
  };

  // Yoke chart: left UNCONVERTED on purpose, so the mixed pattern exercises
  // the legacy fallback inside sectionRowCount. It borrows the real chart.
  const FX_CHART = { id: 'chart', name: 'Yoke chart', hasChart: true,
                     steps: [{ id: 'ch2', text: 'Count to confirm 253 sts', postChart: true }] };

  // Raglan. r2 is the codebase's only `cadence` step, written out longhand.
  //
  // THE ORDERING TRAP: cadenceHintHtml computes `round % 2 === 0`, so round 1
  // is the PLAIN round and round 2 is the increase. rows: must therefore be
  // [plain, increase]. Reversed, every increase round lands one round early
  // and the sweater is wrong — silently, since nothing would throw.
  const FX_RAG = {
    id: 'rag', name: 'Raglan', entries: [
      { kind: 'note', id: 'r1', text: 'Mark 4 sections (in the round, BOR = mid-back):', bullets: [
        '38 back / M / 1 marker-st / M',
        '48 sleeve / M / 1 marker-st / M',
        '77 front / M / 1 marker-st / M',
        '48 sleeve / M / 1 marker-st / M',
        '38 back',
      ] },
      { kind: 'repeat', id: 'r2', times: 4, rows: [
        { id: 'r2-1', text: 'Plain round — knit all stitches' },
        { id: 'r2-2', text: 'Increase round — m1-R before marker-st, k1 marker-st, m1-L after (8 inc)' },
      ] },
      { kind: 'note', id: 'r3', text: 'After 8 rounds (4 increase rounds): 285 sts total.' },
    ]
  };

  const realPeacock = patternById('peacock-tee');
  const FX_PEACOCK = {
    id: 'fx-peacock', name: 'Peacock (fixture)',
    chart: (realPeacock && realPeacock.chart) || [],
    phases: [FX_MAT, FX_COL, FX_GSR, FX_CHART, FX_RAG],
  };

  // tatted-triangle's countable phase. The conversion is purely mechanical —
  // on a countable phase every step already IS one row — so this map is the
  // conversion rule itself rather than 25 lines of hand-copied text.
  const realTat = patternById('tatted-triangle');
  const realTatT1 = realTat && realTat.phases.find(p => p.id === 'tat-t1');
  const FX_TAT_T1 = {
    id: 'tat-t1', name: 'Triangle 1',
    entries: (realTatT1 ? realTatT1.steps : []).map(s => ({ kind: 'row', id: s.id, text: s.text })),
  };

  const REP_C2 = FX_COL.entries[1];   // R=1, times 7
  const REP_R2 = FX_RAG.entries[1];   // R=2, times 4

  // ── A. Row counts ──

  check('collar: 7 rib rounds + 1 increase round = 8 rows',
    sectionRowCount(FX_COL, FX_PEACOCK), 8);
  check('short rows: seven rows',
    sectionRowCount(FX_GSR, FX_PEACOCK), 7);
  check('raglan: notes contribute nothing, 4 passes × 2 rows = 8',
    sectionRowCount(FX_RAG, FX_PEACOCK), 8);
  check('legacy chart section still counts its chart (44)',
    sectionRowCount(FX_CHART, FX_PEACOCK), 44);
  check('tat-t1 converted: 25 rows',
    sectionRowCount(FX_TAT_T1, null), 25);
  check('tat-t1 conversion preserves the countable count',
    sectionRowCount(FX_TAT_T1, null), sectionRowCount(realTatT1, realTat));

  // ── B. The full walk, forward then back ──
  //
  // The doc's requirement: a knitter who taps + once too often must be able to
  // tap − once and land exactly where they were. So walk the whole raglan
  // repeat, overshoot at both ends, and assert the sequences are mirror images.

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
  // of whichever direction you walked, so a naive reverse() of the padded
  // forward walk compares two-taps-past-the-top against two-past-the-bottom.
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
      const at = { y: 0, z: 2 };                       // last row of pass 1
      const fwd = advanceRepeat(REP_R2, at, 1);        // rolls to {1,1}
      return [fwd, advanceRepeat(REP_R2, fwd, -1)];
    })(),
    [{ y: 1, z: 1 }, { y: 0, z: 2 }]);

  // ── C. Boundaries and clamping ──

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

  // ── D. R = 1, via the collar's rib repeat ──
  //
  // The degenerate repeat: one row, seven passes. z can never leave 1, so
  // every advance has to move y or the counter freezes.

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

  // ── E. Absolute row ──
  //
  // Rows before the raglan repeat: materials 0 + collar 8 + short rows 7 +
  // chart 44 = 59, plus the r1 note (0). So pass 1 row 1 is pattern row 60.

  check('rows before the raglan repeat = 0 + 8 + 7 + 44',
    rowsBeforeEntry(FX_PEACOCK, 'rag', 'r2'), 59);
  check('pass 1 row 1 is pattern row 60',
    absoluteRow(FX_PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 0, z: 1 } }), 60);
  check('pass 2 row 1 is pass 1 row 1 + R — the doc arithmetic',
    absoluteRow(FX_PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 1, z: 1 } }),
    absoluteRow(FX_PEACOCK, 'rag', 'r2', { 'rp:r2': { y: 0, z: 1 } }) + repeatLength(REP_R2));
  check('the collar increase round is pattern row 8',
    absoluteRow(FX_PEACOCK, 'col', 'c3', {}), 8);
  check('absolute row is rows-done + 1 for the same position',
    (() => {
      const pr = { 'rp:r2': { y: 2, z: 2 } };
      return absoluteRow(FX_PEACOCK, 'rag', 'r2', pr)
           - (59 + repeatRowsDone(REP_R2, pr['rp:r2']));
    })(), 1);
  check('a note has no absolute row, and unknown ids are null not 0',
    [absoluteRow(FX_PEACOCK, 'rag', 'r1', {}),
     absoluteRow(FX_PEACOCK, 'rag', 'nope', {}),
     rowsBeforeEntry(FX_PEACOCK, 'nope', 'r2')],
    [null, null, null]);

  // ── F. Done-counts meet the totals ──

  check('empty progress: nothing done anywhere',
    [sectionRowsDone(FX_COL, {}), sectionRowsDone(FX_RAG, {}), sectionRowsDone(FX_GSR, {})],
    [0, 0, 0]);
  check('fully worked collar: rows done equals row count, section complete',
    (() => {
      const pr = { 'n:c1': true, 'rp:c2': { y: 7, z: 1 }, 'r:c3': true, 'n:c4': true };
      return [sectionRowsDone(FX_COL, pr), sectionRowCount(FX_COL, FX_PEACOCK),
              sectionComplete(FX_COL, pr)];
    })(),
    [8, 8, true]);
  check('a finished repeat with an unticked note: rows done, section not complete',
    (() => {
      const pr = { 'n:r1': true, 'rp:r2': { y: 4, z: 1 } };   // r3 note left unticked
      return [sectionRowsDone(FX_RAG, pr), sectionComplete(FX_RAG, pr)];
    })(),
    [8, false]);
  check('notes never add rows, however many are ticked',
    sectionRowsDone(FX_RAG, { 'n:r1': true, 'n:r3': true }), 0);
  check('mid-repeat: standing on row 1 of pass 3 = 4 rows done',
    sectionRowsDone(FX_RAG, { 'rp:r2': { y: 2, z: 1 } }), 4);

  // ── G. The legacy fallback is a faithful copy ──
  //
  // While the real patterns are unconverted, patternRowTotal() must agree with
  // the shipped patternTotalRows() for all four. This is not proof the new
  // model is right — it is proof the fallback transcription is, which is what
  // lets steps 2–3 convert one section at a time without the header jumping.
  PATTERNS.forEach(p => {
    check('legacy fallback matches patternTotalRows() — ' + p.id,
      patternRowTotal(p), legacyTotalFor(p));
  });

  // ── H. Where the new model DIVERGES from today, on purpose ──
  //
  // Today's tally only counts row-counter targets, chart rows and countable
  // steps. A plain step that is genuinely one round — Collar's increase round,
  // every one of the seven short rows — counts for nothing. Under the new
  // model those are rows, so converted sections report MORE rows than the old
  // tally did. This is the intended correction, not a regression, but it means
  // step 4 cannot verify by asserting the header total is unchanged.
  const realCol = realPeacock.phases.find(p => p.id === 'col');
  const realGsr = realPeacock.phases.find(p => p.id === 'gsr');
  check('collar: old tally 7 (counter only) → new 8 (+ the increase round)',
    [sectionRowCount(realCol, realPeacock), sectionRowCount(FX_COL, FX_PEACOCK)], [7, 8]);
  check('short rows: old tally 0 (no counters) → new 7',
    [sectionRowCount(realGsr, realPeacock), sectionRowCount(FX_GSR, FX_PEACOCK)], [0, 7]);

  const failed = results.filter(r => !r.ok);
  console.table(results.map(r => ({ case: r.case, ok: r.ok })));
  failed.forEach(f => console.error('FAIL ' + f.case + '\n  got  ' + f.got + '\n  want ' + f.want));
  console.info('[rows selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

// Run the SHIPPED patternTotalRows() against an arbitrary pattern. It reads
// the PHASES / activePatternId globals, so they are swapped and restored —
// in a finally, because a throw here would otherwise leave the running app
// pointed at the wrong pattern.
function legacyTotalFor(pattern) {
  const savedPhases = PHASES, savedId = activePatternId;
  try {
    PHASES = pattern.phases;
    activePatternId = pattern.id;
    return patternTotalRows();
  } finally {
    PHASES = savedPhases;
    activePatternId = savedId;
  }
}

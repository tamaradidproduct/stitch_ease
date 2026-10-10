// ─────────────────────────────────────────────
// SELF-TEST for the step screen model (js/core/steps.js). Not shipped.
//
// Absent from index.html and sw.js. To run it, from the console on a loaded page:
//
//   for (const f of ['js/core/steps.demo.selftest.js', 'js/core/steps.selftest.js']) {
//     const s = document.createElement('script'); s.src = f; document.body.append(s);
//   }
//
// then call stepsSelfTest(). It returns {passed, failed, failures}. The same file
// runs under node — see the harness note in the plan.
// ─────────────────────────────────────────────
function stepsSelfTest() {
  const results = [];
  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }

  // ── Fixtures ──
  // 10 rows: r0, then a 4-pass × 2-row repeat (rows 2–9), then r9.
  const REP = { id: 'rep', steps: [
    { kind: 'row', id: 'r0', text: 'a' },
    { kind: 'repeat', id: 'rp', times: 4, rows: [{ id: 'rp1', text: 'x' }, { id: 'rp2', text: 'y' }] },
    { kind: 'row', id: 'r9', text: 'z' },
  ] };
  const WRITTEN = { id: 'wr', steps: [
    { kind: 'row', id: 'a' }, { kind: 'row', id: 'b' }, { kind: 'row', id: 'c' },
  ] };
  const CHART = { id: 'ch', hasChart: true,
    chart: Array.from({ length: 44 }, () => ['K', 'P', 'K']),
    chartSteps: { text: { 3: 'override' }, before: { 1: 'b1', 999: 'nope' }, after: { 44: 'Count', 999: 'nope' } } };
  const EMPTY = { id: 'em', steps: [
    { kind: 'row', id: 'e1' },
    { kind: 'repeat', id: 'e2', times: 3, rows: [] },
    { kind: 'repeat', id: 'e3', times: 0, rows: [{ id: 'e3a' }] },
    { kind: 'row', id: 'e4' },
  ] };
  const PAT = { id: 'fx', phases: [REP, WRITTEN, CHART, EMPTY] };

  // ── Task 1: cursor model ──
  check('isStepSection: steps / chartSteps / rowless, not entries',
    [isStepSection(REP), isStepSection(CHART), isStepSection({ rowless: true }), isStepSection({ entries: [] }), isStepSection(null)],
    [true, true, true, false, false]);
  check('legacy steps (no kind) and sections with entries stay on the old path',
    [isStepSection({ steps: [{ id: 'a', text: 'x', rows: true, target: 3 }] }), isStepSection({ entries: [], steps: [{ kind: 'row', id: 'a' }] }), isStepSection({ steps: [] })],
    [false, false, true]);
  check('row counts', [stepsRowCount(REP, PAT), stepsRowCount(WRITTEN, PAT), stepsRowCount(CHART, PAT)], [10, 3, 44]);

  const at = c => { const l = locateCursor(REP, PAT, c); return { s: l.stepIndex, p: l.pass, r: l.rowInPass, id: l.rowId }; };
  check('cursor 0 is the first row', at(0), { s: 0, p: 1, r: 1, id: 'r0' });
  check('cursor 1 → repeat pass 1 row 1', at(1), { s: 1, p: 1, r: 1, id: 'rp1' });
  check('cursor 2 → repeat pass 1 row 2', at(2), { s: 1, p: 1, r: 2, id: 'rp2' });
  check('cursor 3 → repeat pass 2 row 1', at(3), { s: 1, p: 2, r: 1, id: 'rp1' });
  check('cursor 9 → trailing row after the repeat', at(9), { s: 2, p: 1, r: 1, id: 'r9' });
  check('cursor clamps below 0 and above total',
    [locateCursor(REP, PAT, -5).cursor, locateCursor(REP, PAT, 999).cursor], [0, 10]);
  check('at total the section is complete with no step',
    (l => [l.complete, l.step, l.stepIndex])(locateCursor(REP, PAT, 10)), [true, null, 3]);
  check('non-numeric cursor does not throw', locateCursor(REP, PAT, 'junk').cursor, 0);

  let roundTrip = true;
  for (let c = 0; c < 10; c++) {
    const l = locateCursor(REP, PAT, c);
    if (cursorAtRow(REP, PAT, l.stepIndex, l.pass, l.rowInPass) !== c) roundTrip = false;
  }
  check('cursorAtRow round-trips locateCursor for every cursor', roundTrip, true);
  check('cursorAtStep', [0, 1, 2, 3, 9].map(i => cursorAtStep(REP, PAT, i)), [0, 1, 9, 10, 10]);

  check('empty repeats count zero rows and are never located',
    [stepsRowCount(EMPTY, PAT), locateCursor(EMPTY, PAT, 1).rowId], [2, 'e4']);

  const steps = sectionSteps(CHART, PAT);
  check('chart section generates one step per chart row', steps.length, 44);
  check('generated step ids and chartRow', [steps[10].id, steps[10].chartRow], ['ch#11', 11]);
  check('override replaces text; others have none', [steps[2].text, steps[3].text], ['override', undefined]);
  check('before / after attach by row; out-of-range keys are ignored',
    [steps[0].before, steps[43].after, steps.some(s => s.before === 'nope' || s.after === 'nope')], ['b1', 'Count', false]);
  check('chartSteps.text may be a function',
    sectionSteps({ id: 'f', chart: [['K'], ['K']], chartSteps: { text: r => 'row ' + r } }, PAT).map(s => s.text), ['row 1', 'row 2']);

  // ── Task 2: actions ──
  check('Done on the cursor row advances one, no confirm', doneAt(REP, PAT, 4, 5), { cursor: 5, confirm: null });
  check('Done on a row ahead moves past it and asks', doneAt(REP, PAT, 4, 8), { cursor: 8, confirm: { from: 5, to: 8 } });
  check('Done on a row behind the cursor changes nothing', doneAt(REP, PAT, 4, 2), { cursor: 4, confirm: null });
  check('Done past the section is ignored', doneAt(REP, PAT, 4, 99), { cursor: 4, confirm: null });
  check('Done at the end stays at the end, twice',
    doneAt(REP, PAT, doneAt(REP, PAT, 9, 10).cursor, 10).cursor, 10);

  check('Mark incomplete on the last done row: no confirm', markIncompleteAt(10, 10), { cursor: 9, confirm: null });
  check('Mark incomplete several rows back confirms', markIncompleteAt(10, 6), { cursor: 5, confirm: { from: 6, to: 10 } });
  check('Mark incomplete on an unfinished row does nothing', markIncompleteAt(4, 5), { cursor: 4, confirm: null });

  // Repeat occupies cursors 1…8; pass p row r ↔ cursor 1 + (p-1)*2 + (r-1).
  check('pass+ mid-pass → row 1 of next pass', passPlus(REP, PAT, 4), 5);          // pass 2 row 2 → pass 3 row 1
  check('pass+ at row 1 → row 1 of next pass', passPlus(REP, PAT, 3), 5);
  check('pass+ on the last pass completes the block', passPlus(REP, PAT, 8), 9);
  check('pass+ outside a repeat does nothing', [passPlus(REP, PAT, 0), passPlus(REP, PAT, 9)], [0, 9]);
  check('pass− at row 1 of pass 2 → row 1 of pass 1', passMinus(REP, PAT, 3), 1);
  check('pass− mid-pass → row 1 of this pass', passMinus(REP, PAT, 4), 3);
  check('pass− clamps at row 1 of pass 1', [passMinus(REP, PAT, 1), passMinus(REP, PAT, 2)], [1, 1]);
  check('pass− outside a repeat does nothing', [passMinus(REP, PAT, 0), passMinus(REP, PAT, 9)], [0, 9]);

  const ENDS = { id: 'en', steps: [{ kind: 'row', id: 'x' }, REP.steps[1]] };   // a repeat is the last step
  check('pass− on a finished final block → row 1 of the last pass', passMinus(ENDS, PAT, 9), 7);

  let boundary = true;
  for (let c = 1; c <= 6; c++) {          // passes 1–3, so pass+ stays inside the block
    const back = passMinus(REP, PAT, passPlus(REP, PAT, c));
    const l = locateCursor(REP, PAT, back);
    if (l.stepIndex !== 1 || l.rowInPass !== 1) boundary = false;
  }
  check('pass− after pass+ lands on a pass boundary in the same block', boundary, true);

  const rp = REP.steps[1];
  const loc = (pass, rowInPass) => ({ pass, passes: 4, rowInPass });
  const R1 = { kind: 'row', id: 'q', before: 'B', after: 'A' };
  const RB = { kind: 'repeat', id: 'q2', times: 4, before: 'BLK-B', after: 'BLK-A',
    rows: [{ id: 'a', before: 'ROW-B' }, { id: 'b', after: 'ROW-A' }] };
  check('standalone row shows both', calloutsFor(R1, null), { before: ['B'], after: ['A'] });
  check('block before: pass 1 only', [calloutsFor(RB, loc(1, 2)).before, calloutsFor(RB, loc(2, 2)).before], [['BLK-B'], []]);
  check('block after: last row of last pass only',
    [calloutsFor(RB, loc(4, 2)).after, calloutsFor(RB, loc(4, 1)).after, calloutsFor(RB, loc(3, 2)).after],
    [['ROW-A', 'BLK-A'], [], ['ROW-A']]);
  check('row inside a repeat: own callouts every pass',
    [calloutsFor(RB, loc(3, 1)).before, calloutsFor(RB, loc(3, 2)).after], [['ROW-B'], ['ROW-A']]);
  check('no step → empty', calloutsFor(null, null), { before: [], after: [] });
  check('rp fixture untouched', rp.rows.length, 2);

  // ── Task 3: persistence, tally, tap budget ──
  const DEMO = patternById('step-demo');
  check('demo pattern is loaded (load steps.demo.selftest.js first)', !!DEMO, true);
  if (DEMO) {
    const sd = id => DEMO.phases.find(p => p.id === id);
    const WR = sd('sd-written'), RPT = sd('sd-repeat'), CH = sd('sd-chart'), FIN = sd('sd-finish');
    check('demo row counts', [WR, RPT, CH, FIN].map(s => sectionRowCount(s, DEMO)), [3, 9, 12, 0]);
    check('patternRowTotal counts step sections', patternRowTotal(DEMO), 24);

    const ctx = { entries: { 'sc:sd-written': 2, 'sc:sd-repeat': 5, 'sc:sd-chart': 99 } };
    check('sectionRowsDone reads the cursor; clamps to the section', [WR, RPT, CH].map(s => sectionRowsDone(s, ctx, DEMO)), [2, 5, 12]);
    check('patternRowsDone = Σ cursors; rowless adds 0', patternRowsDone(DEMO, ctx), 19);
    check('negative or junk cursor is clamped to 0',
      [sectionRowsDone(WR, { entries: { 'sc:sd-written': -4 } }, DEMO), sectionRowsDone(WR, { entries: { 'sc:sd-written': 'x' } }, DEMO)], [0, 0]);

    check('row section completes at the last row', [sectionComplete(WR, { entries: { 'sc:sd-written': 2 } }, DEMO), sectionComplete(WR, { entries: { 'sc:sd-written': 3 } }, DEMO)], [false, true]);
    const tk = n => ({ entries: { ['t:sd-t' + n]: true } });
    check('rowless completes only when every task is ticked',
      [sectionComplete(FIN, { entries: {} }, DEMO),
       sectionComplete(FIN, { entries: Object.assign({}, tk(1).entries, tk(2).entries) }, DEMO),
       sectionComplete(FIN, { entries: Object.assign({}, tk(1).entries, tk(2).entries, tk(3).entries) }, DEMO)],
      [false, false, true]);
    check('a section with nothing to do is not complete', sectionComplete({ id: 'nil', steps: [] }, {}, DEMO), false);

    // Regression: an old-shape pattern's tally is exactly what it was before this model existed.
    const PEACOCK = legacyShape(patternById('peacock-tee'));
    const pctx = { entries: {}, chartRows: {} };
    PEACOCK.phases.forEach(s => {
      if (s.hasChart) pctx.chartRows[s.id] = 7;
      (s.entries || []).forEach(e => {
        if (e.kind === 'row') pctx.entries['r:' + e.id] = true;
        if (e.kind === 'repeat') pctx.entries['rp:' + e.id] = { y: 1, z: 2 };
      });
    });
    check('old-shape Peacock tally is unchanged', [patternRowsDone(PEACOCK, pctx), patternRowTotal(PEACOCK)], [23, 184]);

    // Persistence round-trip + tap budget. Globals are swapped and restored in a
    // finally — a throw here must not leave the running app on the demo pattern.
    // save() is stubbed: its cost is the one the chart tap already pays, so this
    // measures what the step model adds.
    const saved = { doc: activeDoc, prog: entryProg, save: save };
    try {
      activeDoc = DEMO; entryProg = {}; save = function () {};
      setStepCursor(WR, 2);
      check('setStepCursor writes sc:<id>; stepCursor reads it back', [entryProg['sc:sd-written'], stepCursor(WR)], [2, 2]);
      setStepCursor(WR, 99);
      check('setStepCursor clamps to the section', stepCursor(WR), 3);
      toggleTask(FIN.steps[0]);
      check('toggleTask flips t:<id>', [entryProg['t:sd-t1'], taskDone(FIN.steps[0])], [true, true]);
      toggleTask(FIN.steps[0]);
      check('toggleTask flips back', taskDone(FIN.steps[0]), false);

      const t0 = performance.now();
      for (let i = 0; i < 100; i++) {
        const l = locateCursor(CH, DEMO, stepCursor(CH));
        setStepCursor(CH, doneAt(CH, DEMO, stepCursor(CH), l.cursor + 1).cursor);
      }
      const ms = performance.now() - t0;
      check('100 Done taps on a chart section take under 50 ms (took ' + ms.toFixed(2) + ')', ms < 50, true);
    } finally {
      activeDoc = saved.doc; entryProg = saved.prog; save = saved.save;
    }
  }

  // ── Task 8: the entries → steps converter ──
  const OLD = { id: 'old', phases: [
    { id: 'mat', name: 'Materials', desc: '', entries: [{ kind: 'note', id: 'm1', text: '4 mm circular' }, { kind: 'note', id: 'm2', text: 'Stitch markers', bullets: ['4 markers'] }] },
    { id: 'work', name: 'Body', desc: '', entries: [
      { kind: 'note', id: 'w0', text: 'Rhythm: increase every 2nd row throughout.' },
      { kind: 'note', id: 'w1', text: 'Switch to 4 mm and place a marker.' },
      { kind: 'row', id: 'w2', text: 'knit all' },
      { kind: 'note', id: 'w3', text: 'Now work the lace panel.' },
      { kind: 'repeat', id: 'w4', times: 2, rows: [{ id: 'w4a', text: 'k' }, { id: 'w4b', text: 'p' }] },
      { kind: 'note', id: 'w5', text: '39 sts on the needle.' },
      { kind: 'note', id: 'w6', text: 'See the notes at the end for tips.' },
    ] },
    { id: 'fin', name: 'Finishing', desc: '', entries: [{ kind: 'note', id: 'f1', text: 'Bind off loosely' }, { kind: 'note', id: 'f2', text: 'Weave in ends' }] },
    { id: 'ch', name: 'Chart', desc: '', hasChart: true, chart: [['K'], ['K'], ['K']], entries: [{ kind: 'note', id: 'c1', text: 'Count to confirm 253 sts' }] },
  ] };
  const NEW = convertPattern(OLD);
  const ph = id => NEW.phases.find(x => x.id === id);
  check('materials-only section: rowless, items become section notes', [ph('mat').rowless, ph('mat').steps.length, ph('mat').notes], [true, 0, ['4 mm circular', 'Stitch markers<br>• 4 markers']]);
  check('leading context → section notes; the action just before the first row → its `before`',
    [ph('work').notes.slice(0, 1), ph('work').steps[0].before], [['Rhythm: increase every 2nd row throughout.'], 'Switch to 4 mm and place a marker.']);
  check('an interior note that is not a checkpoint → `before` the next step', ph('work').steps[1].before, 'Now work the lace panel.');
  check('a trailing count → `after` the last step; other trailing prose → section notes',
    [ph('work').steps[1].after, ph('work').notes.slice(-1)], ['39 sts on the needle.', ['See the notes at the end for tips.']]);
  check('rows and repeats keep their ids and shape', ph('work').steps.map(x => [x.kind, x.id, x.times]), [['row', 'w2', undefined], ['repeat', 'w4', 2]]);
  check('finishing: each note becomes a task', ph('fin').steps.map(x => [x.kind, x.id, x.text]), [['task', 'f1', 'Bind off loosely'], ['task', 'f2', 'Weave in ends']]);
  check('chart section: the confirm note → `after` the last chart row, chart kept',
    [ph('ch').hasChart, ph('ch').chartSteps.after[3], ph('ch').entries], [true, 'Count to confirm 253 sts', undefined]);
  check('the original is not touched', OLD.phases[1].entries.length, 7);
  check('converted sections are step sections; row total is unchanged',
    [NEW.phases.every(x => isStepSection(x)), patternRowTotal(NEW)], [true, patternRowTotal(OLD)]);
  check('structure hash sees step sections (kinds + ids, never prose)', structHash(NEW) !== structHash(OLD), true);
  const ALTERED = JSON.parse(JSON.stringify(NEW)); ALTERED.phases[1].steps[0].text = 'knit every stitch'; ALTERED.phases[1].notes = ['x'];
  check('…and ignores text and notes', structHash(ALTERED), structHash(NEW));

  // Every shipped pattern keeps its row count through conversion.
  const TOTALS = [];
  PATTERNS.filter(x => x.id !== 'step-demo' && !(x.custom)).forEach(pat => {
    const olds = pat.buildPhases ? pat.sizes.map((_, i) => ({ id: pat.id, chart: pat.chart, phases: pat.buildPhases(i) })) : [pat];
    olds.forEach((o, i) => {
      const n = convertPattern(o.phases && !pat.buildPhases ? o : { id: pat.id, chart: pat.chart, phases: o.phases });
      const nn = pat.buildPhases ? { id: pat.id, chart: pat.chart, phases: o.phases.map(x => convertPhase(x, pat)) } : n;
      TOTALS.push([pat.id + (pat.buildPhases ? '#' + i : ''), patternRowTotal(nn) - patternRowTotal(o)]);
    });
  });
  check('every shipped pattern (every size) has the same row total after conversion', TOTALS.filter(t => t[1] !== 0), []);
  check('conversion covers every pattern', TOTALS.length >= 10, true);

  // ── Task 9: schema 4 — cursors derived from the entries model ──
  const LEG = { id: 'leg', phases: [
    { id: 'a', name: 'A', desc: '', entries: [
      { kind: 'row', id: 'a1', text: '' }, { kind: 'row', id: 'a2', text: '' },
      { kind: 'repeat', id: 'ar', times: 3, rows: [{ id: 'ar1', text: '' }, { id: 'ar2', text: '' }] },
      { kind: 'row', id: 'a3', text: '' } ] },
    { id: 'c', name: 'Chart', desc: '', hasChart: true, chart: Array.from({ length: 10 }, () => ['K']), entries: [{ kind: 'note', id: 'cn', text: 'Count 10 sts' }] },
    { id: 'f', name: 'Finishing', desc: '', entries: [{ kind: 'note', id: 'f1', text: 'Bind off' }, { kind: 'note', id: 'f2', text: 'Weave in ends' }] },
  ] };
  const LNEW = convertPattern(LEG);
  const progress = { entries: { 'r:a1': true, 'r:a2': true, 'rp:ar': { y: 1, z: 2 }, 'n:f1': true }, chartRows: { c: 7 } };
  const D = cursorsFromLegacyProgress(LNEW, progress);
  check('section A cursor = rows done: 2 rows + (1×2 + 2 − 1) of the repeat = 5', D.values['sc:a'], 5);
  check('chart cursor = standing row − 1', D.values['sc:c'], 6);
  check('a ticked note becomes a ticked task; an unticked one stays open', [D.values['t:f1'], D.values['t:f2']], [true, false]);
  check('a section with no rows gets no cursor', 'sc:f' in D.values, false);
  check('a stored chart row past the end clamps to the chart',
    cursorsFromLegacyProgress(LNEW, { entries: {}, chartRows: { c: 99 } }).values['sc:c'], 9);
  check('nothing done → cursors of 0, tasks open',
    cursorsFromLegacyProgress(LNEW, { entries: {}, chartRows: {} }).values, { 'sc:a': 0, 'sc:c': 0, 't:f1': false, 't:f2': false });
  check('each new key takes the newest clock of the keys it came from',
    clocksForCursors(D, { 'r:a1': 10, 'r:a2': 30, 'rp:ar': 20, 'cr:c': 5, 'n:f1': 7 }), { 'sc:a': 30, 'sc:c': 5, 't:f1': 7 });
  check('no clock where nothing was ever touched', clocksForCursors(D, {}), {});
  check('the tally is the same before and after, on the fixture',
    [patternRowsDone(LEG, progress), patternRowsDone(LNEW, { entries: Object.assign({}, progress.entries, D.values), chartRows: progress.chartRows })], [patternRowsDone(LEG, progress), patternRowsDone(LEG, progress)]);

  // …and on every shipped pattern, with ticks scattered through it.
  const TALLY = [];
  PATTERNS.filter(x => x.id !== 'step-demo' && !x.custom).forEach(pat => {
    // The OLD shape — under ?steps=1 the registry already holds the converted one.
    const build = pat.legacyBuildPhases || pat.buildPhases;
    const olds = pat.buildPhases ? pat.sizes.map((_, i) => ({ id: pat.id, chart: pat.chart, phases: build(i) })) : [legacyShape(pat)];
    olds.forEach((o, i) => {
      const entries = {}, chartRows = {};
      o.phases.forEach(ph => {
        (ph.entries || []).forEach((e, k) => {
          if (e.kind === 'row' && k % 2 === 0) entries[rowKey(e.id)] = true;
          if (e.kind === 'repeat') entries[repeatKey(e.id)] = { y: 1, z: 1 + (k % Math.max(1, (e.rows || []).length)) };
          if (e.kind === 'note' && k % 2 === 1) entries[noteKey(e.id)] = true;
        });
        if (ph.hasChart) chartRows[ph.id] = 5;
      });
      const nn = { id: pat.id, chart: pat.chart, phases: o.phases.map(ph => convertPhase(ph, pat)) };
      const d = cursorsFromLegacyProgress(nn, { entries, chartRows });
      const before = patternRowsDone(o, { entries, chartRows });
      const after = patternRowsDone(nn, { entries: Object.assign({}, entries, d.values), chartRows });
      if (before !== after) TALLY.push([pat.id + (pat.buildPhases ? '#' + i : ''), before, after]);
    });
  });
  check('the header tally is unchanged by the migration for every pattern and size', TALLY, []);

  const failed = results.filter(r => !r.ok);
  console.table && results.length < 0 && console.table(results);
  console.log('[steps selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  failed.forEach(f => console.log('FAIL', f.case, '\n  got ', f.got, '\n  want', f.want));
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

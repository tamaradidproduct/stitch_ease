// ─────────────────────────────────────────────
// DEMO PATTERN for the step screen. Not shipped.
//
// Registers `step-demo` into PATTERNS with one section of every step kind, so
// the player can be verified in a browser before any real pattern is converted.
// Load it from the console BEFORE creating a project from it:
//
//   const s = document.createElement('script');
//   s.src = 'js/core/steps.demo.selftest.js';
//   document.body.append(s);
//
// Absent from index.html and sw.js, so it never reaches a knitter.
// ─────────────────────────────────────────────
(function () {
  const chart = [];
  for (let r = 0; r < 12; r++) chart.push(['K','P','YO','K2','SK','K','P','K','K','P','K','K'].map((t, i) => (r + i) % 3 === 0 ? 'K' : t));

  PATTERNS.push({
    id: 'step-demo',
    name: 'Step demo',
    badge: 'Demo',
    desc: 'One section of every step kind — dev only',
    phases: [
      { id: 'sd-written', name: 'Written rows', desc: 'Rows with callouts',
        notes: ['Context true for the whole section.'],
        steps: [
          { kind: 'row', id: 'sd-w1', text: 'k1, p1 rib to end', before: 'Cast on 88 sts. Join in the round.', after: '88 sts' },
          { kind: 'row', id: 'sd-w2', text: 'knit all' },
          { kind: 'row', id: 'sd-w3', text: 'purl all' },
        ] },
      { id: 'sd-repeat', name: 'Repeat', desc: '4 passes × 2 rows',
        steps: [
          { kind: 'repeat', id: 'sd-rep', times: 4, before: 'Switch to 4 mm.', after: '285 sts. Mid-front ≈ 22 cm.',
            motif: [['K','YO','SK','K','K2','YO','K','K'], ['P','P','P','P','P','P','P','P']],
            rows: [
              { id: 'sd-rep-1', chartRow: 1, text: 'Increase round — k to marker, [motif], k to end' },
              { id: 'sd-rep-2', chartRow: 2, text: 'Plain round', after: 'Check the marker' },
            ] },
          { kind: 'row', id: 'sd-after', text: 'knit all' },
        ] },
      { id: 'sd-chart', name: 'Chart', desc: 'Generated rows', hasChart: true, chart,
        chartSteps: {
          text:   { 3: 'k2, yo, k2tog — authored override' },
          before: { 1: 'Join, place BOR marker' },
          after:  { 12: 'Count to confirm 12 sts' },
        } },
      { id: 'sd-finish', name: 'Finishing', desc: 'Rowless', rowless: true,
        notes: ['Weave in ends on the wrong side.'],
        steps: [
          { kind: 'task', id: 'sd-t1', text: 'Bind off loosely in pattern' },
          { kind: 'task', id: 'sd-t2', text: 'Sew hood seam' },
          { kind: 'task', id: 'sd-t3', text: 'Weave in ends' },
        ] },
    ],
  });
})();

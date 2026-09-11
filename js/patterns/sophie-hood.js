// ─────────────────────────────────────────────
// SOPHIE HOOD — PetiteKnit (Mette Wendelboe Okkels), ©2024. Garter-stitch
// hood/scarf with built-in i-cord edges, worked flat in one piece tip to
// tip, sewn along the back of the neck with mattress stitch.
//
// A bought pattern — the PDF is never bundled (see CLAUDE.md "What NOT to
// do"). Attach it on-device from the pattern's own header.
//
// Sizes S (M) L differ ONLY in how fast the two tapered ends grow/shrink
// (increase/decrease every 6th / 8th / 10th row) and in one small repeat
// count right after the i-cord is rejoined. Every other row — stitch
// counts, decrease/increase phrasing, the straight hood-shaping section —
// is identical across all three sizes (verified against the PDF: the
// written stitch counts at every checkpoint, 45/42/39/33/23/33/39/42/45/7,
// are the same "for all sizes"). So rather than threading a size parameter
// through the whole render path, each size is registered as its own
// PATTERNS entry (sophie-hood-s/m/l) — the existing "pick a pattern" screen
// IS the size picker, and every other pattern in this library is already
// single-size per entry.
//
// Both ends taper by a fixed number of stitches (39 sts increased at the
// cast-on end, 38 decreased at the tip end) at a rate of exactly one
// stitch per N-row cadence unit, where N = 6 (8) 10. The PDF writes this as
// "Rows 1-4 once, then Rows 3&4 another 1(2)3 times" to reach the first
// N-row unit, then "continue as established" for the rest — that unwinds
// to a plain repeated N-row block (1 shaping row + N-1 plain rows), which
// is what's built below. Confirmed against the PDF's own stated totals:
// gauge is 30 rows/10cm; 39 units × N rows, converted at that gauge, comes
// to 78/104/130cm — plus the 2cm cast-on = 80/106/132cm, matching the
// pattern's stated length at that checkpoint for S/M/L exactly.
// ─────────────────────────────────────────────

function sophieHoodCadenceUnit(prefix, n, shapingLabel, shapingText) {
  // n-row unit: row 1 is the shaping row (WS), rows 2..n alternate RS/WS,
  // all identical plain i-cord rows.
  const rows = [{ id: `${prefix}-1`, text: `Row 1 (WS): ${shapingText}` }];
  for (let i = 2; i <= n; i++) {
    const side = (i % 2 === 0) ? 'RS' : 'WS';
    rows.push({ id: `${prefix}-${i}`, text: `Row ${i} (${side}): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.` });
  }
  return rows;
}

function buildSophieHoodPhases(sizeTag, cadenceN, rejoinRepeats) {
  const P = (id) => `${sizeTag}-${id}`;
  return [
    {
      id: P('mat'), name: 'Materials', desc: 'Before you start',
      entries: [
        { kind: 'note', id: P('m1'), text: 'Yarn (choose one): 150–250g Eco Cashmere Vintage by Gepard (50g = 150m) · 200–350g Alpakka Ull by Sandnes Garn (50g = 100m) · 200–300g Cashmere Charis by Pascuali (50g = 110m) · 200–300g Snefnug by CaMaRose (50g = 110m) · 200–300g Isager Soft by Isager Yarn (50g = 125m) — see the size note on the pattern PDF for exact yardage' },
        { kind: 'note', id: P('m2'), text: 'Needles: 5mm [US8] / 60cm [24"] circular needle' },
        { kind: 'note', id: P('m3'), text: 'Gauge: 17 sts × 30 rows = 10×10cm [4×4"] in garter stitch on the 5mm needle' },
        { kind: 'note', id: P('m4'), text: 'A stitch holder or length of waste yarn, to rest 3 i-cord sts' },
      ]
    },
    {
      id: P('co'), name: 'Cast On', desc: 'The first tip of the hood',
      entries: [
        { kind: 'note', id: P('c0'), text: 'Cast on 6 sts on the 5mm circular needle. The first row is a WS row.' },
        {
          kind: 'repeat', id: P('c1'), text: 'i-cord edge, no shaping yet', times: 3, rows: [
            { id: P('c1-1'), text: 'Row 1 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
            { id: P('c1-2'), text: 'Row 2 (RS): Work as Row 1.' },
          ]
        },
      ]
    },
    {
      id: P('grow'), name: 'Widen to Full Width', desc: `Increase every ${cadenceN}th row from the WS`,
      entries: [
        { kind: 'note', id: P('g0'), text: `Now work increases from the WS on every ${cadenceN}th row: 1 increase row, then ${cadenceN - 1} plain rows, repeated.` },
        {
          kind: 'repeat', id: P('g1'), text: `Increase unit (every ${cadenceN}th row)`, times: 39,
          rows: sophieHoodCadenceUnit(P('g1'), cadenceN, 'inc', 'K2, kfb, knit to the last 3 sts, slip the last 3 sts purl-wise wyif.')
        },
        { kind: 'note', id: P('g2'), text: 'There are now 45 sts on the needle (or check the width incl. i-cord edges is 25cm [9¾"] — width matters more than the exact stitch count). The next row is a WS row.' },
      ]
    },
    {
      id: P('rside0'), name: 'Right Side — Rest the I-cord', desc: 'Continue straight along one edge',
      entries: [
        { kind: 'row', id: P('r0'), text: 'Row 1 (WS): Place the first 3 sts on a stitch holder or waste yarn to rest, knit to the last 3 sts, slip the last 3 sts purl-wise wyif. 42 sts now on the needle.' },
        {
          kind: 'repeat', id: P('r1'), text: 'Plain rows (16 garter ridges from the held sts)', times: 16, rows: [
            { id: P('r1-1'), text: 'Row 2 (RS): Knit across.' },
            { id: P('r1-2'), text: 'Row 3 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('r2'), text: 'The i-cord edge now runs only along the face edge — the back-of-neck edge has none; it will be mattress-stitched at the end.' },
      ]
    },
    {
      id: P('rside1'), name: 'Right Side — Shape the Point', desc: 'Decrease to the top of the hood',
      entries: [
        {
          kind: 'repeat', id: P('d1'), text: 'Decrease every 4th row', times: 3, rows: [
            { id: P('d1-1'), text: 'Row 1 (RS): Knit to the last 3 sts, k2tog, k1.' },
            { id: P('d1-2'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
            { id: P('d1-3'), text: 'Row 3 (RS): Knit across.' },
            { id: P('d1-4'), text: 'Row 4 (WS): Work as Row 2.' },
          ]
        },
        { kind: 'note', id: P('d2'), text: '39 sts on the needle.' },
        {
          kind: 'repeat', id: P('d3'), text: 'Decrease every 2nd row', times: 6, rows: [
            { id: P('d3-1'), text: 'Row 1 (RS): Knit to the last 3 sts, k2tog, k1.' },
            { id: P('d3-2'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('d4'), text: '33 sts on the needle.' },
        {
          kind: 'repeat', id: P('d5'), text: 'Decrease every row', times: 5, rows: [
            { id: P('d5-1'), text: 'Row 1 (RS): Knit to the last 3 sts, k2tog, k1.' },
            { id: P('d5-2'), text: 'Row 2 (WS): K1, k2tog, knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('d6'), text: '23 sts on the needle — the top point of the hood is reached. The right side shaping is complete.' },
      ]
    },
    {
      id: P('lside0'), name: 'Left Side — Shape from the Point', desc: 'Mirror the right side with increases',
      entries: [
        {
          kind: 'repeat', id: P('i1'), text: 'Increase every row', times: 5, rows: [
            { id: P('i1-1'), text: 'Row 1 (RS): Knit to the last 2 sts, kfb, k1.' },
            { id: P('i1-2'), text: 'Row 2 (WS): K1, kfb, knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('i2'), text: '33 sts on the needle.' },
        {
          kind: 'repeat', id: P('i3'), text: 'Increase every 2nd row', times: 6, rows: [
            { id: P('i3-1'), text: 'Row 1 (RS): Knit to the last 2 sts, kfb, k1.' },
            { id: P('i3-2'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('i4'), text: '39 sts on the needle.' },
        {
          kind: 'repeat', id: P('i5'), text: 'Increase every 4th row', times: 3, rows: [
            { id: P('i5-1'), text: 'Row 1 (RS): Knit across.' },
            { id: P('i5-2'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
            { id: P('i5-3'), text: 'Row 3 (RS): Knit to the last 2 sts, kfb, k1.' },
            { id: P('i5-4'), text: 'Row 4 (WS): Work as Row 2.' },
          ]
        },
        { kind: 'note', id: P('i6'), text: '42 sts on the needle.' },
      ]
    },
    {
      id: P('lside1'), name: 'Left Side — Straight to the Neck', desc: 'No more shaping on this edge',
      entries: [
        {
          kind: 'repeat', id: P('f1'), text: 'Plain rows, flat', times: 17, rows: [
            { id: P('f1-1'), text: 'Row 1 (RS): Knit across.' },
            { id: P('f1-2'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
          ]
        },
        { kind: 'note', id: P('f2'), text: 'The hood is now shaped, and will be sewn together along the back of the neck later. The next row is a RS row.' },
      ]
    },
    {
      id: P('tip0'), name: 'Rejoin the I-cord', desc: 'Bring the resting sts back onto the needle',
      entries: [
        { kind: 'row', id: P('t0'), text: 'Row 1 (RS): Knit to the end of the row, then hold the working yarn in front of the needle and place the resting i-cord sts back on the needle with the WS facing you, in extension of the other sts. 45 sts now on the needle.' },
        {
          kind: 'repeat', id: P('t1'), text: 'Plain rows, i-cord both edges again', times: rejoinRepeats, rows: [
            { id: P('t1-1'), text: 'Row 2 (WS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
            { id: P('t1-2'), text: 'Row 3 (RS): Work as Row 2.' },
          ]
        },
      ]
    },
    {
      id: P('taper'), name: 'Taper to the Tip', desc: `Decrease every ${cadenceN}th row from the WS`,
      entries: [
        { kind: 'note', id: P('x0'), text: `Now work decreases from the WS on every ${cadenceN}th row: 1 decrease row, then ${cadenceN - 1} plain rows, repeated.` },
        {
          kind: 'repeat', id: P('x1'), text: `Decrease unit (every ${cadenceN}th row)`, times: 38,
          rows: sophieHoodCadenceUnit(P('x1'), cadenceN, 'dec', 'K3, skp, knit to the last 3 sts, slip the last 3 sts purl-wise wyif.')
        },
        { kind: 'note', id: P('x2'), text: '7 sts left on the needle, for all sizes. The next row is a WS row.' },
      ]
    },
    {
      id: P('bo'), name: 'Bind Off the Tip', desc: 'The last 6 rows',
      entries: [
        { kind: 'row', id: P('b1'), text: 'Row 1 (WS): K2, skp, knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
        { kind: 'row', id: P('b2'), text: 'Row 2 (RS): Knit to the last 3 sts, slip the last 3 sts purl-wise wyif.' },
        { kind: 'row', id: P('b3'), text: 'Row 3 (WS): Work as Row 2.' },
        { kind: 'row', id: P('b4'), text: 'Row 4 (RS): Work as Row 2.' },
        { kind: 'row', id: P('b5'), text: 'Row 5 (WS): Work as Row 2.' },
        { kind: 'row', id: P('b6'), text: 'Row 6 (RS): Bind off the first 3 sts knit-wise, bind off the last 3 sts purl-wise.' },
      ]
    },
    {
      id: P('fin'), name: 'Finishing', desc: 'Sew and weave in',
      entries: [
        { kind: 'note', id: P('n1'), text: 'Sew the back of the hood together using mattress stitch, starting at the top and working down towards the back of the neck. Take care not to sew it crookedly, and not to tighten too much.' },
        { kind: 'note', id: P('n2'), text: 'Weave in all ends discreetly.' },
      ]
    },
  ];
}

const SOPHIE_HOOD_NOTES = [
  // K, Kfb, K2tog and Skp all resolve in GLOSSARY (js/core/glossary.js) — deferred, no def of their own.
  { term: 'K' },
  { term: 'Kfb' },
  { term: 'K2tog' },
  { term: 'Skp' },
  { term: 'RS', def: 'Right side of your work' },
  { term: 'WS', def: 'Wrong side of your work' },
  { term: 'wyif', def: 'With the yarn held in front of the work' },
  { term: 'st(s)', def: 'Stitch(es)' },
];

PATTERNS.push(
  { id: 'sophie-hood-s', name: 'Sophie Hood', badge: 'Size S · 102cm [40¼"]', desc: 'PetiteKnit · garter i-cord hood/scarf, tip to tip', phases: buildSophieHoodPhases('shs', 6, 2), notes: SOPHIE_HOOD_NOTES },
  { id: 'sophie-hood-m', name: 'Sophie Hood', badge: 'Size M · 128cm [50½"]', desc: 'PetiteKnit · garter i-cord hood/scarf, tip to tip', phases: buildSophieHoodPhases('shm', 8, 3), notes: SOPHIE_HOOD_NOTES },
  { id: 'sophie-hood-l', name: 'Sophie Hood', badge: 'Size L · 154cm [60¾"]', desc: 'PetiteKnit · garter i-cord hood/scarf, tip to tip', phases: buildSophieHoodPhases('shl', 10, 4), notes: SOPHIE_HOOD_NOTES },
);

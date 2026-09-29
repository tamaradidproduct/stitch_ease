// ─────────────────────────────────────────────
// HATSUKI — Rievive (2023). Top-down sleeveless summer sweater: worked
// from each front shoulder, joined, Leaf-chart lace panel down the front,
// back picked up from the shoulder cast-on edges, then joined in the round.
//
// A bought pattern — the PDF is never bundled (see CLAUDE.md "What NOT to
// do"). Attach it on-device from the pattern's own header.
//
// ONE library entry, SIX sizes. Unlike Sophie Hood (one entry per size), this
// entry is a TEMPLATE: `sizes` + `buildPhases(sizeIndex)`. The picker asks for
// a size when the project is started, and the project knits — and freezes — the
// pattern built for that size (see sizedPattern() in js/core/state.js). Almost
// every stitch count, row range and repeat count in the PDF differs per size,
// so each is a 6-element array below, indexed 0..5 for sizes 1..6, and the
// generators derive row numbers from them. The PDF's own stitch totals
// (59 (66, 71, 74, 81, 86) sts etc.) were used to check the derived row
// numbers and increases.
//
// Deviation from the PDF: "Connect the left and right back shoulder" prints
// the size-5 total as 185 sts; the arithmetic (74 + 47 + 74) and the size-5
// front (195) both say 195, so 195 is used.
//
// The Leaf chart is a real chart phase (HATSUKI_LEAF_CHART, flat). Its 20 flat
// rows and 20 rounds are also kept as written text in LEAF_FLAT / LEAF_ROUND,
// reused by the front / body frames.
// ─────────────────────────────────────────────

const HATSUKI_SIZES = [
  { name: '1', inch: 43.75, cm: 111 },
  { name: '2', inch: 48.5,  cm: 123 },
  { name: '3', inch: 53.25, cm: 135 },
  { name: '4', inch: 58,    cm: 147 },
  { name: '5', inch: 62.5,  cm: 159 },
  { name: '6', inch: 67.5,  cm: 171 },
].map(s => Object.assign(s, {
  sub: `chest ${s.inch}" / ${s.cm} cm`,
  badge: `Size ${s.name} · chest ${s.inch}" / ${s.cm} cm`,
}));

// Leaf chart, 15 sts × 20 rows. Flat: odd rows RS, even rows WS.
const HATSUKI_LEAF_FLAT = [
  'K10, k2tog, yo, k1, p2.',
  'K2, yo, p2, p2tog, p9.',
  'K8, k2tog, k1, yo, k2, p2.',
  'K2, p1, yo, p3, p2tog, p7.',
  'K6, k2tog, k2, yo, k3, p2.',
  'K2, p2, yo, p4, p2tog, p5.',
  'K4, k2tog, k3, yo, k4, p2.',
  'K2, p3, yo, p5, p2tog, p3.',
  'K13, p2.',
  'K2, p13.',
  'K1, yo, ssk, k10, p2.',
  'K2, p9, ssp, p2, yo.',
  'K2, yo, k1, ssk, k8, p2.',
  'K2, p7, ssp, p3, yo, p1.',
  'K3, yo, k2, ssk, k6, p2.',
  'K2, p5, ssp, p4, yo, p2.',
  'K4, yo, k3, ssk, k4, p2.',
  'K2, p3, ssp, p5, yo, p3.',
  'K13, p2.',
  'K2, p13.',
];
const HATSUKI_LEAF_ROUND = [
  'K10, k2tog, yo, k1, p2.',
  'K9, k2tog, k2, yo, p2.',
  'K8, k2tog, k1, yo, k2, p2.',
  'K7, k2tog, k3, yo, k1, p2.',
  'K6, k2tog, k2, yo, k3, p2.',
  'K5, k2tog, k4, yo, k2, p2.',
  'K4, k2tog, k3, yo, k4, p2.',
  'K3, k2tog, k5, yo, k3, p2.',
  'K13, p2.',
  'K13, p2.',
  'K1, yo, ssk, k10, p2.',
  'YO, k2, ssk, k9, p2.',
  'K2, yo, k1, ssk, k8, p2.',
  'K1, yo, k3, ssk, k7, p2.',
  'K3, yo, k2, ssk, k6, p2.',
  'K2, yo, k4, ssk, k5, p2.',
  'K4, yo, k3, ssk, k4, p2.',
  'K3, yo, k5, ssk, k3, p2.',
  'K13, p2.',
  'K13, p2.',
];

// Leaf chart, 15 sts × 20 rows, from hatsuki.stitchchart.json (row 1 = the
// export's min y, stitch order = ascending x, so the two purl columns sit on
// the left exactly as the PDF draws them). Worked flat: odd rows RS.
const HATSUKI_LEAF_CHART = [
  ['P','P','K','YO','K2','K','K','K','K','K','K','K','K','K','K'],
  ['P','P','YO','K','K','K2','K','K','K','K','K','K','K','K','K'],
  ['P','P','K','K','YO','K','K2','K','K','K','K','K','K','K','K'],
  ['P','P','K','YO','K','K','K','K2','K','K','K','K','K','K','K'],
  ['P','P','K','K','K','YO','K','K','K2','K','K','K','K','K','K'],
  ['P','P','K','K','YO','K','K','K','K','K2','K','K','K','K','K'],
  ['P','P','K','K','K','K','YO','K','K','K','K2','K','K','K','K'],
  ['P','P','K','K','K','YO','K','K','K','K','K','K2','K','K','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','K','SK','YO','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','SK','K','K','YO'],
  ['P','P','K','K','K','K','K','K','K','K','SK','K','YO','K','K'],
  ['P','P','K','K','K','K','K','K','K','SK','K','K','K','YO','K'],
  ['P','P','K','K','K','K','K','K','SK','K','K','YO','K','K','K'],
  ['P','P','K','K','K','K','K','SK','K','K','K','K','YO','K','K'],
  ['P','P','K','K','K','K','SK','K','K','K','YO','K','K','K','K'],
  ['P','P','K','K','K','SK','K','K','K','K','K','YO','K','K','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  ['P','P','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];

// Shared phrases (used verbatim many times in the PDF).
const HK_DS_FIRST_TW = 'insert the needle into the DS like k2tog or p2tog to work as one st, work 5 sts following the pattern, TW.';
// Left and right shoulders are mirror images, so the wide-rib edge stitches
// swap sides between them (checked against the knitted fabric, not the PDF's
// own note, which the pattern owner found unreliable/confusing).
const HK_FOLLOW_NOTE_LEFT = 'Working in pattern: RS rows are worked from the neck side to the armhole side: p1 on the neck side, then [k13, p2], and finish the row with p1. WS rows are worked from the armhole side to the neck side: k1 on the armhole side, then [p13, k2]. For the neckline increases, use the backward-loop cast on.';
const HK_FOLLOW_NOTE_RIGHT = 'Working in pattern: RS rows are worked from the armhole side to the neck side: p1, then [k13, p2]. WS rows are worked from the neck side to the armhole side: p2, then [k2, p13], and finish the row with k1. For the neckline increases, use the backward-loop cast on.';

// "k8, p2, k0" style run — a zero-length stitch run is simply left out.
function hkRun(...parts) {
  return parts.filter(p => p[1] > 0).map(p => `${p[0]}${p[1]}`).join(', ');
}
const hkCm = (inch, cm) => `${inch}" / ${cm} cm`;

function buildHatsukiPhases(z) {
  const S = a => a[z];                                   // pick this size's value
  const has = (...idx) => idx.includes(z);               // "*Size 1 (2, -, 4, 5, -)" style groups
  const e = (id, text) => ({ kind: 'row', id, text });
  const n = (id, text, extra) => Object.assign({ kind: 'note', id, text }, extra || {});
  const rep = (id, text, times, rows) => ({ kind: 'repeat', id, text, times, rows });

  const CO       = S([41, 48, 51, 56, 63, 68]);
  const A        = S([10, 2, 5, 10, 2, 7]);              // "to 10 (2, 5, 10, 2, 7) sts bef end"
  const FRONT_TOTAL = S([135, 150, 165, 180, 195, 210]);
  const SHOULDER_TOTAL = S([59, 66, 71, 74, 81, 86]);
  const BACK_SHOULDER_TOTAL = S([52, 59, 63, 68, 74, 81]);
  const ARMHOLE = hkCm(S([9.5, 10, 10.25, 10.75, 10.75, 11]), S([24, 25, 26, 27, 27, 28]));
  const LEAF_COLS = S([7, 8, 9, 10, 11, 12]);

  // ── Materials ──────────────────────────────────────────────
  const materials = {
    id: 'hk-mat', name: 'Materials', desc: 'Before you start',
    entries: [
      n('hk-m1', `Size ${HATSUKI_SIZES[z].name} — finished chest ${hkCm(HATSUKI_SIZES[z].inch, HATSUKI_SIZES[z].cm)}. Wear with 6–15.75" / 15–40 cm positive ease at the chest (both samples are size 2 with 42 cm ease).`),
      n('hk-m2', `Yarn — Sample A: Trio 2 by Isager Yarn (50% linen/flax, 30% cotton, 20% Tencel/lyocell, 50 g = 191 yds / 175 m), ${S([5, 5, 6, 7, 8, 8])} balls. Sample B: Parade by amirisu (60% wool, 20% cotton, 10% silk, 10% linen/flax, 100 g = 420 yds / 384 m), ${S([2, 3, 3, 3, 4, 4])} skeins. Or fingering-weight yarn: ${S([831, 924, 1110, 1202, 1383, 1520])} yds / ${S([760, 845, 1015, 1100, 1265, 1390])} m.`),
      n('hk-m3', 'Needles — US 2 (2.75 mm) circular for the hem, armholes and neckline. US 4 (3.5 mm) circular for the body.'),
      n('hk-m4', 'Gauge — 25 sts x 30 rows = 4" / 10 cm in main stitch on US 4 (3.5 mm) after blocking. One repeat of the Leaf chart (15 sts x 20 rows) = 2.5" / 6 cm square on US 4 after blocking.'),
      n('hk-m5', 'Notions — stitch markers, removable markers, stitch holder or scrap yarn, tapestry needle.'),
      n('hk-m6', 'Main stitch / wide rib — RS: *k13, p2* rep. WS: *k2, p13* rep.'),
      n('hk-m7', `Finished measurements — A. chest ${hkCm(HATSUKI_SIZES[z].inch, HATSUKI_SIZES[z].cm)}; B. length ${hkCm(S([18.25, 18.25, 19.75, 19.75, 21.25, 21.25]), S([46, 46, 50, 50, 54, 54]))}; C. neck width ${hkCm(S([8.25, 8.5, 10, 10.5, 10.75, 11.5]), S([21, 21.5, 25, 27, 27.5, 29.5]))}; D. sleeve hole ${hkCm(S([15, 15.75, 16.5, 17.5, 17.5, 17.75]), S([38, 40, 42, 44, 44, 45]))}; E. one shoulder ${hkCm(S([8.25, 9.5, 10, 10.5, 11.75, 12.5]), S([21, 24, 25, 27, 30, 32]))}.`),
      n('hk-m8', 'How it is made — knit top down, starting from each front shoulder; join them and start the Leaf pattern at a fixed position down the front. Then pick up from the shoulder cast-on edges for the left and right back, join them and work the back to the underarms (no leaf pattern on the back). Finally join back and front and work in the round. The total length is intentionally cropped; it can be extended. Cotton and linen yarns get heavier and longer with finishing, so knit cropped first.'),
    ]
  };

  // ── Leaf chart reference ───────────────────────────────────
  const leaf = {
    id: 'hk-leaf', name: 'Leaf chart', desc: '15 sts · 20 rows · worked flat',
    hasChart: true, flatChart: true, chart: HATSUKI_LEAF_CHART,
    entries: [
      n('hk-l1', 'The chart is worked flat: odd rows are RS, even rows are WS. Two purl columns (stitches 14–15) sit at the edge of every repeat.', { postChart: true }),
      n('hk-l2', 'In the round, every round is worked on the RS — the written rounds are below.', { postChart: true, bullets: HATSUKI_LEAF_ROUND.map((t, i) => `Rnd ${i + 1}: ${t}`) }),
    ]
  };

  // One 20-row frame of the Leaf chart. `spec(i)` is the marker instruction
  // that goes in front of the chart row on flat row i (0-based).
  const leafFlatRows = (id, spec) => HATSUKI_LEAF_FLAT.map((t, i) => ({
    id: `${id}-${i + 1}`,
    text: `Row ${i + 1} (${i % 2 ? 'WS' : 'RS'}): Work following the pattern to M, SM, ${spec(i + 1)}, SM, work following the pattern to end. — Leaf row ${i + 1}: ${t}`
  }));
  const leafRoundRows = (id) => HATSUKI_LEAF_ROUND.map((t, i) => ({
    id: `${id}-${i + 1}`,
    text: `Rnd ${i + 1}: Work the front wide rib to M, SM, Leaf chart rnd ${i + 1} to M, SM, then the rest of the round as established. — Leaf rnd ${i + 1}: ${t}`
  }));

  // ── Left front shoulder ────────────────────────────────────
  // After row 15, `t1` extra 2-row repeats, then a CO-2 row pair repeated t2 times.
  const lfR = S([12, 14, 16, 16, 18, 20]);          // rows 7..lfR repeat rows 5–6
  const lfTimes = S([3, 4, 5, 5, 6, 7]);
  const lfR13 = lfR + 1, lfR14 = lfR + 2, lfR15 = lfR + 3;
  const lfT1 = S([2, 1, 0, 2, 1, 0]);
  const lfB = lfR15 + 2 * lfT1 + 1;                 // the first CO-2 row
  const lfT2 = S([4, 4, 5, 3, 3, 3]);
  const lfLast = lfB + 2 + 2 * lfT2;
  const lfRow3 = `Work following the pattern to DS, ${HK_DS_FIRST_TW}`;
  const lfRow14 = 'Work following the pattern to 1 st bef end, pbf. 1 st inc\'d.';
  const leftFront = {
    id: 'hk-lf', name: 'Left front shoulder', desc: 'German short rows · US 4',
    entries: [
      n('hk-lf0', `With US 4 (3.5 mm) needles and the long-tail cast on, CO ${CO} sts.`),
      e('hk-lf-su', `Set-up row (WS): K1, *p13, k2* rep to ${A} sts bef end, p${A}.`),
      n('hk-lf-n', HK_FOLLOW_NOTE_LEFT),
      e('hk-lf-1', `Row 1 (RS): ${hkRun(['K', S([8, 2, 5, 10, 2, 7])], ['p', S([0, 2, 2, 2, 2, 2])], ['k', S([0, 7, 0, 1, 7, 3])])}, TW.`),
      e('hk-lf-2', `Row 2 (WS): DS, ${hkRun(['p', S([7, 6, 0, 0, 6, 2])], ['k', S([0, 2, 1, 2, 2, 2])], ['p', S([0, 2, 5, 10, 2, 7])])}.`),
      e('hk-lf-3', `Row 3 (RS): ${lfRow3}`),
      e('hk-lf-4', 'Row 4 (WS): DS, work following the pattern to 1 st bef end, pbf. 1 st inc\'d.'),
      e('hk-lf-5', `Row 5 (RS): ${lfRow3}`),
      e('hk-lf-6', 'Row 6 (WS): DS, work following the pattern to 1 st bef end, pbf. 1 st inc\'d.'),
      rep('hk-lf-a', `Rows 7–${lfR}: rep rows 5–6, ${lfTimes} more times (${lfTimes} sts inc'd)`, lfTimes, [
        { id: 'hk-lf-a-1', text: `Row 5 (RS): ${lfRow3}` },
        { id: 'hk-lf-a-2', text: 'Row 6 (WS): DS, work following the pattern to 1 st bef end, pbf. 1 st inc\'d.' },
      ]),
      e('hk-lf-13', `Row ${lfR13} (RS): Work following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work following the pattern to end.`),
      e('hk-lf-14', `Row ${lfR14} (WS): ${lfRow14}`),
      e('hk-lf-15', `Row ${lfR15} (RS): Work following the pattern to end.`),
      ...(lfT1 ? [rep('hk-lf-b', `Rows ${lfR15 + 1}–${lfR15 + 2 * lfT1}: rep last two rows, ${lfT1} more time(s) (${lfT1} st(s) inc'd)`, lfT1, [
        { id: 'hk-lf-b-1', text: `Row ${lfR14} (WS): ${lfRow14}` },
        { id: 'hk-lf-b-2', text: `Row ${lfR15} (RS): Work following the pattern to end.` },
      ])] : []),
      e('hk-lf-c1', `Row ${lfB} (WS): Work following the pattern to end, CO 2 sts. 2 sts inc'd.`),
      e('hk-lf-c2', `Row ${lfB + 1} (RS): Work following the pattern to end.`),
      rep('hk-lf-c', `Rows ${lfB + 2}–${lfLast - 1}: rep last two rows ${lfT2} more times (${2 * lfT2} sts inc'd)`, lfT2, [
        { id: 'hk-lf-c-1', text: `Row ${lfB} (WS): Work following the pattern to end, CO 2 sts. 2 sts inc'd.` },
        { id: 'hk-lf-c-2', text: `Row ${lfB + 1} (RS): Work following the pattern to end.` },
      ]),
      e('hk-lf-end', `Row ${lfLast} (WS): Work following the pattern to end. Break the yarn, then place the left front shoulder sts onto a holder or scrap yarn. ${SHOULDER_TOTAL} sts.`),
    ]
  };

  // ── Right front shoulder ───────────────────────────────────
  const rfTimes = S([4, 5, 5, 6, 7, 8]);            // rep rows 4–5
  const rfE = 5 + 2 * rfTimes;                       // last row of that repeat
  const rfR14 = rfE + 1, rfR15 = rfE + 2, rfR16 = rfE + 3;
  const rfT1 = S([2, 1, 1, 2, 1, 0]);
  const rfB = rfR16 + 2 * rfT1 + 1;                  // the CO-2 row (RS)
  const rfT2 = S([4, 4, 5, 3, 3, 3]);
  const rfRow4 = `Work following the pattern to DS, ${HK_DS_FIRST_TW}`;
  const rfRow5 = 'DS, work following the pattern to 1 st bef end, kfb. 1 st inc\'d.';
  const rightFront = {
    id: 'hk-rf', name: 'Right front shoulder', desc: 'German short rows · US 4',
    entries: [
      n('hk-rf0', `With US 4 (3.5 mm) needles and the long-tail cast on, CO ${CO} sts.`),
      e('hk-rf-su', `Set-up row (WS): P${A}, *k2, p13* rep to 1 st bef end, k1.`),
      e('hk-rf-1', `Row 1 (RS): P1, *k13, p2* rep to ${A} sts bef end, k${A}.`),
      e('hk-rf-2', `Row 2 (WS): ${hkRun(['P', S([8, 2, 5, 10, 2, 7])], ['K', S([0, 2, 1, 2, 2, 2])], ['P', S([0, 7, 0, 1, 7, 3])])}, TW.`),
      e('hk-rf-3', 'Row 3 (RS): DS, work following the pattern to end.'),
      e('hk-rf-4', `Row 4 (WS): ${rfRow4}`),
      e('hk-rf-5', `Row 5 (RS): ${rfRow5}`),
      rep('hk-rf-a', `Rows 6–${rfE}: rep rows 4–5, ${rfTimes} more times (${rfTimes} sts inc'd)`, rfTimes, [
        { id: 'hk-rf-a-1', text: `Row 4 (WS): ${rfRow4}` },
        { id: 'hk-rf-a-2', text: `Row 5 (RS): ${rfRow5}` },
      ]),
      e('hk-rf-14', `Row ${rfR14} (WS): Work following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work following the pattern to end.`),
      e('hk-rf-15', `Row ${rfR15} (RS): Work following the pattern to 1 st bef end, kfb. 1 st inc'd.`),
      e('hk-rf-16', `Row ${rfR16} (WS): Work following the pattern to end.`),
      ...(rfT1 ? [rep('hk-rf-b', `Rows ${rfR16 + 1}–${rfR16 + 2 * rfT1}: rep last two rows, ${rfT1} more time(s) (${rfT1} st(s) inc'd)`, rfT1, [
        { id: 'hk-rf-b-1', text: `Row ${rfR15} (RS): Work following the pattern to 1 st bef end, kfb. 1 st inc'd.` },
        { id: 'hk-rf-b-2', text: `Row ${rfR16} (WS): Work following the pattern to end.` },
      ])] : []),
      e('hk-rf-c1', `Row ${rfB} (RS): Work following the pattern to end, CO 2 sts. 2 sts inc'd.`),
      e('hk-rf-c2', `Row ${rfB + 1} (WS): Work following the pattern to end.`),
      rep('hk-rf-c', `Rows ${rfB + 2}–${rfB + 1 + 2 * rfT2}: rep last two rows, ${rfT2} more times (${2 * rfT2} sts inc'd)`, rfT2, [
        { id: 'hk-rf-c-1', text: `Row ${rfB} (RS): Work following the pattern to end, CO 2 sts. 2 sts inc'd.` },
        { id: 'hk-rf-c-2', text: `Row ${rfB + 1} (WS): Work following the pattern to end.` },
      ]),
      n('hk-rf-end', `Do not break the yarn — turn to RS and go on to the next section. ${SHOULDER_TOTAL} sts.`),
    ]
  };

  // ── Front ──────────────────────────────────────────────────
  const centerDepth = hkCm(S([4, 4, 3.25, 3.25, 2.5, 2.5]), S([10, 10, 8, 8, 6, 6]));
  const reps1 = S([1, 2, 1, 2, 1, 2]);
  const repsWord = reps1 === 1 ? 'once' : 'twice';
  const front = {
    id: 'hk-front', name: 'Front', desc: 'Join the shoulders · Leaf chart',
    entries: [
      e('hk-fr-join', `Next row (RS): Work following the pattern to end, CO ${S([17, 18, 23, 32, 33, 38])} sts, return the left front shoulder sts to the needle with the RS facing, continue following the pattern to end. ${FRONT_TOTAL} sts.`),
      e('hk-fr-ws', 'Next row (WS): K1, p13, *k2, p13* rep to 1 st bef end, k1.'),
      e('hk-fr-rs', 'Next row (RS): P1, k13, *p2, k13* rep to 1 st bef end, p1.'),
      n('hk-fr-until', `Rep the last two rows until the center of the front measures ${centerDepth}, ending with a WS row.`),
      n('hk-fr-pm', has(0, 2, 4)
        ? 'Set-up markers (removable), RS facing: PM at the beginning of the K in the center column of the wide ribs, PM at the end of the P2 on the left of the same center column — 15 sts between the markers, which is a guideline on the Leaf chart.'
        : 'Set-up markers (removable), RS facing: PM at the beginning of the K of the wide rib in the right column of the center two columns, PM at the end of the P2 in the left column of the two center columns — 30 sts between the markers, which is a guideline on the Leaf chart.'),
      rep('hk-fr-leaf1', `Leaf chart, first frame — rows 1–20, chart rep ${repsWord} between the markers`, 1,
        leafFlatRows('hk-fr-l1', i => `rep Leaf chart row ${i} ${repsWord}`)),
      n('hk-fr-pm2', 'Set-up markers: replace the M on each side of the Leaf chart outward by 15 sts each.'),
      rep('hk-fr-leaf2', 'Leaf chart, second frame — rows 1–20, rep the chart to M', 1,
        leafFlatRows('hk-fr-l2', i => `rep Leaf chart row ${i} to M`)),
      n('hk-fr-more', `Continue knitting the front repeating that frame (markers 15 sts further out each time). At the same time, when the armhole measures ${ARMHOLE} from the shoulder tip (finished on a WS row), break the yarn and place all sts on a holder or scrap yarn. ${FRONT_TOTAL} sts.`),
      n('hk-fr-rec', 'Keep a record of the Leaf chart row you ended on — the chart is resumed after the front and back are joined.'),
    ]
  };

  // ── Right back shoulder ────────────────────────────────────
  const rbR2Inc = has(0, 1, 5);
  const rbRow3 = `Work following the pattern to DS, ${HK_DS_FIRST_TW}`;
  const rbLong = has(2, 3, 4, 5);
  const rightBack = {
    id: 'hk-rb', name: 'Right back shoulder', desc: 'Pick up from the right shoulder edge',
    entries: [
      e('hk-rb-pu', `With US 4 (3.5 mm) needles and the front body RS facing, pick up and k${CO} sts from the CO edge of the right shoulder.`),
      e('hk-rb-su', `Set-up row (WS): K1, *p13, k2* rep to ${A} sts bef end, p${A - 1}, pbf. 1 st inc'd.`),
      n('hk-rb-n', HK_FOLLOW_NOTE_RIGHT),
      e('hk-rb-1', `Row 1 (RS): ${hkRun(['K', S([9, 3, 6, 11, 3, 8])], ['p', S([0, 2, 2, 2, 2, 2])], ['k', S([0, 7, 0, 1, 7, 3])])}, TW.`),
      e('hk-rb-2', rbR2Inc
        ? 'Row 2 (WS): DS, work following the pattern to end, CO 2 sts. 2 sts inc\'d.'
        : 'Row 2 (WS): DS, work following the pattern to 1 st bef end, pbf. 1 st inc\'d.'),
      e('hk-rb-3', `Row 3 (RS): ${rbRow3}`),
      e('hk-rb-4', 'Row 4 (WS): DS, work following the pattern to end, CO 2 sts. 2 sts inc\'d.'),
      e('hk-rb-5', 'Row 5 (RS): Same as row 3.'),
      e('hk-rb-6', `Row 6 (WS): DS, work following the pattern to end, CO ${S([3, 3, 2, 2, 2, 2])} sts. ${S([3, 3, 2, 2, 2, 2])} sts inc'd.`),
      e('hk-rb-7', 'Row 7 (RS): Same as row 3.'),
      e('hk-rb-8', `Row 8 (WS): DS, work following the pattern to end, CO ${S([3, 3, 3, 3, 2, 3])} sts. ${S([3, 3, 3, 3, 2, 3])} sts inc'd.`),
      e('hk-rb-9', 'Row 9 (RS): Same as row 3.'),
      ...(rbLong ? [
        e('hk-rb-10', 'Row 10 (WS): DS, work following the pattern to end, CO 3 sts. 3 sts inc\'d.'),
        e('hk-rb-11', 'Row 11 (RS): Same as row 3.'),
        e('hk-rb-12', `Row 12 (WS): DS, work following the pattern to end. Break the yarn, then place the right back shoulder sts onto a holder or scrap yarn. ${BACK_SHOULDER_TOTAL} sts.`),
      ] : [
        e('hk-rb-10', `Row 10 (WS): DS, work following the pattern to end. Break the yarn, then place the right back shoulder sts onto a holder or scrap yarn. ${BACK_SHOULDER_TOTAL} sts.`),
      ]),
    ]
  };

  // ── Left back shoulder ─────────────────────────────────────
  const lbRow4 = `Work following the pattern to DS, ${HK_DS_FIRST_TW}`;
  const leftBack = {
    id: 'hk-lb', name: 'Left back shoulder', desc: 'Pick up from the left shoulder edge',
    entries: [
      e('hk-lb-pu', `With US 4 (3.5 mm) needles and the front body RS facing, pick up and k${CO} sts from the CO edge of the left shoulder.`),
      e('hk-lb-su', `Set-up row (WS): P${A}, *k2, p13* rep to 1 st bef end, k1.`),
      e('hk-lb-1', `Row 1 (RS): P1, *k13, p2* rep to ${A} sts bef end, k${A - 1}, kfb. 1 st inc'd.`),
      e('hk-lb-2', `Row 2 (WS): ${hkRun(['P', S([9, 3, 6, 11, 3, 8])], ['k', S([0, 2, 2, 2, 2, 2])], ['p', S([0, 7, 0, 1, 7, 3])])}, TW.`),
      e('hk-lb-3', rbR2Inc
        ? 'Row 3 (RS): DS, work following the pattern to end, CO 2 sts. 2 sts inc\'d.'
        : 'Row 3 (RS): DS, work following the pattern to 1 st bef end, kfb. 1 st inc\'d.'),
      e('hk-lb-4', `Row 4 (WS): ${lbRow4}`),
      e('hk-lb-5', 'Row 5 (RS): DS, work following the pattern to end, CO 2 sts. 2 sts inc\'d.'),
      e('hk-lb-6', 'Row 6 (WS): Same as row 4.'),
      e('hk-lb-7', `Row 7 (RS): DS, work following the pattern to end, CO ${S([3, 3, 2, 2, 2, 2])} sts. ${S([3, 3, 2, 2, 2, 2])} sts inc'd.`),
      e('hk-lb-8', 'Row 8 (WS): Same as row 4.'),
      e('hk-lb-9', `Row 9 (RS): DS, work following the pattern to end, CO ${S([3, 3, 3, 3, 2, 3])} sts. ${S([3, 3, 3, 3, 2, 3])} sts inc'd.`),
      e('hk-lb-10', 'Row 10 (WS): Same as row 4.'),
      ...(rbLong ? [
        e('hk-lb-11', 'Row 11 (RS): DS, work following the pattern to end, CO 3 sts. 3 sts inc\'d.'),
        e('hk-lb-12', 'Row 12 (WS): Same as row 4.'),
      ] : []),
    ]
  };

  // ── Back ───────────────────────────────────────────────────
  const bc = S([11, 11, 13, 13, 13, 13]);              // the joining row
  const bPairs = S([0, 1, 0, 1, 2, 3]);                // extra "DS … TW" row pairs
  const bX = bc + 2 + 2 * bPairs;                      // first row that works to the end
  const bDS = 'DS, work following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work 5 sts following the pattern, TW.';
  const back = {
    id: 'hk-back', name: 'Back', desc: 'Join the back shoulders · to the underarm',
    entries: [
      e('hk-bk-join', `Row ${bc} (RS): DS, work following the pattern to end, CO ${S([31, 32, 39, 44, 47, 48])} sts, return the right back shoulder sts to the needle with the RS facing, continue following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work 5 sts following the pattern, TW. ${FRONT_TOTAL} sts.`),
      e('hk-bk-2', `Row ${bc + 1} (WS): ${bDS}`),
      ...(bPairs >= 1 ? [
        e('hk-bk-3', `Row ${bc + 2} (RS): ${bDS}`),
        e('hk-bk-4', `Row ${bc + 3} (WS): Same as row ${bc + 1}.`),
      ] : []),
      ...(bPairs >= 2 ? [rep('hk-bk-r', `Rows ${bc + 4}–${bc + 3 + 2 * (bPairs - 1)}: rep rows ${bc + 2}–${bc + 3}, ${bPairs - 1} more time(s)`, bPairs - 1, [
        { id: 'hk-bk-r-1', text: `Row ${bc + 2} (RS): ${bDS}` },
        { id: 'hk-bk-r-2', text: `Row ${bc + 3} (WS): Same as row ${bc + 1}.` },
      ])] : []),
      e('hk-bk-x1', `Row ${bX} (RS): DS, work following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work following the pattern to end.`),
      e('hk-bk-x2', `Row ${bX + 1} (WS): Work following the pattern to DS, insert the needle into the DS like k2tog or p2tog to work as one st, work following the pattern to end.`),
      e('hk-bk-rs', 'Next row (RS): P1, k13, *p2, k13* rep to 1 st bef end, p1.'),
      e('hk-bk-ws', 'Next row (WS): K1, p13, *k2, p13* rep to 1 st bef end, k1.'),
      n('hk-bk-until', `Rep the last two rows until the back body measures ${S([24, 25, 26, 27, 27, 28])} cm from the shoulder tip, ending with a WS row. Do not break the yarn — TW and go on to the next section.`),
    ]
  };

  // ── Join & body ────────────────────────────────────────────
  const body = {
    id: 'hk-body', name: 'Body', desc: 'Join front and back · in the round',
    entries: [
      e('hk-bd-join', `Connect the front and back body — P1, k13, *p2, k13* rep to 1 st bef end, PM, p1, CO 5 sts, return the front body sts to the needle with the RS facing, p1, PM for BOR, *k13, p2* rep to M, SM, rep the following row of the Leaf chart to M, SM, k13, *p2, k13* rep to 1 st bef end, PM, p1, CO 5 sts, p1 (back body), PM, k13, *p2, k13* rep to M, SM, p1, *k1, p1* rep to M (BOR). ${S([280, 310, 340, 370, 400, 430])} sts.`),
      e('hk-bd-1', 'Next rnd: *K13, p2* rep to M, SM, rep the Leaf chart (round knitting) to M, SM, k13, *p2, k13* rep to M, SM, p1, *k1, p1* rep to M, SM, k13, *p2, k13* rep to M, SM, p1, *k1, p1* rep to end.'),
      n('hk-bd-n1', 'Continue the wide rib and the 1x1 rib on each side until Row 20 of the Leaf chart.'),
      n('hk-bd-pm', 'Set-up markers: replace the M on each side of the Leaf chart outward by 15 sts each. Continue with the main wide rib and the 1x1 rib on both sides, working Rows 1–20 of the Leaf chart.'),
      rep('hk-bd-leaf', 'Leaf chart in the round — rnds 1–20 (resume where the front ended)', 1, leafRoundRows('hk-bd-l')),
      n('hk-bd-more', `Rep the work in that frame until the Leaf chart is ${LEAF_COLS} columns wide in total. To extend the body length, it is best to end at the 10th or 20th row of the Leaf chart. On the last rnd, RM both sides of the Leaf chart.`),
    ]
  };

  // ── Hem & edgings ──────────────────────────────────────────
  const decrease = has(1, 3, 5);
  const ribEdge = (id) => [
    rep(`${id}-rib`, 'Rnds 1–5: *P1, k1* rep to end', 5, [{ id: `${id}-rib-1`, text: 'Rnd: *P1, k1* rep to end.' }]),
    rep(`${id}-k`, 'Rnds 6–9: K to end', 4, [{ id: `${id}-k-1`, text: 'Rnd: K to end.' }]),
    e(`${id}-bo`, 'BO all sts knitwise — not too tight.'),
  ];
  const edgings = {
    id: 'hk-edge', name: 'Hem & edgings', desc: 'US 2 · rib + knit edge',
    entries: [
      n('hk-hm0', 'Change to US 2 (2.75 mm) needles.'),
      e('hk-hm-su', decrease
        ? `Set-up rnd (decrease): RM (BOR), k1, k2tog, k10, *p2, k13* rep to M, RM, p1, *k1, p1* rep to M, RM, k1, k2tog, k10, *p2, k13* rep to M, SM (new BOR). ${S([0, 308, 0, 368, 0, 428])} sts.`
        : 'Set-up rnd (no decrease): RM (BOR), k13, *p2, k13* rep to M, RM, p1, *k1, p1* rep to M, RM, k13, *p2, k13* rep to M, SM (new BOR).'),
      n('hk-hm-h', 'Hem — Rib + K edge:'),
      ...ribEdge('hk-hm'),
      n('hk-sl0', 'Sleeve-hole (same for left and right) — with US 2 (2.75 mm) needles and the RS facing, attach the yarn. Begin at the underarm: pick up and k7 from the ribbing, continue picking up and knitting along the armhole, through the shoulder tip to just before the rib under the sleeve, picking up so the total is an even number (about 3 sts from every 4 rows). PM for BOR and join to work in the rnd.'),
      ...ribEdge('hk-sl1'),
      n('hk-sl2', 'Repeat the sleeve-hole on the other armhole.'),
      ...ribEdge('hk-sl3'),
      n('hk-nk0', `Neckline — with US 2 (2.75 mm) needles and the RS facing, attach the yarn. Begin at the left shoulder seam: pick up and k${S([83, 86, 93, 104, 105, 110])} from the front neckline, then pick up and k${S([59, 60, 69, 76, 79, 82])} from the back neckline. PM for BOR and join to work in the rnd. ${S([142, 146, 162, 180, 184, 192])} sts.`),
      ...ribEdge('hk-nk'),
    ]
  };

  const finishing = {
    id: 'hk-fin', name: 'Finishing', desc: 'Weave in and block',
    entries: [
      n('hk-fn1', 'Weave in all ends and wet block to the measurements.'),
      n('hk-fn2', 'While blocking, keep the natural curl / line at the hem edge, the sleeve holes and the neckline edge — do not stretch it out.'),
    ]
  };

  // The PDF states "following the pattern" once (Left front / Right back) but
  // it governs every row that uses the phrase (the meaning is spelled out in place of the phrase), on all four shoulders, the front
  // join and the back. Repeat the meaning on each such row rather than relying
  // on a note that may be several rows away. Text only — structHash is unaffected.
  // Wording set by the owner: what "following the pattern" means on each side.
  // Left wording (checked against the fabric): RS neck→armhole, p1 on the
  // neck side then [k13, p2], finishing with p1; WS armhole→neck, k1 on the
  // armhole side then [p13, k2]. Right shoulders are the mirror image — same
  // two directions, but the edge stitches and the "finish with" stitch swap.
  const FOLLOW_RS_LEFT = 'in pattern on the RS, neck → armhole (p1 on the neck side, [k13, p2])';
  const FOLLOW_WS_LEFT = 'in pattern on the WS, armhole → neck (k1 on the armhole side, [p13, k2])';
  const FOLLOW_RS_RIGHT = 'in pattern on the RS, armhole → neck (p1, [k13, p2])';
  const FOLLOW_WS_RIGHT = 'in pattern on the WS, neck → armhole (p2, [k2, p13], finish with k1)';
  const makeFollowInline = (rsText, wsText) => r => {
    const side = (r.text.match(/\((RS|WS)\)/) || [])[1];
    r.text = r.text.replace(/following the pattern/g, side === 'WS' ? wsText : rsText);
  };
  const followInlineLeft = makeFollowInline(FOLLOW_RS_LEFT, FOLLOW_WS_LEFT);
  const followInlineRight = makeFollowInline(FOLLOW_RS_RIGHT, FOLLOW_WS_RIGHT);
  const CO_HINT = '[Neckline increase: backward-loop cast on.] ';
  const annotateWith = followInline => r => {
    if (/\bCO \d+ sts/.test(r.text) && !/^Set-up|^With /.test(r.text)) r.text = CO_HINT + r.text;
    followInline(r);
  };
  [[leftFront, followInlineLeft], [rightFront, followInlineRight],
   [rightBack, followInlineRight], [leftBack, followInlineLeft]].forEach(([ph, followInline]) => {
    const annotate = annotateWith(followInline);
    ph.entries.forEach(en => {
      if (en.kind === 'note') return;
      annotate(en);
      (en.rows || []).forEach(annotate);
    });
  });
  // Front / back joins and the back section use the phrase but their CO is the
  // neck join, not a neckline increase — follow-hint only. Neither is
  // shoulder-specific, so the left wording stands in as the generic default.
  [front, back].forEach(ph => ph.entries.forEach(en => {
    if (en.kind === 'note') return;
    followInlineLeft(en); (en.rows || []).forEach(followInlineLeft);
  }));

  // The full note belongs at the top of every shoulder that uses it.
  [[rightFront, HK_FOLLOW_NOTE_RIGHT, 2], [leftBack, HK_FOLLOW_NOTE_LEFT, 1]].forEach(([ph, note, idx]) =>
    ph.entries.splice(idx, 0, n(ph.id + '-follow', note)));

  return [materials, leaf, leftFront, rightFront, front, rightBack, leftBack, back, body, edgings, finishing];
}

const HATSUKI_NOTES = [
  // Defined in GLOSSARY (js/core/glossary.js) — deferred, no def of their own.
  { term: 'K' },
  { term: 'P', sym: 'P' },
  { term: 'YO', sym: 'YO' },
  { term: 'K2tog', sym: 'K2' },
  { term: 'P2tog' },
  { term: 'SSK', sym: 'SK' },
  { term: 'SSP' },
  { term: 'Kfb' },
  { term: 'BOR' },
  // Pattern-specific — 'DS' would otherwise match the tatting "Double stitch"
  // glossary entry, and Pbf is not in the glossary.
  { term: 'DS', def: 'Double stitch (German short row): after the turn, slip the first stitch with the yarn in front, then pull the working yarn to the back over the slipped stitch. This makes two legs (the double stitch) from the pulled stitch. When you reach it, work both legs together as one stitch.' },
  { term: 'Pbf', def: 'Purl into the back and then the front of the same stitch — one stitch increased.' },
  { term: 'TW', def: 'Turn work' },
  { term: 'M / PM / SM / RM', def: 'Marker / place marker / slip marker / remove marker' },
  { term: 'RS', def: 'Right side of your work' },
  { term: 'WS', def: 'Wrong side of your work' },
  { term: 'CO / BO', def: 'Cast on / bind off' },
  { term: 'Inc\'d', def: 'Increased (the number of stitches added by that row)' },
];

PATTERNS.push({
  id: 'hatsuki', name: 'Hatsuki', badge: 'Sizes 1–6',
  desc: 'Rievive · sleeveless top-down summer sweater with a Leaf lace panel',
  sizes: HATSUKI_SIZES,
  sizeHint: 'Sizes 1–6 (chest 43.75"–67.5" / 111–171 cm) — every stitch count in the project follows the size you pick, and it cannot be changed afterwards.',
  phases: [],                        // the template has none — buildPhases(size) does
  buildPhases: buildHatsukiPhases,
  notes: HATSUKI_NOTES,
});

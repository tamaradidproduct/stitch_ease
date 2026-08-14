// ─────────────────────────────────────────────
// LENORE — learnshuttletatting.com, Nevermore Pattern Club 2026 (Sparrow Kelley).
// Fingerless lace cuff, worked in two CTM "box" rows of rings and chains.
//
// A non-knitting pattern: has no chart (CHART_B/CHART_TOTAL stay empty, as
// with the tatted triangle). Stitch notation follows the source pattern's own
// shorthand — "Ring: 2 - 2 + 2 - 2" — rather than the triangle's ds/picot
// prose style: numbers are stitch counts, "-" is a picot, "+" is a join, and
// "---" is the pattern's long/decorative picot (kept verbatim, per the
// designer, rather than translated to a description).
//
// In tatting there are no rows; the unit of work is one ring or one chain.
// That is what a `row` entry means here, and it is what the Rows tally counts.
//
// Row 1 and Row 2 each repeat a ring+chain motif many times over (up to 12x).
// Those are `repeat` blocks whose rows are the individual rings and chains —
// which is exactly what the old model's "repeat unit" steps were reaching for
// with a counter plus a checkable bullet list, only now the position inside
// the motif is a real, storable thing rather than six loose booleans.
//
// `legacyCount:'passes'` on those blocks matters: the OLD counter on a
// repeat-unit step counted how many times the whole motif had been worked,
// not how many rings. Read as rows it would put a tatter a third of the way
// back through their cuff. See seedEntryProgress() in js/core/storage.js.
//
// A few repeats end early ("...ending with the twelfth Ring Q"): the pattern
// works the ring one more time than its paired chain. Those stay as a repeat
// block plus a trailing single `row` for the unpaired ring.
//
// Pattern data only. Registers itself into PATTERNS (declared in state.js).
// ─────────────────────────────────────────────
const LENORE_PHASES = [
  {
    id:'len-mat', name:'Materials', desc:'Before you start',
    entries:[
      {kind:'note', id:'lm1', text:'#10 Lizbeth Thread, in Cream'},
      {kind:'note', id:'lm2', text:'3/8" satin ribbon, for laces'},
    ]
  },
  {
    id:'len-row1', name:'Row 1', desc:'Top edge, then turn the corner and work back — begin CTM',
    entries:[
      {kind:'row', id:'r1-a', text:'Ring A: 4 - 6 - 2'},
      {kind:'row', id:'r1-b', text:'Ring B: 2 + 6 - 4 (join to Ring A)'},
      {kind:'row', id:'r1-c', text:'Chain C: 6'},
      {kind:'repeat', id:'r1-def-ghi', text:'Ring D – Chain I (repeat unit):', times:3, legacyCount:'passes', rows:[
        {id:'r1-def-ghi-1', text:'Ring D: 2 - 2 + 2 - 2 - 2 (join to Ring B, or to the last Ring L on repeats)'},
        {id:'r1-def-ghi-2', text:'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)'},
        {id:'r1-def-ghi-3', text:'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)'},
        {id:'r1-def-ghi-4', text:'Chain G: 4 - 2 - 2 - 2'},
        {id:'r1-def-ghi-5', text:'Ring H: 2 + 2 - 2 (join to Ring F)'},
        {id:'r1-def-ghi-6', text:'Chain I: 2 - 2 - 2 - 4'},
      ]},
      {kind:'row', id:'r1-j', text:'Ring J: 2 + 2 - 2 - 2 (join to last Ring F)'},
      {kind:'row', id:'r1-k', text:'Chain K: 2 - 2 - 2 - 2'},
      {kind:'row', id:'r1-l', text:'Ring L: 2 + 2 - 2 - 2 (join to Ring J)'},
      {kind:'row', id:'r1-i2', text:'Chain I: 2 - 2 - 2 - 4'},
      {kind:'repeat', id:'r1-def-ghi2', text:'Ring D – Chain I (repeat unit):', times:2, legacyCount:'passes', rows:[
        {id:'r1-def-ghi2-1', text:'Ring D: 2 - 2 + 2 - 2 - 2 (join to last Ring L, or to the previous repeat)'},
        {id:'r1-def-ghi2-2', text:'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)'},
        {id:'r1-def-ghi2-3', text:'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)'},
        {id:'r1-def-ghi2-4', text:'Chain G: 4 - 2 - 2 - 2'},
        {id:'r1-def-ghi2-5', text:'Ring H: 2 + 2 - 2 (join to Ring F)'},
        {id:'r1-def-ghi2-6', text:'Chain I: 2 - 2 - 2 - 4'},
      ]},
      {kind:'row', id:'r1-d2', text:'Ring D: 2 - 2 + 2 - 2 - 2 (join to the previous repeat) — final point, completes 6 Ring E’s total; stop after Ring F (no Chain G, Ring H, or Chain I this time)'},
      {kind:'row', id:'r1-e2', text:'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)'},
      {kind:'row', id:'r1-f2', text:'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)'},
      {kind:'row', id:'r1-m', text:'Chain M: 6'},
      {kind:'row', id:'r1-n', text:'Ring N: 4 + 6 - 2 (join to last Ring F)'},
      {kind:'row', id:'r1-o', text:'Ring O: 2 + 6 - 4 (join to Ring N)'},
      {kind:'row', id:'r1-p', text:'Chain P: 4'},
      {kind:'repeat', id:'r1-qr', text:'Ring Q – Chain R (repeat unit):', times:11, legacyCount:'passes', rows:[
        {id:'r1-qr-1', text:'Ring Q: 2 - 2 - 2 - 2 - 2 (four picots)'},
        {id:'r1-qr-2', text:'Chain R: 2 - 2 + 2 - 2 (join to the center picot of Chains G and I)'},
      ]},
      {kind:'row', id:'r1-q2', text:'Ring Q: 2 - 2 - 2 - 2 - 2 (four picots) — final repeat, no Chain R after this one'},
      {kind:'row', id:'r1-s', text:'Chain S: 4 — tie off at the base of Ring A and hide ends'},
    ]
  },
  {
    id:'len-row2', name:'Row 2', desc:'Joins to Row 1, same box method — begin CTM',
    entries:[
      {kind:'row', id:'r2-a', text:'Ring A: 4 - 4 - 2'},
      {kind:'row', id:'r2-b', text:'Ring B: 2 + 6 + 2 - 4 (join to Ring A, join to Ring A of Row 1)'},
      {kind:'row', id:'r2-c', text:'Chain C: 6'},
      {kind:'repeat', id:'r2-de', text:'Ring D – Chain E (repeat unit):', times:11, legacyCount:'passes', rows:[
        {id:'r2-de-1', text:'Ring D: 2 - 2 + 2 + 2 - 2 (join to Ring B, join to a Ring Q of Row 1)'},
        {id:'r2-de-2', text:'Chain E: 2 - 2 - 2 - 2'},
      ]},
      {kind:'row', id:'r2-d2', text:'Ring D: 2 - 2 + 2 + 2 - 2 (join to a Ring Q of Row 1) — final repeat, no Chain E after this one'},
      {kind:'row', id:'r2-f', text:'Chain F: 6'},
      {kind:'row', id:'r2-g', text:'Ring G: 6 + 2 + 4 - 2 (join to last Ring D, join to Ring O of Row 1)'},
      {kind:'row', id:'r2-h', text:'Ring H: 2 + 4 - 4 (join to Ring G)'},
      {kind:'row', id:'r2-i', text:'Chain I: 4'},
      {kind:'row', id:'r2-j', text:'Ring J: 4 + 2 - 2 - 2 (join to Ring H)'},
      {kind:'row', id:'r2-k', text:'Ring K: 2 + 4 - 1 --- 1 - 4 - 2 (join to Ring J)'},
      {kind:'row', id:'r2-l', text:'Ring L: 2 + 2 - 2 - 4 (join to Ring K)'},
      {kind:'row', id:'r2-m', text:'Chain M: 6'},
      {kind:'repeat', id:'r2-nopqrs', text:'Ring N – Chain S (repeat unit):', times:5, legacyCount:'passes', rows:[
        {id:'r2-nopqrs-1', text:'Ring N: 2 + 2 - 2 - 2 (join to Ring L, or to the previous repeat)'},
        {id:'r2-nopqrs-2', text:'Chain O: 2 - 2 + 2 - 4 (join to the center picot of Chain E)'},
        {id:'r2-nopqrs-3', text:'Ring P: 2 - 2 + 2 - 2 - 2 (join to Ring N)'},
        {id:'r2-nopqrs-4', text:'Ring Q: 2 + 6 - 1 --- 1 - 6 - 2 (join to Ring P)'},
        {id:'r2-nopqrs-5', text:'Ring R: 2 + 2 - 2 - 2 - 2 (join to Ring Q)'},
        {id:'r2-nopqrs-6', text:'Chain S: 4 - 2 - 2 + 2 - 2 (join to center picot of Chain E)'},
      ]},
      {kind:'row', id:'r2-n2', text:'Ring N: 2 + 2 - 2 - 2 (join to the previous repeat) — final repeat, no Chain O–S after this one'},
      {kind:'row', id:'r2-t', text:'Chain T: 6'},
      {kind:'row', id:'r2-u', text:'Ring U: 4 + 2 - 2 - 2 (join to last Ring N)'},
      {kind:'row', id:'r2-v', text:'Ring V: 2 + 4 - 1 --- 1 - 4 - 2 (join to Ring U)'},
      {kind:'row', id:'r2-x', text:'Ring X: 2 + 2 - 2 + 4 (join to Ring A)'},
      {kind:'row', id:'r2-y', text:'Chain Y: 4 — tie off at the base of Ring A and hide ends'},
    ]
  },
  {
    id:'len-fin', name:'Finishing', desc:'Complete the cuff',
    entries:[
      {kind:'note', id:'lf1', text:'Steam or wet block as preferred'},
      {kind:'note', id:'lf2', text:'Add ribbon ties or closure of choice'},
    ]
  },
];

PATTERNS.push(
  { id:'lenore', name:'Lenore', badge:'#10 thread · Nevermore 2026', desc:'Tatting · fingerless lace cuff with ribbon ties', phases: LENORE_PHASES,
    notes: [
      { term:'#', def:'Number of stitches in that segment' },
      { term:'-', def:'Picot' },
      { term:'---', def:'Long / decorative picot' },
      { term:'+', def:'Join' },
      { term:'Ring', def:'Shuttle 1 makes the visible stitches' },
      { term:'Chain', def:'Shuttle 2 makes the visible stitches' },
      { term:'CTM', def:'Continuous Thread Method' },
      { term:'', def:'Repeated motifs are one block; the counter tracks which ring or chain you are on and how many repeats remain.' },
    ] }
);

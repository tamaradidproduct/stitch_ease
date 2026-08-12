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
// Row 1 and Row 2 each repeat a ring+chain motif many times over (up to 12x)
// to build the lace edge. Rather than expanding every repeat into its own
// checkbox, repeated motifs use the row-counter mechanic (rows/target/lbl,
// the same one knitting phases use) so the tracker stays scannable; the
// one-off rings/chains around them stay plain checkbox steps. Because of
// that mix these two phases are NOT marked `countable` — countable phases
// count one checkbox as one unit and would double-count the row-counter
// steps (see toggleStep()/patternTotalRows() in app.js).
//
// A few repeats end early ("...ending with the twelfth Ring Q"): the pattern
// works the ring one more time than its paired chain. Those are modeled as
// two independent counters (ring target N, chain target N-1) so the last
// ring can be ticked without a matching chain.
//
// Pattern data only. Registers itself into PATTERNS (declared in state.js).
// ─────────────────────────────────────────────
const LENORE_PHASES = [
  {
    id:'len-mat', name:'Materials', desc:'Before you start',
    steps:[
      {id:'lm1', text:'#10 Lizbeth Thread, in Cream'},
      {id:'lm2', text:'3/8" satin ribbon, for laces'},
    ]
  },
  {
    id:'len-row1', name:'Row 1', desc:'Top edge, then turn the corner and work back — begin CTM',
    steps:[
      {id:'r1-a', text:'Ring A: 4 - 6 - 2'},
      {id:'r1-b', text:'Ring B: 2 + 6 - 4 (join to Ring A)'},
      {id:'r1-c', text:'Chain C: 6'},
      {id:'r1-def-ghi', text:'Ring D – Chain I (repeat unit):',
        bullets:[
          'Ring D: 2 - 2 + 2 - 2 - 2 (join to Ring B, or to the last Ring L on repeats)',
          'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)',
          'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)',
          'Chain G: 4 - 2 - 2 - 2',
          'Ring H: 2 + 2 - 2 (join to Ring F)',
          'Chain I: 2 - 2 - 2 - 4',
        ],
        rows:true, target:3, lbl:'repeat: Ring D – Chain I'},
      {id:'r1-j', text:'Ring J: 2 + 2 - 2 - 2 (join to last Ring F)'},
      {id:'r1-k', text:'Chain K: 2 - 2 - 2 - 2'},
      {id:'r1-l', text:'Ring L: 2 + 2 - 2 - 2 (join to Ring J)'},
      {id:'r1-i2', text:'Chain I: 2 - 2 - 2 - 4'},
      {id:'r1-def-ghi2', text:'Ring D – Chain I (repeat unit):',
        bullets:[
          'Ring D: 2 - 2 + 2 - 2 - 2 (join to last Ring L, or to the previous repeat)',
          'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)',
          'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)',
          'Chain G: 4 - 2 - 2 - 2',
          'Ring H: 2 + 2 - 2 (join to Ring F)',
          'Chain I: 2 - 2 - 2 - 4',
        ],
        rows:true, target:2, lbl:'repeat: Ring D – Chain I'},
      {id:'r1-d2', text:'Ring D: 2 - 2 + 2 - 2 - 2 (join to the previous repeat) — final point, completes 6 Ring E’s total; stop after Ring F (no Chain G, Ring H, or Chain I this time)'},
      {id:'r1-e2', text:'Ring E: 2 + 2 - 1 --- 1 - 2 - 2 (join to Ring D)'},
      {id:'r1-f2', text:'Ring F: 2 - + 2 - 2 - 2 - 2 (join to Ring E)'},
      {id:'r1-m', text:'Chain M: 6'},
      {id:'r1-n', text:'Ring N: 4 + 6 - 2 (join to last Ring F)'},
      {id:'r1-o', text:'Ring O: 2 + 6 - 4 (join to Ring N)'},
      {id:'r1-p', text:'Chain P: 4'},
      {id:'r1-q', text:'Ring Q: 2 - 2 - 2 - 2 - 2 (four picots)', rows:true, target:12, lbl:'repeat: Ring Q'},
      {id:'r1-r', text:'Chain R: 2 - 2 + 2 - 2 (join to the center picot of Chains G and I) — skip after the 12th Ring Q', rows:true, target:11, lbl:'repeat: Chain R'},
      {id:'r1-s', text:'Chain S: 4 — tie off at the base of Ring A and hide ends'},
    ]
  },
  {
    id:'len-row2', name:'Row 2', desc:'Joins to Row 1, same box method — begin CTM',
    steps:[
      {id:'r2-a', text:'Ring A: 4 - 4 - 2'},
      {id:'r2-b', text:'Ring B: 2 + 6 + 2 - 4 (join to Ring A, join to Ring A of Row 1)'},
      {id:'r2-c', text:'Chain C: 6'},
      {id:'r2-d', text:'Ring D: 2 - 2 + 2 + 2 - 2 (join to Ring B, join to a Ring Q of Row 1)', rows:true, target:12, lbl:'repeat: Ring D'},
      {id:'r2-e', text:'Chain E: 2 - 2 - 2 - 2 — skip after the 12th Ring D', rows:true, target:11, lbl:'repeat: Chain E'},
      {id:'r2-f', text:'Chain F: 6'},
      {id:'r2-g', text:'Ring G: 6 + 2 + 4 - 2 (join to last Ring D, join to Ring O of Row 1)'},
      {id:'r2-h', text:'Ring H: 2 + 4 - 4 (join to Ring G)'},
      {id:'r2-i', text:'Chain I: 4'},
      {id:'r2-j', text:'Ring J: 4 + 2 - 2 - 2 (join to Ring H)'},
      {id:'r2-k', text:'Ring K: 2 + 4 - 1 --- 1 - 4 - 2 (join to Ring J)'},
      {id:'r2-l', text:'Ring L: 2 + 2 - 2 - 4 (join to Ring K)'},
      {id:'r2-m', text:'Chain M: 6'},
      {id:'r2-n', text:'Ring N: 2 + 2 - 2 - 2 (join to Ring L, or to the previous repeat)', rows:true, target:5, lbl:'repeat: Ring N'},
      {id:'r2-opqrs', text:'Chain O – Chain S (repeat unit) — skip after the 5th Ring N:',
        bullets:[
          'Chain O: 2 - 2 + 2 - 4 (join to the center picot of Chain E)',
          'Ring P: 2 - 2 + 2 - 2 - 2 (join to Ring N)',
          'Ring Q: 2 + 6 - 1 --- 1 - 6 - 2 (join to Ring P)',
          'Ring R: 2 + 2 - 2 - 2 - 2 (join to Ring Q)',
          'Chain S: 4 - 2 - 2 + 2 - 2 (join to center picot of Chain E)',
        ],
        rows:true, target:4, lbl:'repeat: Chain O – Chain S'},
      {id:'r2-t', text:'Chain T: 6'},
      {id:'r2-u', text:'Ring U: 4 + 2 - 2 - 2 (join to last Ring N)'},
      {id:'r2-v', text:'Ring V: 2 + 4 - 1 --- 1 - 4 - 2 (join to Ring U)'},
      {id:'r2-x', text:'Ring X: 2 + 2 - 2 + 4 (join to Ring A)'},
      {id:'r2-y', text:'Chain Y: 4 — tie off at the base of Ring A and hide ends'},
    ]
  },
  {
    id:'len-fin', name:'Finishing', desc:'Complete the cuff',
    steps:[
      {id:'lf1', text:'Steam or wet block as preferred'},
      {id:'lf2', text:'Add ribbon ties or closure of choice'},
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
      { term:'', def:'Repeated rings/chains use a repeat counter; everything else is one step.' },
    ] }
);

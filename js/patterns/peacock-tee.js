// ─────────────────────────────────────────────
// PEACOCK TEE — Size S, 97 cm. Top-down raglan with a 44-row yoke chart.
//
// Pattern data only. Registers itself into PATTERNS (declared in state.js);
// the active-pattern pointers PHASES / CHART_B / CHART_TOTAL are set from
// this entry by applyPattern() when a project is opened.
//
// Chart tokens: K=knit  P=purl  YO=yarn over  K2=k2tog  SK=SKPO  M1=make one
//               E=no-stitch (an empty cell used to centre the motif)
// PEACOCK_CHART[0] = row 1, worked first, displayed at the visual bottom.
// PEACOCK_CHART[43] = row 44, worked last, displayed at the visual top.
// ─────────────────────────────────────────────
const PEACOCK_CHART = [
  // Row 1
  ['E','E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E','E'],
  // Row 2
  ['E','E','E','E','E','E','E','P','P','K','K','K','K','K','P','P','E','E','E','E','E','E','E'],
  // Row 3
  ['E','E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E','E'],
  // Row 4
  ['E','E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E','E'],
  // Row 5 — lace
  ['E','E','E','E','E','E','SK','K','YO','K','YO','K','YO','K','YO','K','K2','E','E','E','E','E','E'],
  // Row 6
  ['E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E'],
  // Row 7
  ['E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E'],
  // Row 8
  ['E','E','E','E','E','E','P','P','P','K','K','K','K','K','P','P','P','E','E','E','E','E','E'],
  // Row 9
  ['E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E'],
  // Row 10
  ['E','E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E','E'],
  // Row 11 — lace
  ['E','E','E','E','E','K','SK','K','YO','K','YO','K','YO','K','YO','K','K2','K','E','E','E','E','E'],
  // Row 12
  ['E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E'],
  // Row 13
  ['E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E'],
  // Row 14
  ['E','E','E','E','E','P','P','P','P','K','K','K','K','K','P','P','P','P','E','E','E','E','E'],
  // Row 15
  ['E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E'],
  // Row 16
  ['E','E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E','E'],
  // Row 17 — lace
  ['E','E','E','E','SK','SK','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K2','K2','E','E','E','E'],
  // Row 18
  ['E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E'],
  // Row 19
  ['E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E'],
  // Row 20
  ['E','E','E','E','P','P','P','K','K','K','K','K','K','K','K','K','P','P','P','E','E','E','E'],
  // Row 21
  ['E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E'],
  // Row 22
  ['E','E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E','E'],
  // Row 23 — lace
  ['E','E','E','SK','SK','K','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K','K2','K2','E','E','E'],
  // Row 24
  ['E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E'],
  // Row 25
  ['E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E'],
  // Row 26
  ['E','E','E','P','P','P','P','K','K','K','K','K','K','K','K','K','P','P','P','P','E','E','E'],
  // Row 27
  ['E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E'],
  // Row 28
  ['E','E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E','E'],
  // Row 29 — lace
  ['E','E','SK','K','SK','K','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K','K2','K','K2','E','E'],
  // Row 30
  ['E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E'],
  // Row 31
  ['E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E'],
  // Row 32
  ['E','E','P','P','P','P','K','K','K','K','K','K','K','K','K','K','K','P','P','P','P','E','E'],
  // Row 33
  ['E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E'],
  // Row 34
  ['E','E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E','E'],
  // Row 35 — lace
  ['E','SK','SK','SK','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K2','K2','K2','E'],
  // Row 36
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 37
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 38
  ['E','P','P','P','P','P','K','K','K','K','K','K','K','K','K','K','K','P','P','P','P','P','E'],
  // Row 39
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 40
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 41 — lace
  ['E','SK','SK','SK','K','K','YO','K','YO','K','YO','K','YO','K','YO','K','YO','K','K','K2','K2','K2','E'],
  // Row 42
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 43
  ['E','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','E'],
  // Row 44
  ['P','P','P','P','P','P','M1','K','K','K','K','K','K','K','K','K','M1','P','P','P','P','P','P'],
];

const PEACOCK_PHASES = [
  {
    // Nothing here is a round of the garment — a gauge swatch is knitting, but
    // it is not this sweater's rows.
    id:'mat', name:'Materials', desc:'Before you start',
    entries:[
      {kind:'note', id:'m1', text:'Get 300g Sandnes Garn Line, Dark blue grey 6061 (53% cotton, 33% viscose, 14% linen)'},
      {kind:'note', id:'m2', text:'Circular needles: 3 mm (40 cm + 80 cm) and 4 mm (40 cm + 80 cm)'},
      {kind:'note', id:'m3', text:'DPNs: 3 mm and 4 mm — or set up magic loop'},
      {kind:'note', id:'m4', text:'Knit gauge swatch on 4 mm: 20 sts × 27 rows = 10×10 cm in stockinette'},
    ]
  },
  {
    // FIRST SECTION CONVERTED to the entries model (docs/rows-sections-model.md
    // step 2). Ids are deliberately unchanged, so a project that already ticked
    // these under the old shape reads through — see seedEntryProgress().
    //
    // The judgment calls, since they set the precedent for the rest:
    //   c1  casting on is setup, not a round        → note
    //   c2  one rib round worked seven times        → repeat, R=1
    //   c3  IS a round — it is worked               → row (it counted for
    //       nothing in the old tally, which is why Collar goes 7 rows → 8)
    //   c4  changing needles is not a round         → note
    id:'col', name:'Collar', desc:'3 mm needle · cast on 88 sts',
    entries:[
      {kind:'note', id:'c1', text:'Cast on 88 sts on 3 mm circular (40 cm). Join to round. BOR = mid-back. Place marker.'},
      {kind:'repeat', id:'c2', text:'Work 7 rounds k1, p1 rib', times:7, rows:[
        {id:'c2-1', text:'Rib round — k1, p1 to end of round'},
      ]},
      {kind:'row', id:'c3', text:'Increase round: work 4 sts rib, *M1 (pick up strand front-to-back, k through back loop), work 8 sts rib*. Repeat to last 4 sts, M1, work 4 sts rib → 99 sts'},
      {kind:'note', id:'c4', text:'Switch to 4 mm circular needle'},
    ]
  },
  {
    // Seven steps that each say "Row N" — seven rows. Under the old model
    // these counted for nothing at all, since only counter steps did.
    id:'gsr', name:'Short rows', desc:'German short rows · neckline shaping',
    entries:[
      {kind:'row', id:'g1', text:'Row 1 (RS): K 27 sts. Turn.'},
      {kind:'row', id:'g2', text:'Row 2 (WS): GSR, p 53 sts. Turn.'},
      {kind:'row', id:'g3', text:'Row 3 (RS): GSR, k 57 sts. Turn.'},
      {kind:'row', id:'g4', text:'Row 4 (WS): GSR, p 61 sts. Turn.'},
      {kind:'row', id:'g5', text:'Row 5 (RS): GSR, K3, *k2tog, k2, yo, k1, yo, k2, SSK* × 6 times, k8. Turn.'},
      {kind:'row', id:'g6', text:'Row 6 (WS): GSR, p 69 sts. Turn.'},
      {kind:'row', id:'g7', text:'Row 7 (RS): GSR, k to mid-back (34 sts). Now working in the round.'},
    ]
  },
  {
    // The chart's own 44 rows are the section's rows (chart.js still owns
    // them), so the confirm step is a note — counting stitches is not a round.
    id:'chart', name:'Yoke chart', desc:'Chart B · 4 mm needle · 44 rows',
    hasChart: true,
    entries:[
      {kind:'note', id:'ch2', text:'Count to confirm 253 sts', postChart: true},
    ]
  },
  {
    // r2 was the codebase's ONLY cadence step, written out longhand. The old
    // cadenceHintHtml() computed `round % 2 === 0`, so round 1 was the PLAIN
    // round and round 2 the increase — which is why `rows` reads [plain,
    // increase] and not the other way about. Reversed, every increase round
    // lands one round early and nothing would throw.
    //
    // r1's bullets stay on a note: they place markers, they are not rows.
    id:'rag', name:'Raglan', desc:'Divide & increase · 4 mm needle',
    entries:[
      {kind:'note', id:'r1', text:'Mark 4 sections (in the round, BOR = mid-back):', bullets:[
        '38 back / M / 1 marker-st / M',
        '48 sleeve / M / 1 marker-st / M',
        '77 front / M / 1 marker-st / M',
        '48 sleeve / M / 1 marker-st / M',
        '38 back',
      ]},
      {kind:'repeat', id:'r2', text:'Increase every 2nd round at all 4 markers.', times:4, rows:[
        {id:'r2-1', text:'Plain round — knit all stitches'},
        {id:'r2-2', text:'Increase round — m1-R before marker-st, k1 marker-st, m1-L after (all 4 markers = 8 inc)'},
      ]},
      {kind:'note', id:'r3', text:'After 8 rounds (4 increase rounds): 285 sts total. Check mid-front measures ≈ 22 cm'},
    ]
  },
  {
    // b3 modifies b2's LAST round rather than adding one, so it stays a note —
    // making it a row would claim a round that is never separately worked.
    // b5 is a note for the same reason cast-on is: binding off is an edge
    // treatment, not a row of fabric, and the two want to agree.
    id:'body', name:'Body', desc:'4 mm circular · stockinette',
    entries:[
      {kind:'row', id:'b1', text:'Knit 43 (back), place 56 on hold (sleeve), CO 10, knit 87 (front), place 56 on hold (sleeve), CO 10, knit 43 (back) → 193 sts'},
      {kind:'repeat', id:'b2', text:'Stockinette in the round until side seam (from underarm) = 26 cm, or 5 cm shorter than desired length', times:70, rows:[
        {id:'b2-1', text:'Knit round — stockinette, ≈70 rounds for 26 cm'},
      ]},
      {kind:'note', id:'b3', text:'Size S only: M1 at end of last round → 194 sts'},
      {kind:'repeat', id:'b4', text:'Switch to 3 mm circular. Work k1, p1 rib for 5 cm', times:14, rows:[
        {id:'b4-1', text:'Rib round — k1, p1, ≈14 rounds for 5 cm'},
      ]},
      {kind:'note', id:'b5', text:'Bind off in rib'},
    ]
  },
  {
    // s2 and s3 are notes, not rows: "at 5 cm" describes a decrease worked
    // INSIDE one of s4's 27 rounds, not a 28th round. Counting them would
    // inflate the sleeve by two rounds it is never asked to knit.
    //
    // s6 is the model's one honest gap — "repeat all sleeve steps" is a repeat
    // over a whole section, which entries cannot nest. It stays a note.
    id:'slv', name:'Sleeves', desc:'4 mm DPNs · make 2',
    entries:[
      {kind:'note', id:'s1', text:'Sleeve 1: place 56 held sts on 4 mm DPNs. Pick up 12 sts at underarm → 68 sts. BOR = middle of picked-up sts.'},
      {kind:'note', id:'s2', text:'At 5 cm: k1, k2tog, k to last 2 sts, SSK (−2 sts)'},
      {kind:'note', id:'s3', text:'At 9 cm: decrease again → 64 sts total'},
      {kind:'repeat', id:'s4', text:'Work until sleeve = 10 cm', times:27, rows:[
        {id:'s4-1', text:'Knit round — stockinette, ≈27 rounds for 10 cm'},
      ]},
      {kind:'repeat', id:'s5', text:'Switch to 3 mm DPNs. Work 2 cm k1, p1 rib. Bind off in rib.', times:5, rows:[
        {id:'s5-1', text:'Rib round — k1, p1'},
      ]},
      {kind:'note', id:'s6', text:'Sleeve 2: repeat all sleeve steps'},
    ]
  },
];

PATTERNS.push(
  { id:'peacock-tee', name:'Peacock Tee', badge:'Size S · 97 cm', desc:'Top-down raglan · yoke chart', phases: PEACOCK_PHASES, chart: PEACOCK_CHART,
    notes: [
      { term:'Knit', def:'K — plain knit stitch.' },
      { term:'Purl', def:'P — purl stitch.', symbol:'<svg width="8" height="8" viewBox="0 0 8 8" style="display:block"><circle cx="4" cy="4" r="3.5" fill="currentColor"/></svg>' },
      { term:'Yarn over', def:'YO — wrap the yarn to create a new stitch and an eyelet.', symbol:'<svg width="9" height="9" viewBox="0 0 9 9" style="display:block"><circle cx="4.5" cy="4.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' },
      { term:'k2tog', def:'Knit two stitches together (right-leaning decrease).', symbol:'<svg width="9" height="9" viewBox="0 0 9 9" style="display:block"><polygon points="0,9 9,9 9,0" fill="currentColor"/></svg>' },
      { term:'SKPO', def:'Slip, knit, pass over (left-leaning decrease).', symbol:'<svg width="9" height="9" viewBox="0 0 9 9" style="display:block"><polygon points="0,0 0,9 9,9" fill="currentColor"/></svg>' },
      { term:'M1', def:'Make one — pick up the strand between stitches front-to-back and knit through the back loop.', symbol:'<svg width="10" height="10" viewBox="0 0 10 10" style="display:block"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="1.5" y1="5" x2="8.5" y2="5" stroke="currentColor" stroke-width="1.5"/></svg>' },
      { term:'No stitch', def:'E — an empty cell used to center the pattern; the stitch does not exist.' },
      { term:'GSR', def:'German short row — after turning, slip the first st yarn-in-front, move yarn to back and tighten until 2 legs show. On the next row, knit those 2 legs together as one stitch.' },
      { term:'m1-R / m1-L', def:'Right- and left-leaning make-one increases, worked before and after the marker stitch.' },
      { term:'SSK', def:'Slip, slip, knit (left-leaning decrease).' },
      { term:'BOR', def:'Beginning of round (mid-back on this pattern).' },
    ] }
);

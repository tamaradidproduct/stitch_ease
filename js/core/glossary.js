// ─────────────────────────────────────────────
// STITCH GLOSSARY — general craft reference, not tied to any one pattern
//
// A pattern's own `notes` (js/patterns/*.js) is the small set of
// abbreviations THAT pattern uses, shown from inside a project. This is the
// broader "what does ssk mean" reference — grouped by craft, browsable from
// the library home screen with no project open. Independent of PATTERNS on
// purpose: a term belongs here whether or not any pattern in the app
// currently uses it.
//
// Seed content — accurate as far as general knitting/tatting usage goes, but
// not vetted against any specific designer's notation. Tell me what to fix.
//
// `sym` is a key into SYMS (js/core/chart.js) — the same chart-legend glyph a
// pattern's own `notes` reference by `sym`, so a stitch that appears in a
// chart shows its actual symbol here too. Omitted for terms with no
// single-cell glyph (Rib, GSR, BOR, tatting terms — nothing in SYMS covers
// them).
// ─────────────────────────────────────────────
const GLOSSARY = [
  {
    craft: 'Knitting',
    groups: [
      {
        name: 'Basic stitches',
        terms: [
          { term: 'Knit', abbr: 'K', def: 'Insert the right needle into the front of the stitch, wrap and pull a new loop through.' },
          { term: 'Purl', abbr: 'P', def: 'Insert the right needle into the front of the stitch from the other side, wrap and pull a new loop through.', sym: 'P' },
          { term: 'Rib', def: 'Alternating knit and purl columns (e.g. K1P1, K2P2) that pull the fabric in — used for cuffs, hems, collars.' },
        ]
      },
      {
        name: 'Increases',
        terms: [
          { term: 'Yarn over', abbr: 'YO', def: 'Wrap the yarn over the needle before the next stitch, adding a stitch and an eyelet.', sym: 'YO' },
          { term: 'Make one', abbr: 'M1', def: 'Lift the strand between two stitches onto the left needle and knit (or purl) into it — a stitch with no eyelet.', sym: 'M1' },
          { term: 'Make one left', abbr: 'M1L', def: 'Lift the strand back-to-front and knit through the front loop — leans left.', sym: 'M1L' },
          { term: 'Make one right', abbr: 'M1R', def: 'Lift the strand front-to-back and knit through the back loop — leans right.', sym: 'M1R' },
          { term: 'Make one left, purlwise', abbr: 'M1LP', def: 'M1L worked as a purl — the WS-row form.', sym: 'M1LP' },
          { term: 'Make one right, purlwise', abbr: 'M1RP', def: 'M1R worked as a purl — the WS-row form.', sym: 'M1RP' },
          { term: 'Kfb', abbr: 'Kfb', def: 'Knit into the front and then the back of the same stitch — a bar increase, no eyelet.' },
        ]
      },
      {
        name: 'Decreases',
        terms: [
          { term: 'Knit two together', abbr: 'K2tog', def: 'Knit two stitches as one — a right-leaning decrease.', sym: 'K2' },
          { term: 'Purl two together', abbr: 'P2tog', def: 'Purl two stitches as one — the WS-row form of k2tog.', sym: 'P2TOG' },
          { term: 'Slip, slip, knit', abbr: 'SSK', def: 'Slip two stitches knitwise one at a time, then knit them together through the back loops — a left-leaning decrease.', sym: 'SKA' },
          { term: 'Slip, slip, purl', abbr: 'SSP', def: 'The WS-row form of ssk — slip two purlwise, return to the left needle, purl together through the back loops.', sym: 'SSP' },
          { term: 'Slip, knit, pass over', abbr: 'SKPO / SKP', def: 'Slip one knitwise, knit the next, pass the slipped stitch over — a left-leaning decrease, visually similar to ssk.', sym: 'SK' },
          { term: 'Slip 1, k2tog, pass over', abbr: 'SK2P', def: 'Slip one, knit two together, pass the slipped stitch over the k2tog — a centred double decrease that leans left.', sym: 'SK2PO' },
          { term: 'Central double decrease', abbr: 'CDD / sl2-k1-p2sso', def: 'Slip two stitches together knitwise, knit one, pass both slipped stitches over — stays centred and vertical.', sym: 'CDD' },
          { term: 'Purl three together', abbr: 'P3tog', def: 'Purl three stitches as one — a centred double decrease worked on a WS row.', sym: 'P3TOG' },
          { term: 'Twisted ssk', abbr: 'Tssk', def: 'Slip the first stitch purlwise, then the second stitch knitwise. Slip both back to the left needle together, which changes their mount, then knit them together through the back loops (k2tog-tbl).', sym: 'TSSK' },
          { term: 'Twisted k2tog', abbr: 'Tk2tog', def: 'Slip the first stitch purlwise, then slip the second stitch purlwise through the back loop, which twists its mount. Return both to the left needle without untwisting them, then knit them together normally through the front loops.', sym: 'TK2TOG' },
        ]
      },
      {
        name: 'Techniques',
        terms: [
          { term: 'Knit through the back loop', abbr: 'Ktbl', def: 'Insert the needle into the back of the stitch instead of the front, twisting it.', sym: 'KTBL' },
          { term: 'Purl through the back loop', abbr: 'Ptbl', def: 'The purl equivalent of ktbl.', sym: 'PTBL' },
          { term: 'Wrap and turn', abbr: 'W&T', def: 'Short-row technique: slip the next stitch, bring the yarn between the needles to wrap it, slip the stitch back, turn.' },
          { term: 'German short row', abbr: 'GSR', def: 'Short-row technique: after turning, slip the first stitch with yarn in front, pull the yarn to the back until two legs show on the needle. Worked together as one stitch when you reach it.' },
          { term: 'Beginning of round', abbr: 'BOR', def: 'The marked point where each round starts — not always the true start of the piece.' },
          { term: 'No stitch', abbr: 'NS', def: 'A chart cell with nothing to work — a placeholder so shaping rows still line up in the grid. Skip it.' },
          { term: 'Brioche knit', abbr: 'Brk', def: 'Knit the marked stitch together with its yarn-over from the previous row.', sym: 'BRK' },
          { term: 'Brioche purl', abbr: 'Brp', def: 'Purl the marked stitch together with its yarn-over from the previous row.', sym: 'BRP' },
        ]
      }
    ]
  },
  {
    craft: 'Tatting',
    groups: [
      {
        name: 'Elements',
        terms: [
          { term: 'Ring', abbr: 'R', def: 'A closed loop of double stitches, pulled tight by the working thread — one shuttle makes the visible stitches.' },
          { term: 'Chain', abbr: 'Ch', def: 'A row of double stitches worked with both threads, left unclosed — the second shuttle (or a shuttle and the ball) makes the visible stitches.' },
          { term: 'Double stitch', abbr: 'Ds', def: 'The base unit of tatting — a half hitch and its mirror, worked as a pair.' },
          { term: 'Picot', abbr: 'P / -', def: 'A small loop of thread left between stitches, used for joining or as decoration.' },
          { term: 'Long / decorative picot', abbr: '---', def: 'A picot deliberately left longer than a joining picot, purely decorative.' },
          { term: 'Join', abbr: 'J / +', def: 'Drawing a loop of the working thread through a picot (or another element) to link two pieces of tatting together.' },
          { term: 'Split ring', abbr: 'SR', def: 'A ring worked with the two halves on different threads, closing without a visible base — lets you move to the next element without cutting the thread.' },
        ]
      },
      {
        name: 'Method',
        terms: [
          { term: 'Continuous thread method', abbr: 'CTM', def: 'Tatting rings and chains from a single ball, without cutting and rejoining thread between elements.' },
          { term: 'Shuttle', def: 'A small tool that holds thread and passes it through loops to form stitches — traditional tatting needs one or two.' },
          { term: 'Reverse work', abbr: 'RW', def: 'Turn the piece over so the next element is built from the opposite side — used to alternate rings and chains.' },
        ]
      }
    ]
  }
];

// Look up a term by its display name or abbreviation (case-insensitive). This
// is what lets a pattern's own notes (js/patterns/*.js) defer to this file
// instead of carrying their own copy of a definition — pass the note's
// `term`, and if it resolves, omit that note's `def` so this glossary is the
// only place the wording lives. Multi-abbreviation strings ('SKPO / SKP')
// match any of their '/'-separated parts.
//
// Only for entries that ARE a stitch definition and nothing else. A note
// whose text encodes something pattern-specific — which side of the chart a
// symbol falls on, why a chart draws two visually distinct symbols for the
// same stitch — is not a candidate: collapsing it into the shared definition
// would drop the very thing that note exists to say, so those keep their own
// `def` and are never looked up here.
function glossaryEntry(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  for (const c of GLOSSARY) {
    for (const g of c.groups) {
      for (const t of g.terms) {
        if (t.term.toLowerCase() === q) return t;
        if (t.abbr && t.abbr.split('/').map(s => s.trim().toLowerCase()).includes(q)) return t;
      }
    }
  }
  return null;
}

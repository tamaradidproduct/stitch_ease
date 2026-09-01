// ─────────────────────────────────────────────
// POSY — Positive Ease, size XS (94cm chest). Cropped V-neck cardigan/
// pullover/open-front sweater with lace lower body and upper back.
//
// Pattern data only. Registers itself into PATTERNS (declared in state.js);
// the active-pattern pointers PHASES / CHART_B / CHART_TOTAL are set from
// this entry by applyPattern() when a project is opened.
//
// Charts extracted from the designer's Figma source (PpkNDZ0vUk5vUJnvZcUt2S,
// "Posy knitted cardigan"), via the Figma REST API, then mapped from the
// library's stitch-symbol variant names to this app's chart tokens.
//
// Worked FLAT throughout (turned at the end of every row, not in the
// round), so every hasChart phase below sets flatChart: true. Most charts
// read odd=RS/even=WS like the rest of the app; Chart 2 (left front) and
// the back panel are the pattern's own stated exceptions — both set
// wsFirst: true (see js/core/chart.js's isRSRow()).
//
// Two combined charts are built from the designer's individual panels,
// concatenated column-wise in the exact order the written pattern gives:
//   POSY_BACK_CHART      = Chart 5, Chart 4, Chart 3, Chart 4, Chart 3,
//                           Chart 4, Chart 6   (33 rows × 120 sts)
//   POSY_BODY_HEM_CHART  = (Chart 8, Chart 7) × 6, Chart 8
//                                              (32 rows × 234 sts)
// The 8 individual charts are kept too — Chart 1 and Chart 2 are used
// directly (right front / left front); Charts 3–8 exist only inside the
// two combined charts above, but are kept named for traceability back to
// the source PDF/Figma chart numbers.
//
// A source-file glitch: Chart 5's and Chart 6's row 32 had 3 stitches
// duplicated as exactly-overlapping stacked layers in Figma (a copy-paste
// artifact). Deduped by position during extraction — both charts here are
// the corrected 15-stitch-wide rows throughout.
// ─────────────────────────────────────────────

const POSY_CHART_1 = [
  // Row 1
  ['E','E','E','E','E','E','E','E','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','P','K'],
  // Row 2
  ['E','E','E','E','E','E','E','E','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','P','K'],
  // Row 3
  ['E','E','E','E','E','E','E','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','P','P','KTBL','P','K','K','P','K'],
  // Row 4
  ['E','E','E','E','E','E','E','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P','P','KTBL','K','K','K','P','K'],
  // Row 5
  ['E','E','E','E','E','E','E','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','P','P','SKA','K','K','YO','P','K'],
  // Row 6
  ['E','E','E','E','E','E','E','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K','P','K'],
  // Row 7
  ['E','E','E','E','E','E','YO','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K','P','K'],
  // Row 8
  ['E','E','E','E','E','E','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K','P','K'],
  // Row 9
  ['E','E','E','E','E','E','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO','P','K'],
  // Row 10
  ['E','E','E','E','E','E','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K','P','K'],
  // Row 11
  ['E','E','E','E','E','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K','P','K'],
  // Row 12
  ['E','E','E','E','E','K','K','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','K','K','K','P','K'],
  // Row 13
  ['E','E','E','E','E','K','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO','P','K'],
  // Row 14
  ['E','E','E','E','E','K','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K','P','K'],
  // Row 15
  ['E','E','E','E','M1R','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','P','K'],
  // Row 16
  ['E','E','E','E','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 17
  ['E','E','E','E','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 18
  ['E','E','E','E','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 19
  ['E','E','E','M1RP','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','P','K'],
  // Row 20
  ['E','E','E','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','K'],
  // Row 21
  ['E','E','E','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','P','K'],
  // Row 22
  ['E','E','E','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 23
  ['E','E','M1RP','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','P','P','P','TSSK','P','P','KTBL','P','K'],
  // Row 24
  ['E','E','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 25
  ['E','E','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','K'],
  // Row 26
  ['E','E','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','K'],
  // Row 27
  ['E','M1R','P','P','SKA','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','K','K','K','K'],
  // Row 28
  ['E','KTBL','P','SKA','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','K','K','K','K','K'],
  // Row 29
  ['E','KTBL','SKA','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','YO','K','K'],
  // Row 30
  ['E','SKA','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K','K','K'],
  // Row 31
  ['M1R','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K','K','K'],
  // Row 32
  ['K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K','K','K'],
  // Row 33
  ['K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO','K','K'],
  // Row 34
  ['SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K','K','K'],
];
const POSY_CHART_2 = [
  // Row 1
  ['K','P','K','P','P','K','P','P','P','K','P','P','K','K','K','K','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','E','E','E','E','E','E','E','E'],
  // Row 2
  ['K','P','K','K','P','KTBL','P','P','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','P','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','E','E','E','E','E','E','E'],
  // Row 3
  ['K','P','K','K','K','KTBL','P','P','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','E','E','E','E','E','E','E'],
  // Row 4
  ['K','P','YO','K','K','K2A','P','P','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','E','E','E','E','E','E','E'],
  // Row 5
  ['K','P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','E','E','E','E','E','E','E'],
  // Row 6
  ['K','P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','YO','E','E','E','E','E','E'],
  // Row 7
  ['K','P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','E','E','E','E','E','E'],
  // Row 8
  ['K','P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','E','E','E','E','E','E'],
  // Row 9
  ['K','P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','E','E','E','E','E','E'],
  // Row 10
  ['K','P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','K','K','YO','E','E','E','E','E'],
  // Row 11
  ['K','P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','K','K','E','E','E','E','E'],
  // Row 12
  ['K','P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','K','E','E','E','E','E'],
  // Row 13
  ['K','P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','K','E','E','E','E','E'],
  // Row 14
  ['K','P','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','M1L','E','E','E','E'],
  // Row 15
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','E','E','E','E'],
  // Row 16
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','E','E','E','E'],
  // Row 17
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','E','E','E','E'],
  // Row 18
  ['K','P','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','M1LP','E','E','E'],
  // Row 19
  ['K','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','E','E','E'],
  // Row 20
  ['K','P','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','E','E','E'],
  // Row 21
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','E','E','E'],
  // Row 22
  ['K','P','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','M1LP','E','E'],
  // Row 23
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','E','E'],
  // Row 24
  ['K','P','KTBL','P','P','KTBL','YO','P','YO','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','E','E'],
  // Row 25
  ['K','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','E','E'],
  // Row 26
  ['K','K','K','P','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K2A','P','P','M1L','E'],
  // Row 27
  ['K','K','K','K','P','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K2A','P','KTBL','E'],
  // Row 28
  ['K','K','YO','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K2A','KTBL','E'],
  // Row 29
  ['K','K','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K2A','E'],
  // Row 30
  ['K','K','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','M1L'],
  // Row 31
  ['K','K','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K'],
  // Row 32
  ['K','K','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K'],
  // Row 33
  ['K','K','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A'],
];
const POSY_CHART_3 = [
  // Row 1
  ['P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P'],
  // Row 2
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 3
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 4
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 5
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 6
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 7
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 8
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 9
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 10
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 11
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 12
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 13
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 14
  ['P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO'],
  // Row 15
  ['P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K'],
  // Row 16
  ['P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K'],
  // Row 17
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 18
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 19
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 20
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 21
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 22
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 23
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 24
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 25
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 26
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 27
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 28
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 29
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 30
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 31
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 32
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 33
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];
const POSY_CHART_4 = [
  // Row 1
  ['P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','K','K','K'],
  // Row 2
  ['P','YO','K','K','K','K2A','P','KTBL','P','P','P','KTBL','P','SKA','K','K','K','YO'],
  // Row 3
  ['P','K','YO','K','K','K','K2A','KTBL','P','P','P','KTBL','SKA','K','K','K','YO','K'],
  // Row 4
  ['P','K','K','YO','K','K','K','K2A','P','P','P','SKA','K','K','K','YO','K','K'],
  // Row 5
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 6
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 7
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 8
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 9
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 10
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 11
  ['P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P'],
  // Row 12
  ['P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P'],
  // Row 13
  ['P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P'],
  // Row 14
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 15
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 16
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 17
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 18
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 19
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 20
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 21
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 22
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 23
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 24
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 25
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 26
  ['K','YO','K','K','K','K2A','K','KTBL','K','PU','K','KTBL','K','SKA','K','K','K','YO'],
  // Row 27
  ['K','K','YO','K','K','K','K2A','KTBL','K','P3','K','KTBL','SKA','K','K','K','YO','K'],
  // Row 28
  ['K','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K'],
  // Row 29
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 30
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 31
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 32
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 33
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
];
const POSY_CHART_5 = [
  // Row 1
  ['P','K','P','P','K','P','P','P','K','P','P','K','P','K','P'],
  // Row 2
  ['P','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 3
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 4
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 5
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 6
  ['P','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 7
  ['P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 8
  ['P','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 9
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 10
  ['P','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 11
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 12
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 13
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 14
  ['P','K','K','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO'],
  // Row 15
  ['P','K','K','K','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K'],
  // Row 16
  ['P','YO','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K'],
  // Row 17
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 18
  ['P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 19
  ['P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 20
  ['P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 21
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 22
  ['P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 23
  ['P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 24
  ['P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 25
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 26
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 27
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 28
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 29
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 30
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 31
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 32
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 33
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];
const POSY_CHART_6 = [
  // Row 1
  ['P','P','K','P','K','P','P','K','P','P','P','K','P','P','K'],
  // Row 2
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K'],
  // Row 3
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 4
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 5
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 6
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL'],
  // Row 7
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL'],
  // Row 8
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL'],
  // Row 9
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 10
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL'],
  // Row 11
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 12
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 13
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 14
  ['P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','K','K'],
  // Row 15
  ['P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','K','K','K'],
  // Row 16
  ['P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','YO'],
  // Row 17
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 18
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K'],
  // Row 19
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K'],
  // Row 20
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO'],
  // Row 21
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 22
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K'],
  // Row 23
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K'],
  // Row 24
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO'],
  // Row 25
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 26
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 27
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 28
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 29
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 30
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 31
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 32
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 33
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];
const POSY_CHART_7 = [
  // Row 1
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 2
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 3
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 4
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 5
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 6
  ['P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P'],
  // Row 7
  ['P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P'],
  // Row 8
  ['P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P'],
  // Row 9
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 10
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 11
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 12
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 13
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 14
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 15
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 16
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 17
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 18
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 19
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 20
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 21
  ['P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO'],
  // Row 22
  ['P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K'],
  // Row 23
  ['P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K'],
  // Row 24
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 25
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 26
  ['P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 27
  ['P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 28
  ['P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 29
  ['P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 30
  ['P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P'],
  // Row 31
  ['P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P'],
  // Row 32
  ['P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P'],
];
const POSY_CHART_8 = [
  // Row 1
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 2
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 3
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 4
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 5
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 6
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 7
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 8
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 9
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 10
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 11
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 12
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 13
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 14
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 15
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 16
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 17
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 18
  ['P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P'],
  // Row 19
  ['P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P'],
  // Row 20
  ['P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P'],
  // Row 21
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 22
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 23
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 24
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 25
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 26
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 27
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 28
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 29
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 30
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 31
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 32
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
];
const POSY_BACK_CHART = [
  // Row 1
  ['P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','K','K','K','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','K','K','K','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K','P','K','P','P','K','K','K','K','P','P','K','P','P','P','K','P','P','K','K','K','K','P','P','K','P','K','P','P','K','P','P','P','K','P','P','K'],
  // Row 2
  ['P','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','P','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','P','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','P','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K'],
  // Row 3
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 4
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','P','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','P','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','P','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 5
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 6
  ['P','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL'],
  // Row 7
  ['P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL'],
  // Row 8
  ['P','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL'],
  // Row 9
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 10
  ['P','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL'],
  // Row 11
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 12
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 13
  ['P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL'],
  // Row 14
  ['P','K','K','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','K','K'],
  // Row 15
  ['P','K','K','K','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','K','K','K'],
  // Row 16
  ['P','YO','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','YO'],
  // Row 17
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 18
  ['P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K'],
  // Row 19
  ['P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K'],
  // Row 20
  ['P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO'],
  // Row 21
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 22
  ['P','K','K','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','K','K'],
  // Row 23
  ['P','K','K','K','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','K','K','K'],
  // Row 24
  ['P','YO','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','YO'],
  // Row 25
  ['P','K','YO','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','YO','K'],
  // Row 26
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','KTBL','K','PU','K','KTBL','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','KTBL','K','PU','K','KTBL','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','KTBL','K','PU','K','KTBL','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 27
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','KTBL','K','P3','K','KTBL','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','KTBL','K','P3','K','KTBL','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','KTBL','K','P3','K','KTBL','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 28
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 29
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 30
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 31
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 32
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 33
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];
const POSY_BODY_HEM_CHART = [
  // Row 1
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 2
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 3
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 4
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 5
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 6
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 7
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 8
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 9
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 10
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 11
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 12
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 13
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 14
  ['K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K'],
  // Row 15
  ['K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','K','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K'],
  // Row 16
  ['K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','K','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K'],
  // Row 17
  ['K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','K','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO'],
  // Row 18
  ['P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P'],
  // Row 19
  ['P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P'],
  // Row 20
  ['P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P'],
  // Row 21
  ['P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P','P','YO','K','K','K','K2A','P','KTBL','P','PU','P','KTBL','P','SKA','K','K','K','YO','P','P','TK2TOG','YO','K','P','P','TK2TOG','YO','P','YO','TSSK','P','P','K','YO','TSSK','P'],
  // Row 22
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','KTBL','P','P3','P','KTBL','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 23
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','P','CDD','P','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 24
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 25
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','PU','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 26
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P3','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 27
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P','P','K','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','K','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','CDD','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 28
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','K','K','K','YO','K','K','K','K2A','P','SKA','K','K','K','YO','K','K','K','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 29
  ['P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P','P','YO','K','K','K','K2A','K','K','K','P','K','K','K','SKA','K','K','K','YO','P','P','TK2TOG','YO','KTBL','P','P','TK2TOG','YO','P','YO','TSSK','P','P','KTBL','YO','TSSK','P'],
  // Row 30
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','YO','K','K','K','K2A','K','K','P','K','K','SKA','K','K','K','YO','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
  // Row 31
  ['P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P','P','P','K','YO','K','K','K','K2A','K','P','K','SKA','K','K','K','YO','K','P','P','P','TK2TOG','YO','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','YO','TSSK','P'],
  // Row 32
  ['P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P','P','P','KTBL','P','YO','K','K','K','K2A','P','SKA','K','K','K','YO','P','KTBL','P','P','P','KTBL','P','KTBL','P','P','KTBL','P','P','P','KTBL','P','P','KTBL','P','KTBL','P'],
];

const POSY_PHASES = [
  {
    id:'posy-mat', name:'Materials', desc:'Before you start',
    entries:[
      {kind:'note', id:'pm1', text:'Positive Ease Merino Singles (fingering weight), about 720m/787yd (100g/366m per skein) for the cropped version with 3/4 sleeves'},
      {kind:'note', id:'pm2', text:'3.75mm (US 5) circular needles — the whole sweater, plackets and hems included, is knit on one needle size'},
      {kind:'note', id:'pm3', text:'Gauge: 25 sts × 34 rows = 10×10cm (4"×4") on 3.75mm needles in Stockinette st'},
      {kind:'note', id:'pm4', text:'Stitch holder or scrap yarn, stitch markers, and (for the buttoned versions) 4 buttons about 1.25cm (1/2") across'},
      {kind:'note', id:'pm5', text:'This pattern gives three styling options — cardigan with buttons, pullover with buttons, or open front — decided at the finishing stage, not now', bullets:[
        'Every chart is worked bottom-up, right → left on RS, left → right on WS — except where a section says otherwise',
        'Every odd row is RS and every even row is WS, with two exceptions: Chart 2 (left front) and the back panel are inverted — their odd rows are WS',
      ]},
    ]
  },
  {
    id:'posy-placket', name:'Placket', desc:'Both ends · 3.75mm circular · 13 sts',
    entries:[
      {kind:'note', id:'pp1', text:'Cast on 13 sts.'},
      {kind:'repeat', id:'pp2', text:'Repeat until you have about 11.5cm (4.5"). Finish on RS.', times:20, rows:[
        {id:'pp2-1', text:'1st row (WS): sl1 pw, *p1, k1* repeat ** to 2 sts before end, p2'},
        {id:'pp2-2', text:'2nd row (RS): sl1 kw, *k1, p1* repeat ** to 2 sts before end, k2'},
      ]},
      {kind:'note', id:'pp3', text:'Place sts on stitch holder and cut the thread.'},
      {kind:'note', id:'pp4', text:'Lay your work with RS facing you. Pick up and knit 13 sts along the cast-on edge.'},
      {kind:'repeat', id:'pp5', text:'Repeat until you have about 11.5cm (4.5") from the pick-up line. Finish on RS.', times:20, rows:[
        {id:'pp5-1', text:'1st row (WS): sl1 pw, *p1, k1* repeat ** to 2 sts before end, p2'},
        {id:'pp5-2', text:'2nd row (RS): sl1 kw, *k1, p1* repeat ** to 2 sts before end, k2'},
      ]},
      {kind:'note', id:'pp6', text:'Both placket ends are now ready — one holds live sts and the loose end of the thread, the other has been placed on a holder and cut. Move on to the right front.'},
    ]
  },
  {
    // A hasChart phase only ever renders the chart itself plus the ONE
    // entry marked postChart — every other entry is invisible (see
    // buildChartTracker/recapHtml in chart.js). So the cast-on row and the
    // "how to read this chart" framing (the placket sts wrapping the lace
    // panel on every row, which the chart array itself has no room for)
    // have to live in their own phase before the chart, not inside it.
    id:'posy-rf-setup', name:'Right front · setup', desc:'Cast on, place marker, start Chart 1',
    entries:[
      {kind:'row', id:'rfl0', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 2 sts before end, p2, cast on 34 sts. You now have 47 sts.'},
      {kind:'note', id:'rfl1', text:'How Chart 1 fits with the placket:', bullets:[
        'The chart\'s 1st stitch is the edge stitch — knit it on RS, purl it on WS',
        '1st row (RS): work chart row 1, place a marker, then *k1, p1* rep ** to 2 sts before end, k2 — you\'ll have 12 sts for the placket and 35 for the lace panel',
        'Every WS row after that: sl1 pw, *p1, k1* rep ** to 1 st before the marker, p1, sm, work the chart\'s next row',
      ]},
    ]
  },
  {
    id:'posy-rf-lace', name:'Right front · lace', desc:'Chart 1 · 43 sts',
    hasChart: true, flatChart: true, chart: POSY_CHART_1,
    entries:[
      {kind:'note', id:'rfl4', text:'You now have 55 sts.', postChart:true},
    ]
  },
  {
    id:'posy-rf-shape', name:'Right front · shaping', desc:'Increase to 59 sts, then hold',
    entries:[
      {kind:'row', id:'rfs1', text:'Increasing row (RS): k to m, m1r, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
      {kind:'row', id:'rfs2', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to the end'},
      {kind:'row', id:'rfs3', text:'Next row (RS): k to m, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
      {kind:'row', id:'rfs4', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to the end'},
      {kind:'repeat', id:'rfs5', text:'Repeat the last 4 rows 2 more times.', times:2, rows:[
        {id:'rfs5-1', text:'Increasing row (RS): k to m, m1r, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'rfs5-2', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to the end'},
        {id:'rfs5-3', text:'Next row (RS): k to m, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'rfs5-4', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to the end'},
      ]},
      {kind:'row', id:'rfs6', text:'Repeat Increasing row once more. You now have 59 sts.'},
      {kind:'note', id:'rfs7', text:'Do not cut the thread. Place all sts from "right front" on a stitch holder or scrap yarn.'},
      {kind:'note', id:'rfs8', text:'If knitting the pullover-with-buttons or cardigan-with-buttons version, buttonholes are worked into this shaping section on the right placket — see "How to create buttonholes" in Finishing before you start the left front.'},
    ]
  },
  {
    id:'posy-lf-setup', name:'Left front · setup', desc:'Cast on, place marker, start Chart 2',
    entries:[
      {kind:'row', id:'lfl0', text:'Move the 13 sts from the other end of the placket (on the stitch holder) to the needle. Lay your work with RS facing you — all sts should be on the right-hand needle with the loose end of the thread at the tip. Attach the thread and cast on 34 sts. You now have 47 sts.'},
      {kind:'note', id:'lfl1', text:'How Chart 2 fits with the placket:', bullets:[
        'The chart\'s 43rd stitch is the edge stitch — knit it on RS, purl it on WS',
        'This chart is inverted: its odd rows are WS, so you start from the left, not the right',
        '1st row (WS): work chart row 1, place a marker, then *p1, k1* rep ** to 2 sts before end, p2',
        'Every RS row after that: sl1 kw, *k1, p1* rep ** to 1 st before the marker, k1, sm, work the chart\'s next row',
      ]},
    ]
  },
  {
    id:'posy-lf-lace', name:'Left front · lace', desc:'Chart 2 · 43 sts',
    hasChart: true, flatChart: true, wsFirst: true, chart: POSY_CHART_2,
    entries:[
      {kind:'note', id:'lfl4', text:'You now have 55 sts.', postChart:true},
    ]
  },
  {
    id:'posy-lf-shape', name:'Left front · shaping', desc:'Increase to 59 sts, then hold',
    entries:[
      {kind:'row', id:'lfs1', text:'Increasing row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, m1l, k to the end'},
      {kind:'row', id:'lfs2', text:'Next row (WS): p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      {kind:'row', id:'lfs3', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, k to the end'},
      {kind:'row', id:'lfs4', text:'Next row (WS): p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      {kind:'repeat', id:'lfs5', text:'Repeat the last 4 rows 2 more times.', times:2, rows:[
        {id:'lfs5-1', text:'Increasing row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, m1l, k to the end'},
        {id:'lfs5-2', text:'Next row (WS): p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
        {id:'lfs5-3', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, k to the end'},
        {id:'lfs5-4', text:'Next row (WS): p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      ]},
      {kind:'row', id:'lfs6', text:'Repeat Increasing row once more. You now have 59 sts.'},
      {kind:'note', id:'lfs7', text:'Cut the thread. Place all sts from "left front" on a stitch holder or scrap yarn.'},
    ]
  },
  {
    id:'posy-back-setup', name:'Back · setup', desc:'Pick up 123 sts, place markers, start the charts',
    entries:[
      {kind:'row', id:'bkl0', text:'Lay your work with RS facing you. Starting on the "left front", pick up and knit 34 sts along the cast-on edge, then 55 sts along the placket edge, then 34 sts from the "right front" cast-on edge. There should be no holes where the placket joins the fronts — pick up carefully. On the placket edge, pick up evenly: when you reach the middle you should have picked up 27 sts. You now have 123 sts.'},
      {kind:'note', id:'bkl1', text:'How the back charts fit together:', bullets:[
        'The lace panels are established in the first row, in order Chart 5, Chart 4, Chart 3, Chart 4, Chart 3, Chart 4, Chart 6 (mirroring the front panels — it helps to have Charts 1 and 2 in front of you)',
        'Edge sts aren\'t included in the charts; use stitch markers to separate the panels',
        'All odd rows are WS this time, so start each chart from the left',
      ]},
      {kind:'note', id:'bkl2', text:'How to work the rows:', bullets:[
        '1st row (WS): p1, work the 1st row of each chart in order — Chart 5, [Chart 4, Chart 3] repeat once more, Chart 4, Chart 6 — then k1, p1',
        'Every RS row after that: k1, p1, work the next row of each chart as established, then k1',
        'After 25 rows of the charts: the edge sts change — RS becomes k2, work charts, k1; WS becomes p1, work charts, p2 — for the remaining rows',
      ]},
    ]
  },
  {
    id:'posy-back-lace', name:'Back · lace', desc:'Charts 3–6 combined · 120 sts + edges',
    hasChart: true, flatChart: true, wsFirst: true, chart: POSY_BACK_CHART,
    entries:[
      {kind:'note', id:'bkl7', text:'Remove all markers between lace panels once all rows of the charts are finished.', postChart:true},
    ]
  },
  {
    id:'posy-back-body', name:'Back · stockinette & join', desc:'13 rows · then join to fronts',
    entries:[
      {kind:'repeat', id:'bkb1', text:'Work 13 rows in Stockinette st.', times:13, rows:[
        {id:'bkb1-1', text:'Stockinette row'},
      ]},
      {kind:'note', id:'bkb2', text:'You’ve finished the back on RS. Do not turn your work. Cut the thread. Lay your work flat with RS facing you — the back part should be at the top, the two front parts at the bottom. Move the front sts onto the proper needle to join front and back.'},
      {kind:'note', id:'bkb3', text:'The thread you didn’t cut off is at the end of the right front — use it to start working the body.'},
    ]
  },
  {
    id:'posy-body-join', name:'Body · join & increase', desc:'239 → 259 sts',
    entries:[
      {kind:'row', id:'bji1', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to 1 st before front end, purl the next st together with the first st from the back part, p to 1 st before back end, purl the next st together with the first st from front, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2. You now have 239 sts.'},
      {kind:'row', id:'bji2', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, k to m, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
      {kind:'row', id:'bji3', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      {kind:'row', id:'bji4', text:'Increasing row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, m1r, k to m, m1r, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
      {kind:'row', id:'bji5', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      {kind:'repeat', id:'bji6', text:'Repeat the last 4 rows 9 more times.', times:9, rows:[
        {id:'bji6-1', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, k to m, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'bji6-2', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
        {id:'bji6-3', text:'Increasing row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, m1r, k to m, m1r, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'bji6-4', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      ]},
      {kind:'note', id:'bji7', text:'You now have 259 sts. If knitting the cardigan-with-buttons version, check the buttonhole info in Finishing now.'},
    ]
  },
  {
    id:'posy-body-straight', name:'Body · straight', desc:'≈ 16.5cm (6.5") from underarm',
    entries:[
      {kind:'repeat', id:'bst1', text:'Repeat until about 16.5cm (6.5") from the underarm. Finish on WS.', times:28, rows:[
        {id:'bst1-1', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 1 st before m, k1, sm, k to m, sm, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'bst1-2', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1, sm, p to m, sm, *p1, k1* repeat ** to 2 sts before end, p2'},
      ]},
      {kind:'note', id:'bst2', text:'To lengthen Posy, this is the place — just repeat the last 2 rows until you reach the desired length minus 11.5cm (4.5"), the length of the lace panel and hem.'},
    ]
  },
  {
    id:'posy-body-hem-setup', name:'Body · lace hem setup', desc:'Place markers, start Charts 7 & 8',
    entries:[
      {kind:'note', id:'bhl0', text:'Use stitch markers to separate lace panels.'},
      {kind:'note', id:'bhl1', text:'How to work the rows:', bullets:[
        '1st row (RS): sl1 kw, *k1, p1* rep ** to 1 st before m, k1, sm, k1, work the 1st row of each chart in order — [Chart 8, Chart 7] repeated 5 more times, then Chart 8 — then sm, *k1, p1* rep ** to 2 sts before end, k2',
        'Every WS row after that: sl1 pw, *p1, k1* rep ** to 1 st before m, p1, sm, work the next row of each chart as established, p1, sm, *p1, k1* rep ** to 2 sts before end, p2',
      ]},
    ]
  },
  {
    id:'posy-body-hem-lace', name:'Body · lace hem', desc:'Charts 7 & 8 combined × 13 · 234 sts',
    hasChart: true, flatChart: true, chart: POSY_BODY_HEM_CHART,
    entries:[
      {kind:'note', id:'bhl3', text:'Remove all markers once all rows of the charts are finished.', postChart:true},
    ]
  },
  {
    id:'posy-hem', name:'Hem', desc:'≈ 2.5cm (1") · bind off',
    entries:[
      {kind:'repeat', id:'hm1', text:'Repeat until about 2.5cm (1") of hem.', times:4, rows:[
        {id:'hm1-1', text:'Next row (RS): sl1 kw, *k1, p1* repeat ** to 2 sts before end, k2'},
        {id:'hm1-2', text:'Next row (WS): sl1 pw, *p1, k1* repeat ** to 2 sts before end, p2'},
      ]},
      {kind:'note', id:'hm2', text:'Bind off all sts in pattern.'},
    ]
  },
  {
    id:'posy-sleeve', name:'Sleeves', desc:'70 → 54 sts, in the round · make 2',
    entries:[
      {kind:'note', id:'sl1', text:'Starting in the middle of the armpit, pick up and knit 70 sts along the armhole edge. Join to work in the round and place a starting marker.'},
      {kind:'repeat', id:'sl2', text:'Work 11 rounds in Stockinette st, then a decreasing round — repeated for 8 cycles in total.', times:8, rows:[
        {id:'sl2-1', text:'Work 11 rounds in Stockinette st'},
        {id:'sl2-2', text:'Decreasing round: k1, ssk, k to 3 sts before m, k2tog, k1'},
      ]},
      {kind:'note', id:'sl3', text:'You now have 54 sts.'},
      {kind:'row', id:'sl4', text:'Work one round in Stockinette st'},
      {kind:'repeat', id:'sl5', text:'Repeat until about 2.5cm (1") of hem.', times:9, rows:[
        {id:'sl5-1', text:'*k1, p1* repeat ** to the end of round'},
      ]},
      {kind:'note', id:'sl6', text:'Bind off all sts in pattern.'},
      {kind:'note', id:'sl7', text:'Repeat this whole section for the second sleeve.'},
    ]
  },
  {
    id:'posy-finish', name:'Finishing', desc:'Blocking, styling, buttonholes',
    entries:[
      {kind:'note', id:'fn1', text:'Weave in the loose ends. Soak and block the sweater carefully to highlight the pattern and give it its proper dimensions. Leave until it dries.'},
      {kind:'note', id:'fn2', text:'Pullover with buttons: lay the sweater with the front facing you, right placket over the left placket. Attach the buttons through both plackets as shown below. You can also sew the plackets together for extra stability.'},
      {kind:'note', id:'fn3', text:'Cardigan with buttons: attach the buttons in the appropriate places on the left placket.'},
      {kind:'note', id:'fn4', text:'Open front cardigan: you’ve already finished your sweater!'},
      {kind:'note', id:'fn5', text:'How to create buttonholes (right placket, if you’re working a buttoned version):', bullets:[
        '1st buttonhole row (RS): k1, p1, k1, p1, k1, yo, k2tog, p1, k1, p1, k2',
        '2nd buttonhole row (WS): sl1 pw, *p1, k1* repeat ** to 1 st before m, p1',
        'Make the first buttonhole right after the last neck increase, the next about 4.8cm (1.9") later, then repeat that many rows between every pair',
        'The last buttonhole sits about 1.6cm (0.6") above the bottom edge; the sketch on p.15 shows 4 buttons total spaced over 16cm (6.3")',
        'To change placket length or button count: h = (P − 1.6cm) / (B − 1), where P is the placket length after modification and B is the number of buttons',
      ]},
    ]
  },
];

PATTERNS.push(
  { id:'posy', name:'Posy', badge:'Size XS · 94cm chest', desc:'Cropped V-neck cardigan · lace lower body & upper back', phases: POSY_PHASES,
    notes: [
      { term:'Knit / Purl', def:'Blank square — RS rows: knit. WS rows: purl.' },
      { term:'Purl / Knit', def:'RS rows: purl. WS rows: knit.', sym:'P' },
      { term:'Yarn over', sym:'YO' },
      { term:'ssk / ssp', def:'RS rows: slip, slip, knit (left-leaning decrease). WS rows: ssp.', sym:'SKA' },
      { term:'k2tog / p2tog', def:'RS rows: knit two together (right-leaning decrease). WS rows: p2tog.', sym:'K2A' },
      { term:'ssp', def:'Slip, slip, purl — the WS-row symbol, drawn separately from ssk where a chart shows both sides.', sym:'SSP' },
      { term:'p2tog', def:'Purl two together — the WS-row symbol, drawn separately from k2tog where a chart shows both sides.', sym:'P2TOG' },
      { term:'tssk', sym:'TSSK' },
      { term:'tk2tog', sym:'TK2TOG' },
      { term:'ktbl / ptbl', def:'Knit through the back loop on RS rows, purl through the back loop on WS rows.', sym:'KTBL' },
      { term:'ptbl', def:'Purl through the back loop — the WS-row symbol.', sym:'PTBL' },
      { term:'m1r / m1rp', def:'Make one right — lift the bar between sts front-to-back and knit (or on WS, purl) through the back of it.', sym:'M1R' },
      { term:'m1rp', sym:'M1RP' },
      { term:'m1l / m1lp', def:'Make one left — lift the bar between sts back-to-front and knit (or on WS, purl) through the front of it.', sym:'M1L' },
      { term:'m1lp', sym:'M1LP' },
      { term:'sl2-k1-p2sso', sym:'CDD' },
      { term:'p3', def:'WS rows: purl 3 — the 3-stitch-wide symbol seen in the back and body-hem charts.', sym:'P3' },
      { term:'Pull up stitch', def:'Insert the right needle into the centre of the stitch 3 rows below the next stitch. Pull up a loop of yarn, yo, pull up another loop from the same stitch, then drop the next stitch from the left needle.', sym:'PU' },
      { term:'No stitch', def:'Grey cell — placeholder so the lace panel’s shaping lines up in the grid. Skip it; work the next real stitch.' },
      { term:'', def:'Chart 2, the back panel, and the placket edge stitches read RS/WS reversed from the usual convention — the chart itself and the row-by-row text both call this out at the point it matters.' },
    ] }
);

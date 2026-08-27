// ─────────────────────────────────────────────
// FROST FLOWER CARDIGAN — Ngo Quynh, top-down lace cardigan.
//
// Pattern data only. Registers itself into PATTERNS (declared in state.js);
// the active-pattern pointers PHASES / CHART_B / CHART_TOTAL are set from
// this entry by applyPattern() when a project is opened.
//
// This pattern is graded by NEEDLE size, not a fixed stitch count: knit the
// 36-st Frost Flower motif below, block it, and multiply its finished width
// by 8 (the body is 8 motifs around) to get finished chest circumference.
// Go up/down a needle size and re-swatch until that number fits.
//
// Worked FLAT (unlike the Peacock Tee's in-the-round yoke), so this chart
// alternates RS/WS rows — odd rows are RS (read right → left), even rows
// are WS (read left → right). Chart symbols keep one meaning per shape but
// a different instruction depending on which side you're on, exactly like
// the K2/SK tokens already used for Peacock Tee:
//   blank = RS: k   / WS: p        dot = RS: p   / WS: k
//   K2 (right-leaning) = RS: k2tog / WS: p2tog
//   SK (left-leaning)  = RS: ssk   / WS: ssp
// The `flatChart: true` flag on the ff-gauge phase below tells chart.js's
// row-recap strip to flip both reading direction and stitch verbs on even
// (WS) rows instead of always assuming RS, in the round (see isRSRow() in
// chart.js).
//
// CHART_FF[0] = row 1 (cast-on row, worked first, displayed at the bottom).
// CHART_FF[35] = row 36 (worked last, displayed at the top).
// Rows 7-18 repeat rows 3-6 (×3); rows 23-34 repeat rows 19-22 (×3);
// rows 35-36 repeat rows 1-2 — all expanded out below to match how the
// chart is actually displayed, same as the Peacock Tee chart.
// ─────────────────────────────────────────────
const FF_MOTIF_CHART = [
  // Row 1
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 2
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 3
  ['K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K'],
  // Row 4
  ['K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K'],
  // Row 5
  ['K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K'],
  // Row 6
  ['K','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','K'],
  // Row 7 (= row 3)
  ['K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K'],
  // Row 8 (= row 4)
  ['K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K'],
  // Row 9 (= row 5)
  ['K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K'],
  // Row 10 (= row 6)
  ['K','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','K'],
  // Row 11 (= row 3)
  ['K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K'],
  // Row 12 (= row 4)
  ['K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K'],
  // Row 13 (= row 5)
  ['K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K'],
  // Row 14 (= row 6)
  ['K','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','K'],
  // Row 15 (= row 3)
  ['K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K'],
  // Row 16 (= row 4)
  ['K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K'],
  // Row 17 (= row 5)
  ['K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K'],
  // Row 18 (= row 6)
  ['K','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','K'],
  // Row 19
  ['K','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 20
  ['K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 21
  ['K','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 22
  ['K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 23 (= row 19)
  ['K','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 24 (= row 20)
  ['K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 25 (= row 21)
  ['K','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 26 (= row 22)
  ['K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 27 (= row 19)
  ['K','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 28 (= row 20)
  ['K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 29 (= row 21)
  ['K','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 30 (= row 22)
  ['K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 31 (= row 19)
  ['K','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 32 (= row 20)
  ['K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 33 (= row 21)
  ['K','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K'],
  // Row 34 (= row 22)
  ['K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','K'],
  // Row 35 (= row 1)
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
  // Row 36 (= row 2)
  ['K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K','K'],
];

// ─────────────────────────────────────────────
// SECTION 1 RAGLAN CHART — rows 1-14, 178 sts wide.
//
// Also worked flat (odd = RS, even = WS), so it uses the same flatChart
// handling as the gauge swatch above. 'E' cells are the no-stitch padding
// that makes the raglan's growing rows line up in a fixed-width grid — the
// row starts at 96 live sts and reaches 170 by row 14, and the recap strip
// filters E out so the spoken instructions only ever mention real stitches.
//
// M1L/M1R render as the directional increase icons and read as M1L/M1R on
// RS rows, M1LP/M1RP on WS rows (the purlwise variants the pattern calls
// for) — see STITCH_ABBR_RS/WS in js/core/chart.js.
//
// Verified against the pattern PDF: every row's live-stitch count matches
// the count printed in the written instructions (96, 104, 104, 112, 120,
// 120, 128, 136, 136, 144, 152, 154, 162, 170), and the generated row-recap
// text for rows 1-2 reproduces the PDF's wording verbatim.
// ─────────────────────────────────────────────
const FF_RAGLAN_CHART = [
  // Row 1
  ['K','E','P','M1R','E','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','E','M1L','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','M1R','E','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','E','M1L','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','M1R','E','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','E','M1L','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','M1R','E','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','E','M1L','P','E','K'],
  // Row 2
  ['K','E','P','P','M1R','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','M1L','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','M1R','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','M1L','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','M1R','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','M1L','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','M1R','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','M1L','P','P','E','K'],
  // Row 3
  ['K','E','P','P','K','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','E','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','E','K','P','P','E','K'],
  // Row 4
  ['K','E','P','P','K','M1R','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','M1L','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','M1R','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','M1L','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','M1R','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','M1L','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','M1R','E','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','E','M1L','K','P','P','E','K'],
  // Row 5
  ['K','E','P','P','YO','K','K','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','K','K','YO','P','P','E','K'],
  // Row 6
  ['K','E','P','P','K','YO','K2','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','SK','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K2','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','SK','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K2','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','SK','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K2','E','E','E','E','E','E','E','K','K','E','E','E','E','E','E','E','SK','YO','K','P','P','E','K'],
  // Row 7
  ['K','E','P','P','K','K','YO','K','E','E','E','E','E','E','K','K','E','E','E','E','E','E','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','E','E','E','E','E','E','K','K','E','E','E','E','E','E','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','E','E','E','E','E','E','K','K','E','E','E','E','E','E','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','E','E','E','E','E','E','K','K','E','E','E','E','E','E','K','YO','K','K','P','P','E','K'],
  // Row 8
  ['K','E','P','P','K','K','K','YO','K','E','E','E','E','E','K','K','E','E','E','E','E','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','E','E','E','E','E','K','K','E','E','E','E','E','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','E','E','E','E','E','K','K','E','E','E','E','E','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','E','E','E','E','E','K','K','E','E','E','E','E','K','YO','K','K','K','P','P','E','K'],
  // Row 9
  ['K','E','P','P','YO','K','K','K','K2','E','E','E','E','E','K','K','E','E','E','E','E','SK','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K2','E','E','E','E','E','K','K','E','E','E','E','E','SK','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K2','E','E','E','E','E','K','K','E','E','E','E','E','SK','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K2','E','E','E','E','E','K','K','E','E','E','E','E','SK','K','K','K','YO','P','P','E','K'],
  // Row 10
  ['K','E','P','P','K','YO','K','K','K','K','E','E','E','E','K','K','E','E','E','E','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','E','E','E','E','K','K','E','E','E','E','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','E','E','E','E','K','K','E','E','E','E','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','E','E','E','E','K','K','E','E','E','E','K','K','K','K','YO','K','P','P','E','K'],
  // Row 11
  ['K','E','P','P','K','K','YO','K','K','K','K','E','E','E','K','K','E','E','E','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','E','E','E','K','K','E','E','E','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','K2','K','K','SK','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','E','E','E','K','K','E','E','E','K','K','K','K','YO','K','K','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','K','K','YO','K','K','K','K','E','E','E','K','K','E','E','E','K','K','K','K','YO','K','K','P','P','E','K'],
  // Row 12
  ['K','M1L','P','P','K','K','K','YO','K','K','K2','E','E','E','K','K','E','E','E','SK','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K2','E','E','E','K','K','E','E','E','SK','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K','K','K2','SK','K','K','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K2','E','E','E','K','K','E','E','E','SK','K','K','YO','K','K','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','K','K','YO','K','K','K2','E','E','E','K','K','E','E','E','SK','K','K','YO','K','K','K','P','P','M1R','K'],
  // Row 13
  ['K','K','P','P','YO','K','K','K','K','K2','K','M1R','E','E','K','K','E','E','M1L','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','M1R','E','E','K','K','E','E','M1L','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','K','K','K','K','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','M1R','E','E','K','K','E','E','M1L','K','SK','K','K','K','K','YO','P','P','SK','YO','K','K','SK','YO','K','K','SK','YO','K','K','P','P','YO','K','K','K','K','K2','K','M1R','E','E','K','K','E','E','M1L','K','SK','K','K','K','K','YO','P','P','K','K'],
  // Row 14
  ['K','K','P','P','K','YO','K','K','K','K','K2','K','M1R','E','K','K','E','M1L','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','M1R','E','K','K','E','M1L','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','K','K','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','M1R','E','K','K','E','M1L','K','SK','K','K','K','K','YO','K','P','P','K','K','YO','K2','K','K','YO','K2','K','K','YO','K2','P','P','K','YO','K','K','K','K','K2','K','M1R','E','K','K','E','M1L','K','SK','K','K','K','K','YO','K','P','P','K','K'],
];

const FF_PHASES = [
  {
    id:'ff-mat', name:'Materials', desc:'Before you start',
    entries:[
      {kind:'note', id:'ffm1', text:'This pattern is graded by needle size rather than a fixed stitch count — pick a needle, swatch the motif below, and size up/down until the gauge fits'},
      {kind:'note', id:'ffm2', text:'2 sets of circular needles (sizes TBD from your swatch): one smaller for ribbing, one larger for the body'},
      {kind:'note', id:'ffm3', text:'Stitch markers, scrap yarn for holds'},
    ]
  },
  {
    id:'ff-gauge', name:'Gauge swatch', desc:'Cast on 36 sts · Frost Flower motif · 36 rows, worked flat',
    hasChart: true, flatChart: true, chart: FF_MOTIF_CHART,
    entries:[
      {kind:'note', id:'ffg1', text:'Block the swatch, measure its finished width, then multiply ×8 for finished chest circumference (plus however much positive ease you want — this pattern runs 4–15 cm of ease over bust measurement)', postChart:true},
    ]
  },
  {
    id:'ff-raglan', name:'Cast on & raglan', desc:'Section 1 · rows 1–14 · 88 sts → 170 sts, worked flat',
    hasChart: true, flatChart: true, chart: FF_RAGLAN_CHART,
    entries:[
      {kind:'note', id:'ffr1', text:'Count 170 sts after row 14, then continue from row 15 (not yet in the app — follow the printed pattern from here)', postChart:true},
    ]
  },
];

PATTERNS.push(
  { id:'frost-flower-cardigan', name:'Frost Flower Cardigan', badge:'Ngo Quynh · lace · graded by needle', desc:'Top-down lace cardigan · 8-motif Frost Flower body', phases: FF_PHASES, chart: FF_MOTIF_CHART,
    notes: [
      { term:'Knit / Purl', def:'Blank square — RS rows: knit. WS rows: purl.' },
      { term:'Purl / Knit', def:'Dot — RS rows: purl. WS rows: knit.', sym:'P' },
      { term:'Yarn over', sym:'YO' },
      { term:'Right-leaning decrease', def:'RS rows: k2tog. WS rows: p2tog.', sym:'K2' },
      { term:'Left-leaning decrease', def:'RS rows: ssk. WS rows: ssp.', sym:'SK' },
      { term:'Make one left', def:'Raglan increase — RS rows: M1L. WS rows: M1LP.', sym:'M1L' },
      { term:'Make one right', def:'Raglan increase — RS rows: M1R. WS rows: M1RP.', sym:'M1R' },
      { term:'No stitch', def:'Grey cell — placeholder so the raglan’s growing rows line up in the grid. Skip it; work the next real stitch.' },
      { term:'', def:'Charts are worked flat: odd (RS) rows read right → left, even (WS) rows read left → right.' },
    ] }
);

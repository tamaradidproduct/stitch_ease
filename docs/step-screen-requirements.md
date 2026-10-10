# Step screens — requirements per page

What each screen of the step-screen redesign must do. It describes the behaviour as built (see `docs/superpowers/specs/2026-10-05-step-screen-design.md` for the reasoning and `docs/superpowers/plans/2026-10-06-step-screen.md` for how it was built). Designs: Stitch project "Stitch Ease Knitting Tracker" and the Figma file `StitchEase-app` (components + screens).

Everything below applies only to a section on the **step model** (`isStepSection`) — currently behind `?steps=1`. Other sections keep the old screens.

---

## 0. Principles (every page)

- **One cursor per section.** Progress is a single number: rows completed. Everything before it is done, everything after is not. Pass and row-in-pass are derived, never stored.
- **Looking is not doing.** Selecting a row, ‹ ›, opening the player, opening the chart: none of them change progress. Only **Mark done / Done row N**, **Mark incomplete**, **Pass −/+** and ticking a checklist item do.
- **Work gets a tick; information never does.** Section notes, Setup and Check lines have no checkbox.
- **One primary action per screen** (the dock's main button). Everything else is secondary (outlined) or plain text.
- **Colour roles:** teal = primary action and "where you are"; coral = Setup / Check callouts; gray = everything passive (completed, labels, chips). No pills for plain information — a count, a row name or a status is text.
- **Nothing collapses or hides on its own.** The layout changes only when the person taps.
- **Fast taps.** Done / pass ± do no network work and no `await`; the playlist patches two rows in place (target: 100 taps in ≈ 50 ms).
- **Works offline;** no sign-in needed. Reduced-motion users get no animation.
- Text from patterns is raw HTML by convention; anything from another account is re-escaped on sync.

## 1. Shared components

### 1.1 Top bar
- Round back button · pattern/project name (small) · section name (larger) with a ⌄ section switcher · project row tally `done / total` with "ROWS" · ⋮ options menu.
- Sticky at the top; replaces the app header on the step screens.
- **Back:** playlist → project library; player and full chart → one level up (see each page).
- **Section switcher:** opens the section list; picking one goes there and resets the view state (selection, player).
- **Tally:** project-wide rows done / rows total; updates on every Done.
- **⋮:** the existing options menu (reset section / pattern).

### 1.2 Dock (fixed bottom)
- Previous · main button · Next, 48 px tall, safe-area aware.
- **Browse chip** sits directly above the buttons while the looked-at row is not the current row: "Viewing row 12 · on row 11" + **Back to current**. Hidden otherwise.
- Contents differ per page (below). The main button is the only filled button.

### 1.3 Callouts
- **Setup** (`before`) — a coral dot, "SETUP:" and the text. **Check** (`after`) — the same with "CHECK:". Plain text, no background.
- Shown on the row they belong to; for a repeat: the block's Setup throughout pass 1, its Check on the last row of the last pass, and a row's own on every pass.

### 1.4 Section notes card
- "SECTION NOTES — view / hide", collapsed by default; expands to the section's notes. Only present if the section has notes.

### 1.5 Heading (playlist and checklist)
- Small caps title at the left ("INSTRUCTIONS" / "CHECKLIST"), progress at the right (`3 / 12 rows · 25%` or `1 / 3 done`), the section description beneath, the original-PDF button at the right of that line.

---

## 2. Playlist (a section with rows)

**Purpose:** see the whole section, glance ahead, record progress, and pick a row to look at.

**Entry:** opening a project; switching section; back from the player.

**Layout, top to bottom:** top bar → section notes card (if any) → heading → rows in order → (dock).

**Rows**
- **Completed:** muted text, "COMPLETED" label, its Setup/Check lines as small asides.
- **Upcoming:** body text, asides.
- **Current row, not selected:** an ordinary row labelled "CURRENT ROW" in teal.
- **Selected row** (the current row by default): a **full-bleed white section** (edge to edge of the screen, any width), with
  - a gray bar: row name (`R4 (RS)`) left, status right;
  - Setup line (if any);
  - the instruction (17 px, medium);
  - for a chart row or a repeat row with a motif: a **three-row chart preview** (row above, the row, row below; stitch numbers, row numbers both sides, legend) — a wide chart bleeds off the sides and scrolls;
  - Check line (if any);
  - actions: **Note** (only if the section has notes; toggles the notes card) and **Mark done** (outlined) — or **Mark incomplete** when the selected row is already done.
- Tap any other row → it becomes the selected row (no progress change, no navigation).
- Tap the selected row's instruction, or its chart preview → open the **player** on it, with the grow animation. (A repeat row's instruction is not tappable; its chart preview is.)

**Repeat blocks**
- While the block is being worked, or one of its rows is selected: a **pass stepper** (− · "REPEAT SEQUENCE / Pass 2 of 4" · +) and only the rows of the shown pass, numbered within the pass (R1, R2…).
- Otherwise a single quiet line: "Repeat · 2 rows × 4" (Completed when done). Tapping it selects its first row.
- **+** finishes the current pass (cursor → row 1 of the next pass; on the last pass it completes the block). **−** goes to the start of the current pass, or of the previous one when already on its first row; stops at row 1 of pass 1. No confirmation.
- The stepper shows the pass of the selected row; the buttons always act on progress.

**Dock:** ‹ previous row · **Next row** (records the current row — same as Mark done) · › next row. When the section is complete the main button becomes **Next section** (or **Finished!** on the last one).

**Rules**
- Mark done on the current row: cursor +1, selection follows to the new current row, the list scrolls it to centre.
- Mark done on a row **ahead** of the current one: confirm sheet "Mark rows 5–8 complete?"; on yes the cursor moves past it.
- Mark incomplete on a done row: cursor moves back to that row; if it un-completes more than one row, confirm first.
- ‹ / › move the selection one row (not step); at the first/last row they continue into the previous/next section (see §3 "Crossing sections"). The page scrolls the newly selected row into view.
- Completing the last row of the section does not leave the page.
- Empty section (no rows, no tasks): the heading and notes only.

**Edge cases:** section with 0 rows renders as a checklist page (§6); a cursor outside 0…N is clamped; a repeat with no rows or no passes counts zero rows and is skipped.

---

## 3. Player — chart row

**Purpose:** one row, large, with its chart.

**Entry:** from the playlist (grow animation); ‹ › from another row. **Exit:** back chevron → playlist (the current row scrolled into view).

**Layout:** top bar → section notes card → row head → Setup line → **instruction** (21 px, medium — the largest text on the page) → chart window → dock.

- **Row head:** `ROW 5 (RS)` (quiet caps label) left, `of 12` (muted) right; beneath: `READ RIGHT → LEFT` (or left → right for WS) left, status right (Current row in teal / Completed / Upcoming).
- **Chart window:** a gray bar "VIEWING ROWS 2–8" with the row's Check line at its right, stitch numbers across the top, seven rows (the row ±3, clamped at the ends of the chart; the current row on a teal band, others fading with distance), row numbers both sides, a legend of the stitches shown. A wide chart scrolls sideways, opening at the end the row starts from.
- Real stitch symbols and per-cell yarn colours are used; a mid-row marker, if set, shows as a ring and dot on its cell.

**Dock:** ‹ previous row · **Done row N** (or **Mark row N incomplete** if it is done) · › next row; browse chip above when the row is not the current one.

**Rules**
- Done / Mark incomplete follow the playlist rules (§2), including the "ahead" confirm.
- ‹ / › change the row, scroll the page to the top, and cross sections: › on the last row goes to the first row of the next section, ‹ on the first row to the last row of the previous one. The player stays open if the next section has rows; a checklist section opens its checklist page.
- When Done completes the last row of the section the player closes (nothing left to stand on).
- The section switcher in the top bar works from here.

---

## 4. Player — written row

Same as §3 without the chart window.
- Row head: `ROW 3` · `of 12`; no reading direction (only chart rows have RS/WS).
- Under the instruction: the row's Check line, then a **next-row preview** (muted: label, "NEXT", text).
- Everything else — dock, rules, crossing sections — as §3.

## 5. Player — repeat row

Same as §3/§4 with these differences.
- Row head: `ROW 2 OF 4` left, `PASS 3 OF 6` right.
- If the repeat carries a **motif chart**, the chart window draws the motif (its own stitch columns and rows, no RS/WS, no mid-row marker); otherwise there is no chart.
- Pass ± are not on this page; they live on the playlist's stepper.

---

## 6. Full chart (built, no entry point yet)

The ⤢ button that opened it is hidden for now. When re-enabled:
- Top bar (back → the row), tools: **A−**, **A+** (the existing cell-size preference, 10–32 px), **Current row** (recentre), **Colours** and yarn chips for colourwork charts.
- The whole chart, newest row at the top, current row on a teal band, row numbers both sides (left ones sticky), a legend, horizontal scroll.
- Tapping a row only **looks** at it (outline); the dock's single button reads **Back to row N** and returns to the player on that row.
- **Not built:** dragging the mid-row marker.

---

## 7. Checklist (rowless section)

**Purpose:** work that is not rows — bind off, sew, weave in ends.

- Top bar (back → library) → notes card → heading "CHECKLIST · 1 / 3 done" → one line per task: a checkbox and the text.
- Tapping a task toggles it (done: filled teal box, struck-through muted text). Ticking changes nothing else — rows tally and section cursors are untouched.
- Dock: ‹ previous section (hidden on the first section) and one button, **Next section** or **Finished!**; no row browsing here.
- A section is complete when every task is ticked.

## 8. Notes-only section

- A rowless section whose items are information (materials, gauge): the top bar, the section notes card (collapsed by default, like any notes card) and the dock as in §7.
- It has nothing to tick and never shows a "complete" mark; moving on is by the dock.
- **Open issue:** as built it still shows the checklist heading with "0 / 0 done", and the items are hidden until the notes card is opened. A materials page should probably show its notes expanded and drop the heading — decide before release.

---

## 9. Not in scope here

- The project library, picker, glossary and account screens (unchanged; library cards count a step section's rows and tasks).
- Sections still on the old renderer: Where Are the Leaves' chart section.
- Making the step model the default, rewriting the pattern files from the classification review (`docs/superpowers/plans/2026-10-07-step-conversion-review.md`), and the release decisions are listed in the plan's Task 9 notes.

## Stitch count (`sts`)

A row may carry an optional `sts` — the stitch count **after** that row. A number for an ordinary or chart row; for a row inside a repeat, a number or an array indexed by pass (`sts: [66, 68, 70]`). `spCount(row)` returns it only when it is a finite number; otherwise the count is hidden everywhere (card, playlist line, repeat list, end-of-pass line). No pattern carries counts yet; adding them is separate work (`docs/step-screen-v2-requirements.md` §7).

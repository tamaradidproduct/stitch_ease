# Step screen v2 — manual test cases

For the step screens as built on branch `step-screen-v2` (requirements: `step-screen-v2-requirements.md`, look: `design-direction.md`). The new screens are behind a flag.

**Setup (all cases unless stated):**
- From the repo root run `python3 -m http.server 8765`, then open `http://localhost:8765/?steps=1&demo` (the `demo` flag adds the unshipped **Step demo** pattern).
- Use a phone-width window (375 px) unless a case says otherwise; reload with the service worker cleared if you see old styling (DevTools → Application → Clear storage).
- In the library tap **＋**, choose **Step demo**, and open the new project. Its sections: **Written rows** (3 rows, Setup and a Check on row 1, section notes), **Repeat** (4 passes × 2 rows, a motif chart), **Chart** (12 chart rows), **Finishing** (a checklist).
- Priorities: P0 must pass, P1 should pass, P2 nice to have.

Fields per case: **Area · Priority · Preconditions · Steps · Expected**.

---

## Player

**TC-01 Row position appears once, above the card** · Player · P0
- Preconditions: Step demo project, section Chart.
- Steps: tap row 3 in the playlist, then tap its instruction to open the player.
- Expected:
  - `Row 3 of 12` is a heading above the card (outside it), with RS/WS and the reading direction beside it. It is clearly smaller than the instruction.
  - It appears exactly once: no second row number anywhere on the screen, and nothing above the instruction inside the card.

**TC-02 Setup is collapsed by default and toggles** · Player · P0
- Preconditions: **Chart** section, row 1 (it has Setup text).
- Steps: open the player on row 1. Tap `SETUP ▸`. Tap `SETUP ▾`. Open another row, then come back.
- Expected:
  - Setup starts collapsed.
  - Tapping expands the text with a thin sage rule on its left and the arrow turns to ▾.
  - Tapping again collapses it.
  - It never opens or closes on its own.

**TC-03 Instruction is the main content; long text grows the card** · Player · P1
- Steps: open the player on a row. In the console run `document.querySelector('.sp-ins').textContent = 'k2, yo, '.repeat(60)`.
- Expected:
  - The instruction is the largest text on the card.
  - The card grows to fit the text without clipping.
  - The chart keeps at least its minimum height and the player area scrolls.

**TC-04 Count and Check are hidden when absent** · Player · P0
- Steps: open **Written rows** row 1 (it has a Check of `88 sts` and no count), then row 2 (neither).
- Expected:
  - Row 1 shows the Check at the foot of the card, in sage with a rule on its left, and no count.
  - Row 2 shows no line at all at the foot, and no empty gap.

**TC-05 Count shows when a row has one** · Player · P1
- Preconditions: stitch counts are not in any pattern yet, so inject one.
- Steps: in the console run `PATTERNS.find(p=>p.id==='step-demo').phases[0].steps[0].sts = 41`, create a new Step demo project, open **Written rows** row 1 in the player.
- Expected:
  - `41 sts` shows at the foot of the card as a muted label with the figure in dark sage.
  - The Check sits beside it with a rule on its left, visibly different from the count.
  - The playlist line for row 1 also shows `41` on the right.

**TC-06 Chart row: chart, symbols and legend** · Player · P0
- Steps: open the player on a **Chart** row.
- Expected:
  - The chart runs edge to edge with no box around it.
  - The current row is on a sage band, with row numbers on both sides and stitch numbers across the top.
  - The symbols are the app's own (YO ring, k2tog and SKPO triangles, purl dot).
  - The chart area is a slightly darker well; stitches are light cells that stand out, the current row is at full strength on a sage band and the rows around it fade into the well.
  - A stitch has two states. In the current row every stitch (plain knit cells included, but not no-stitch cells) is in its current state: a pale sage background, a sage ring and a dark sage symbol (the row number is dark sage too). All other rows show the default state: a light cell with a dark symbol.
  - On a colourwork chart a stitch keeps its yarn colour in the current row; its ring and symbol colour are picked for contrast with that yarn.
  - The chart area has no empty gap under the last row: the rows fill the height (a fraction of a row left over is split above and below), and the count adjusts when the screen height changes (for example when the browser's address bar hides).
  - The chart never scrolls vertically: it shows as many rows as fit (at least seven) around the current row. (A full-chart view comes later.)
  - While you scroll a wide chart sideways, the row numbers of the end you are nearer to stay in view: left numbers when you are closer to the left end, right numbers when closer to the right.
  - Every stitch is a square of the same size; none is stretched or squeezed. A chart wider than the screen scrolls sideways (opening at the end the row starts from), a narrower one is centred.
  - The legend is one line: Knit plus up to three stitches, then `+N` if there are more, then a book icon at the right that opens the stitch sheet.

**TC-07 Chartless row keeps its natural height** · Player · P1
- Steps: open the player on **Written rows** row 2.
- Expected:
  - No chart area is shown.
  - The card is only as tall as its content and does not stretch to fill the screen.
  - Under the card there is still the glossary strip, styled like the legend under a chart: it lists the stitches named in the row's text (the first three, then `+N`), or just `Stitch glossary` when none are found, with the book icon at the right. The icon opens the stitch sheet.

**TC-08 Dock labels and the one primary action** · Player · P0
- Steps: in **Written rows**, open the player on row 1. Tap the main button. Tap ‹ to go back to row 1.
- Expected:
  - The main button reads `Mark row 1 done` on the current row.
  - After marking, the screen moves to row 2 and the button reads `Mark row 2 done`.
  - Back on row 1 (done), the button reads `Mark row 1 not done` and is outlined, not filled.
  - There is no other Done or Mark button anywhere on the screen.

**TC-09 Confirm sheets** · Player · P0
- Steps:
  - Chart section, cursor at row 1: browse to row 4 with › and tap `Mark row 4 done`.
  - Tap Cancel, then repeat and tap `Mark done`.
  - Now browse back to row 1 and tap `Mark row 1 not done`.
- Expected:
  - The first sheet is titled `Mark rows 1–4 done?` and has Cancel and `Mark done`. Cancel changes nothing.
  - Confirming moves your place past row 4.
  - The second sheet is titled `Mark rows 1–4 not done?` with `Mark not done`. Confirming moves your place back to row 1.
  - A single-row change (current row, or the last done row) shows no sheet.

**TC-10 Browsing never changes progress** · Player · P0
- Steps: note the tally in the top bar. Tap ‹ and › several times, open and close Setup, open the section sheet, open the glossary and go back.
- Expected:
  - The tally is unchanged.
  - A chip above the dock reads `Viewing row N · on row M` with `Back to current` whenever the row shown isn't the current one.
  - `Back to current` returns to the current row.

**TC-11 ‹ › crosses sections** · Player · P1
- Steps: open the last row of **Written rows** in the player and tap ›. Then tap ‹.
- Expected:
  - › opens the first row of the next section with rows (the player stays open).
  - ‹ returns to the last row of the previous section.

## Top bar, glossary and PDF

**TC-12 Top bar contents** · Navigation · P0
- Steps: look at the bar in the playlist and in the player. Tap the back chevron in each. Scroll the playlist.
- Expected:
  - **Playlist:** the bar shows back, the project's name alone, a `3 / 12 rows`-style tally (the section's), a document icon and ⋮. There is no section name in the bar.
  - **Player:** the project's name small above the section's name, plus the same tally, document icon and ⋮. The section name has no chevron and is not tappable.
  - Back from the player goes to the playlist; back from the playlist goes to the library.
  - The bar stays put while scrolling.

**TC-13 Section name and switcher at the head of the playlist** · Navigation · P1
- Steps: in the playlist tap the section's name at the top of the list (it has a chevron).
- Expected:
  - A sheet opens with the section's notes (if any) and every section as a button, the current one highlighted. Tapping another section switches to it and closes the sheet; progress is unchanged.
  - There is no way to switch sections from the player.

**TC-14 Long names truncate** · Navigation · P1
- Steps: rename the project to 50 characters. In the console run `PHASES[cur].name = 'A very long section name that keeps going'; spRender()`. View the playlist and the player at 375 px and 320 px.
- Expected: the project's name and the section's name end in an ellipsis where they share the bar; the tally, document icon and ⋮ stay fully on screen. The section heading at the head of the playlist wraps instead of cutting off.

**TC-37 Rename a project from the bar** · Navigation · P1
- Steps: in the playlist tap the project's name in the bar. Change the name and confirm. Open the player and tap the small project name above the section name.
- Expected: a `Rename project` sheet opens with the current name; confirming updates the bar at once (and the library card); cancelling changes nothing. The same sheet opens from the player's small project name.

**TC-15 Stitch sheet and glossary: Back returns to the row** · Glossary · P0
- Steps: open the player on a row. Tap the book icon in the strip under the card or chart. In the bottom sheet tap `Full glossary ›`, then tap Back in the glossary. Repeat from the library's book icon.
- Expected:
  - The book icon opens a bottom sheet titled `Stitches`, not a new page. It lists `ON THIS ROW` (each stitch the row uses, with its symbol where the chart has one, and its definition), then `IN THIS PATTERN` (the pattern's own notes, if any), and a `Full glossary ›` button. It closes with × or a tap outside.
  - `Full glossary ›` opens the whole glossary page. Back from it returns to the same row in the player, with the same Setup state, not to the library.
  - From the library's book icon, Back still returns to the library.

**TC-34 Stitches on the row** · Glossary · P1
- Steps: in Written rows open row 1 (`k1, p1 rib to end`), then use the console to set a row's text, e.g. `spText = r => 'k2, yo, k2tog, *p1, k3* rep to end'; spRender()`, and open the stitch sheet.
- Expected:
  - The strip lists Knit, Yarn over, Knit two together, then `+1` (Purl); ordinary words such as `rep`, `to` and `end` are not listed.
  - On a chart row the sheet lists the stitches in that chart row.
  - If the pattern defines its own terms (for example `DS`), they appear with the pattern's definition.

**TC-16 PDF button** · PDF · P1
- Steps: tap the document icon in the top bar.
- Expected:
  - The existing original-pattern PDF sheet opens (attach / open, as before).
  - A blue dot appears on the icon only when a newer PDF is waiting.

## Repeat

**TC-17 Repeat state** · Repeat · P0
- Steps: open the **Repeat** section and its player on row 1.
- Expected:
  - A heading above the card reads `Repeat · 2 rows × 4`, in the same style as a row heading (`Row 3 of 12`).
  - The card shows `Pass 1 of 4`, − and + buttons, and only the two rows of the pass shown.
  - The selected row is larger, with no box around it.
  - The dock reads `Mark R1 of pass 1 done`.
  - There is no separate "Pass done" button.

**TC-18 Pass − / +** · Repeat · P0
- Steps: tap +, then +, then −, then − , then −.
- Expected:
  - + finishes the current pass: your place moves to row 1 of the next pass and the pass line updates.
  - − goes to the start of this pass, or to the start of the previous pass when you are already on its first row.
  - It stops at row 1 of pass 1.
  - No confirmation sheet appears.

**TC-19 Tapping a repeat row only looks** · Repeat · P0
- Steps: note the tally. Tap R2 in the list.
- Expected:
  - R2 becomes the larger selected row and the dock reads `Mark R2 of pass 1 done` with the browse chip above it.
  - The tally is unchanged.

**TC-20 Motif chart** · Repeat · P1
- Steps: open the repeat player. Then in the console run `PATTERNS.find(p=>p.id==='step-demo').phases[1].steps[0].motif = null`, create a new project and open the repeat again.
- Expected:
  - With the motif: the chart area draws the small motif chart and highlights the selected row.
  - Without it: no chart area, and the card keeps its natural height.

**TC-21 Repeat counts** · Repeat · P2
- Steps: inject counts, then open the repeat: `PATTERNS.find(p=>p.id==='step-demo').phases[1].steps[0].rows.forEach(r => r.sts = [66,68,70,72])`, create a new project.
- Expected:
  - Each row shows its count at the right.
  - The foot of the card reads `70 sts at end of pass 3` on pass 3.

## Playlist

**TC-22 Section description and notes** · Playlist · P1
- Steps: open **Written rows** in the playlist; tap `SECTION NOTES view`.
- Expected:
  - Under the top bar there is only the section's description line. There is no `INSTRUCTIONS` heading, no progress text and no progress bar (the top bar's tally is the one progress figure).
  - A `SECTION NOTES view` row, collapsed. Tapping it shows the notes.

**TC-23 Selected row is a card without a Mark button** · Playlist · P0
- Steps: look at the playlist, then tap a different row.
- Expected:
  - The selected row is a plain white card: label (`ROW 2 · CURRENT`), the instruction, a three-row chart preview on chart rows, the count/Check at the foot, and an `Open row ›` button.
  - There is no Mark or Done button and no coloured bar down its side.
  - Done rows are muted with a ✓; the current row, when not selected, is tagged `CURRENT ROW`.
  - Tapping the instruction or `Open row ›` opens the player.

**TC-32 Playlist: a repeat is one card** · Playlist · P0
- Steps: open the **Repeat** section in the playlist. Tap +, then tap R2 in the card, then `Open row ›`. Go back to the playlist and move on past the repeat (mark its rows done) so it is no longer current.
- Expected:
  - While the repeat is current or selected it is a single card: `REPEAT` and `Pass n of 4` with − / +, the pass's rows (tap one to look at it; the selected row is larger), Setup, the end-of-pass count and the Check, and one `Open row ›` button.
  - There is no separate stepper and no separate selected-row card for it.
  - `Open row ›` opens the player on the selected row, showing the same repeat card with the dock reading `Mark R2 of pass 2 done`.
  - Like any other row, the repeat is expanded only when it holds the selected row (the current row by default). When the current row is inside it but you have selected a different row elsewhere, it collapses to one quiet line, `Repeat · 2 rows × 4`, tagged `CURRENT ROW · PASS n OF 4`; only one card is ever open.
  - A completed repeat is the same line with a ✓.
  - The card's label carries the repeat's own summary: `REPEAT · 2 ROWS × 4`.

**TC-35 Feedback on every change of progress** · Player · P0
- Steps: in the playlist and in the player, tap `Mark row N done`, then `Mark row N not done`; in a repeat tap + and −; move between rows with ‹ and › (including across sections). Press and hold any button without releasing. Repeat with Reduce Motion switched on in the device settings.
- Expected:
  - Every change of progress, and every move with ‹ ›, is acknowledged: the next row's card (playlist) or the whole row screen (player) eases in with a short fade and rise (about a fifth of a second). Moving with ‹ › gives no vibration, since nothing was marked.
  - On Android a short vibration accompanies it (slightly longer for done, shorter for not done and pass −). iPhones have no vibration support in the browser, so there only the visual feedback shows.
  - While a button is pressed it looks pressed (darker or smaller) before anything else happens, including the −/+ pass buttons, the ‹ › buttons and the main button.
  - With Reduce Motion on there is no movement: the press state and the transition are skipped.

**TC-36 The whole selected card opens the row** · Playlist · P0
- Steps: in the playlist tap the selected card on empty space, on its instruction and on its chart preview. Then tap the Setup toggle, and, in a repeat card, a row, − and +.
- Expected:
  - Tapping anywhere on the selected card that isn't a control opens the player on that row.
  - The Setup toggle, − / + and the repeat's rows keep doing their own thing and do not open the player.
  - `Open row ›` still works.

**TC-24 Focus follows the selection** · Playlist · P0
- Preconditions: **Chart** section in the playlist, window small enough that the list scrolls.
- Steps: tap › five times. Tap a row near the bottom of the screen. Tap `Mark row N done`.
- Expected:
  - After each action the selected row sits near the top, just under the bar, with the previous row visible above it.
  - A row tapped near the bottom scrolls fully into view and is never hidden behind the dock.
  - With reduced motion on, the scroll is instant.

**TC-25 Done speed** · Playlist · P2
- Steps: in a fresh project's **Chart** section (playlist, no browsing), tap `Mark row N done` twelve times in a row as fast as you can.
- Expected: every tap updates the card, the tally, the progress bar and the dock immediately, with no lag and no flicker of the whole list. (Developer target: 100 taps in about 50 ms; measured today at about 120–150 ms.)

## Persistence and the rest of the app

**TC-26 Progress persists** · Persistence · P0
- Steps: mark three rows done, open the repeat and go to pass 3, tick a **Finishing** task. Reload the page.
- Expected: every position and tick is where you left it; nothing resets and no "Pattern updated" chip appears.

**TC-27 Checklist section** · Finishing · P1
- Steps: open **Finishing**.
- Expected:
  - The top bar and a checklist; ticking a task fills its box in dark sage and strikes the text.
  - Ticking changes no row tally.
  - The dock has ‹ for the previous section and one button, `Next section` or `Finished!`.

**TC-28 Rest of the app is restyled, not changed** · Visual · P0
- Steps: visit the library, **New project** picker, the glossary, the account sheet, the PDF sheet and a Delete confirmation.
- Expected:
  - Light-grey and white surfaces, one sage accent, one sans-serif typeface, small corner radii, no beige and no orange.
  - Delete is a red button.
  - Every screen behaves as before (layout, buttons, navigation).

**TC-29 Old chart screen still works** · Regression · P0
- Preconditions: a project on the old renderer (open the app without `?steps=1`, open a Peacock Tee project, go to the yoke chart).
- Steps: change rows with + and −, zoom with A− and A+, and tap a row.
- Expected: the chart, row counter, zoom and highlight work as before and show no layout break from the restyle.

**TC-30 Small and large windows** · Visual · P1
- Steps: view the player (chart row and repeat) and playlist at 320 px, 375 px, 414 px and 768 px wide.
- Expected:
  - No horizontal page scroll and no text cut off the screen, except truncated names.
  - At 768 px the content stays centred in a column, with the dock buttons aligned to it.

**TC-31 Offline and update** · Service worker · P1
- Steps: load the app online, go offline, reload. Then bump nothing and reload online.
- Expected: the app loads offline with the new styles and screens; no screen falls back to unstyled markup.

---

Deferred issues you may notice while testing (known, not bugs in this build): the legend's book button can clip at 320 px with long stitch names; the glossary doesn't yet include the pattern's own stitches (follow-up); banners can cover the dock; chart stitch numbers scroll out of view on tall charts.

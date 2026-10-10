# Step screen v2 — requirements

Product requirements from the interview of 2026-10-09. They revise the step screens described in `step-screen-requirements.md` (as built) and the spec in `superpowers/specs/2026-10-05-step-screen-design.md`. A clickable prototype is in `docs/prototypes/step-screen-v2.html`.

## 1. Problem

- **Goal:** while knitting, the screen answers two questions at a glance: *what do I do right now?* and *am I on the right row?*
- **Failure to fix:** the app's position drifts from the needles.
  - People who have memorized a row stop looking at the phone and skip tapping Done.
  - The screen then shows the wrong row, and nothing on it says so.
  - Seen on Hatsuki: a missed Done led to extra repeats being knitted.
- **Safety net:** show the **actual stitch count** for each row. Designers don't state it; the app works it out. A count is objective: it lets the knitter check the app's position against the knitting without trusting either.
- **Done stays a deliberate tap.** No reminders, prompts or auto-advance. Catching up (selecting a later row, marking done, confirming) stays as built.
- **Current screen's weaknesses:**
  - The top bar and section name take too much space.
  - The row number appears twice.
  - The instruction isn't prominent enough.
  - The chart is capped at seven rows and doesn't use free space.
  - The player looks pasted into a different app.

## 2. Information priorities (player)

| Tier | What | Treatment |
|---|---|---|
| 1 | Instruction text, chart, stitch count | Always visible, no taps |
| 2 | Row number with total (once) | Visible, compact |
| 3 | Setup, designer's Check line | Visible but quiet; Setup collapsible |
| 4 | Glossary, section notes, section switcher, project name, PDF, ⋮ | One tap away, never in the way |
| — | What's next | Navigation (‹ ›) is enough; no preview needed |

## 3. Player layout

### 3.1 Top bar
- One slim line (about 40 px): back · project name (quiet) · section name with ⌄ (quiet) · ⋮.
- **Back** is always reachable and returns to the playlist.
- **Project name** is quiet, small text above the section name, which is the stronger of the two.
- **Section name** opens a sheet with the section's notes and the section switcher.
- **Section tally** (`3 / 24 rows`) at the right of the bar, next to the section name. There is no project-wide tally; it is only useful for single-section patterns.
- **PDF button:** the original pattern PDF has its own icon button in the bar, between the tally and ⋮, so it is one tap from any row. It opens the existing PDF sheet (open, attach, sync state). It is not buried in ⋮.
- **⋮** keeps reset section / reset pattern. It is reachable but not prominent.

### 3.2 Vertical split
- The area between the top bar and the dock is divided about **1 / 3 for the instruction card and 2 / 3 for the chart**.
- **Instruction card taller than a third:** it grows to fit its content. The chart keeps a minimum height, and the area scrolls.
- **No chart on this row:** the chart area is hidden and the card does **not** grow to fill it. The card keeps its natural height.
- The chart's own minimum is seven rows; it shows as many as fit.

### 3.3 Instruction card
- **Row heading (player):** `Row 4 of 44` sits **above** the card, outside it, in heading style (18 px semibold, a step quieter than the instruction), with `RS` / `WS` and the reading direction (`read right → left`) beside it. The row number is not repeated anywhere else on the screen. (In the playlist the selected card keeps its small caps label inside the card.)
- **Setup:** a quiet text toggle (`SETUP ▸`) directly above the instruction, so it reads as part of it. **Collapsed by default**; the person expands it, and it never changes on its own. Expanded text carries a thin accent rule on its left.
- **Instruction:** the main content of the card and the most prominent text on the screen, larger than the section name and row line. Plain text on the card: no chip, pill or boxed panel around it.
- **Stitch count:** a **muted label** ("88 sts"), not a chip. It sits below the instruction.
- **Designer's Check line:** beside the count, **visually distinct** from it so a computed value and an authored one can't be confused (e.g. Check in the accent colour with a rule on its left, versus the muted count).
- **Count unavailable:** hidden. No placeholder.

### 3.4 Chart
- Fills its half of the screen. Current row highlighted; surrounding rows fade with distance.
- **Full-bleed:** edge to edge of the screen, no box or side margins; a wide chart may run off the sides and scroll.
- Stitch numbers across the top, row numbers on both sides, per-cell yarn colours, mid-row marker as built.
- **Symbols** are the app's own chart symbols (the Figma Stitches set already in `js/core/chart.js`), in the chart and the legend.
- **Legend** under the chart is one line: the stitches used, truncated to the first few with a `+N` for the rest, then a **glossary icon button** at the right. It never wraps to a second line.

### 3.5 Dock
- ‹ previous row · main button · › next row.
- Main button reads **"Mark row N done"**. When row N is already done it reads **"Mark row N not done"**.
- The browse chip ("Viewing row 12 · on row 11 · Back to current") stays when the viewed row isn't the current row.
- Catch-up rules are unchanged: a confirm sheet before marking rows ahead, and a confirm sheet before "not done" un-completes more than one row.

## 4. Written rows (no chart)
- Same card as §3.3; the chart area is hidden and the card keeps its natural height (§3.2).
- No next-row preview.

## 5. Repeat state (same screen)
- A repeat is a **state of the player**, not a separate screen.
- **Pass line:** `Pass 3 of 6` with the existing **− / +** stepper beside it. Behaviour is as built: + finishes the pass, − goes to the start of this or the previous pass. There is no separate "Pass done" button.
- **Rows:** every row of the current pass, listed together in the card, numbered within the pass (R1–R4). Tapping a row moves your place within the pass; looking at a row never changes progress.
- **Counts:** the stitch count after each row, and at the end of the pass. Per-row counts are in the first release; patterns are retrofitted with them separately (§7).
- **Chart:** the repeat's motif chart if it has one; otherwise hidden (§3.2).
- Dock as §3.5, acting on the selected row.

- **In the playlist:** a repeat is one card for the whole block while it is current or selected: the pass line with − / +, the pass's rows, Setup, the end-of-pass count and Check, and a single `Open row ›` that opens the player on the selected row. Like any other row it is expanded only when it holds the selected row (the current row by default); otherwise it is one quiet line (`Repeat · 2 rows × 4`, tagged `CURRENT ROW · PASS n OF T` when the current row is inside it, with ✓ when done). The card's label carries the repeat's own summary (`REPEAT · 2 ROWS × 4`), not the section description.

## 6. Glossary
- A **dedicated glossary**, reached from the legend's **Glossary ›** link and from the library home as today. No tap-to-define on instruction text or chart symbols (too fiddly on a small screen).
- Covers general stitches **and** the designer's pattern-specific stitches (the pattern's `notes`) together.
- Searchable, as built.

## 7. Computed stitch counts
- **Source:** derived from the instruction and chart data. Patterns that already state a count keep it; Hatsuki's shoulder rows already show one (commits `753453e`, `588eda9`).
- **Every row** where a count can be computed.
- **Repeats:** count at the end of each pass; per row as a bonus.
- **Imported patterns:** counts are not available for them at first. A later option is AI-derived counts at import; out of scope here.
- **Tallies:** a rows-done tally per section, in the top bar (§3.1). "Rows since marker" joins it once markers exist.
- **Retrofit:** counts are added to existing patterns separately from the screen work; rows without one hide the label (§3.3).

## 8. Visual language
- **One typeface family, sans serif**, for every piece of text including instructions. No serif/sans contrast.
- **Modern and friendly:** neutral light-grey and white surfaces (no beige), a single sage-green accent, generous spacing and rounded corners. No orange or coral accent.
- **Chart cells use one neutral colour** unless the pattern defines yarn colours; there is no decorative colour split.

## 9. Principles carried over
- One cursor per section; looking is not doing; only the Mark done / not done, pass ± and checklist ticks change progress.
- Work gets a tick, information doesn't.
- One primary action per screen: the dock's main button.
- Nothing collapses or hides on its own.
- Fast taps: no network work or `await` on Done / pass ±.
- Works offline; reduced-motion respected.
- Player and playlist share one visual language.

## 10. Parked and open

### Parked (separate work)
- **Markers and lifelines:**
  - Notes pinned to a row, shown in the playlist and in a project-wide list reachable from any screen
  - A "N rows since marker" readout
  - Marker types and the add flow
  - Markers inside a row (e.g. "after stitch 12")
- **AI-derived counts** for imported patterns.
- **Playlist redesign:** not discussed; the player comes first, and the playlist is checked against it afterwards.

### Open
- What the playlist's selected-row block adopts from the player (count label, collapsible Setup, the top-bar tally). Decide after the player is confirmed.

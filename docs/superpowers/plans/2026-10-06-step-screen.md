# Step Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two section renderers (written cards, chart dock) with one playlist + player driven by a single per-section row cursor.

**Architecture:** A new pure module `js/core/steps.js` owns the cursor math and Done/pass rules; it coexists with `rows.js` behind an `isStepSection(section)` shape check, so nothing shipped changes until real patterns are converted (Tasks 8+9 ship together). Rendering is a new `js/core/player.js` that reuses chart cell/recap helpers from `chart.js`.

**Tech Stack:** Classic browser scripts (no modules, no build), localStorage, Supabase sync. Tests are in-browser selftests (`*.selftest.js`, never shipped); CI is `node scripts/check.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-05-step-screen-design.md`

**Scope note:** Tasks 1–3 are specified to the signature. Tasks 4–9 are specified to the interface and acceptance test only. Each depends on rendering/layout decisions (see Gate A) and on reading `render.js`/`chart.js` closely, so expand each into steps just before starting it.

## Global Constraints

- Classic scripts; new shipped files go in `index.html` **before** `js/core/app.js` and in `sw.js` ASSETS; bump `stitch-ease-vN` in `sw.js` when deploying.
- `pt3_` prefix and all four migrations stay. `pt3_schema` becomes `4` only in Task 9.
- Done / pass ± tap budget: 100 taps under 50 ms; no network, no `await`, no pattern-doc `JSON.stringify` on that path.
- "Work gets a tick; information never does" — notes, `before`, `after` never get a checkbox.
- No auto-collapse / auto-hide anywhere; layout changes only on a tap.
- Progress is browse (never changes progress) or explicit (Done, Done-ahead with confirm, Mark incomplete, Pass ±).
- Progress UI counts rows ("Row 12 of 20"), agreeing with the header Rows tally = Σ section cursors.
- Upgrade older sync rows on read; refuse only newer ones. Never upload `base`.
- Don't render a synced pattern without `sanitizeSyncedPattern`; text renders as raw HTML, so `before`/`after`/`notes` strings need the same escaping as `text`.
- Use `openSheet`/`sheetConfirm`, never `confirm()`/`prompt()`.
- Commit/push/PR only when the user asks (CLAUDE.md, memory). The commit steps below are **"when asked"**. Work in its own worktree/branch off `main`, not `claude/hatsuki-left-shoulder-count`.

## Review Focus

- Cursor out of range (hand-edited localStorage, pattern whose row count shrank): clamp to `0…N`, never throw.
- Repeat with `rows: []` or `times: 0`: counts 0 rows, is skipped by the cursor, never divides by zero.
- Done pressed twice quickly at the final row: stays complete, no cursor > N.
- Pass − on the final completed block: lands on row 1 of the last pass, not on a pass that doesn't exist.
- Chart section with an override/`before`/`after` keyed to a row number beyond the chart: ignored, not rendered.
- A section with zero steps (or only a rowless task list) contributes 0 rows and is "complete" only when all tasks ticked.

## File Structure

| File | Responsibility |
|---|---|
| `js/core/steps.js` (new, shipped) | Pure: step list, cursor ↔ position, Done/mark/pass rules, before/after visibility |
| `js/core/steps.selftest.js` (new, not shipped) | `stepsSelfTest()` |
| `js/core/steps.demo.selftest.js` (new, not shipped) | Pushes a demo pattern with every step kind, for browser verification before conversion |
| `js/core/player.js` (new, shipped) | Playlist, mini-player, player, full chart screen, browse state |
| `js/core/rows.js` | `patternRowsDone` / `sectionRowCount` / `sectionComplete` dispatch to `steps.js` for step sections |
| `js/core/storage.js` | `sc:`/`t:` persisted in `entryProg`; schema-4 migration (Task 9) |
| `js/cloud/sync.js` | `splitFields`/`joinFields` learn `sc:`/`t:`; upgrade-on-read; conflict labels (Task 9) |
| `js/patterns/*.js` | Converted to `notes` + `steps` (Task 8) |

## Data shape (decided here; spec left it open)

- Section: `{ id, name, desc, notes: string[], steps: Step[] }`, optional `rowless: true`, optional `chart` fields as today plus `chartSteps: { text, before, after }` keyed by chart row (`text` value may be a function `(row) => string`, as `pairedRow` is today).
- Step: `{ kind:'row'|'repeat'|'task', id, text?, before?: string, after?: string }`; repeat adds `times`, `rows: [{id, text, chartRow?, before?, after?}]`, optional `chart: <name>`. `before`/`after` are single strings.
- Generated chart step id: `<sectionId>#<row>` (e.g. `yoke-chart#11`).
- Cursor = rows completed in the section (`0…N`); stored as `entryProg['sc:'+sectionId]`; task done flags as `entryProg['t:'+taskId]`.

## Gates

- **Gate A (before Task 4) — resolved 2026-10-06:** layout follows the user's Google Stitch "Step detail view" mock (header with section + "Row N of M", row badge + repeat size + `before` chip, written part, "Viewing rows 8–14" bar with `after` checkpoint chip, chart window with the current row highlighted, legend strip, ‹ MARK COMPLETE › dock) — guidance, not binding. Wide charts bleed off-screen and scroll horizontally; no fit-to-width.
- **Gate B (before Task 8):** per-pattern classification of today's `note` entries into section notes / `before` / `after` / task — manual, needs the user's review per pattern.

---

### Task 1: Cursor model

**Files:**
- Create: `js/core/steps.js`, `js/core/steps.selftest.js`
- Modify: `index.html` (script tag before `js/core/app.js`), `sw.js` (ASSETS; bump cache N)

**Interfaces:**
- Produces:
  - `isStepSection(section) -> boolean` — true if `Array.isArray(section.steps)` or `section.chartSteps` or `section.rowless`.
  - `sectionSteps(section, pattern) -> Step[]` — authored `steps`, or one generated row step per chart row (overrides/before/after merged by row number, out-of-range keys ignored).
  - `stepRowCount(step) -> number` — row: 1; repeat: `times × rows.length` (0 if either is 0); task: 0.
  - `stepsRowCount(section, pattern) -> number`.
  - `locateCursor(section, pattern, cursor) -> {cursor, total, complete, stepIndex, step, pass, passes, rowInPass, rowId}` — `cursor` clamped to `0…total`; at `total`, `complete: true` and `stepIndex = steps.length`. For non-repeat steps `pass = passes = 1`, `rowInPass = 1`.
  - `cursorAtStep(section, pattern, stepIndex) -> number` — rows before that step.
  - `cursorAtRow(section, pattern, stepIndex, pass, rowInPass) -> number`.

- [ ] **Step 1: Write failing `stepsSelfTest()` cases** (same `check(name, actual, expected)` harness as `rowsSelfTest`), with hand-built fixtures: a 3-row written section; a repeat `times:4` × 2 rows between two rows; a 44-row chart section with `chartSteps.after[44]`; an empty repeat. Assertions:
  - `locateCursor` on the repeat fixture at cursor 1 → `{stepIndex:1, pass:1, rowInPass:1}`; at 2 → `{pass:1, rowInPass:2}`; at 3 → `{pass:2, rowInPass:1}`; at 9 → `stepIndex:2` (the trailing row).
  - cursor `-5` and `999` clamp to `0` and `total`; at `total` `complete === true`.
  - `cursorAtRow(…, 1, 2, 1) === 1 + 2` and round-trips through `locateCursor` for every cursor `0…total-1`.
  - empty repeat: `stepRowCount === 0`, never the located step.
  - chart fixture: `sectionSteps(...).length === 44`, step 44 has `after`, override for row 3 replaces recap text, `before[999]` ignored.
- [ ] **Step 2: Run** (load via console per `rows.selftest.js` header; call `stepsSelfTest()`) — expect FAIL, `steps.js` absent.
- [ ] **Step 3: Implement** the functions above. Single flat scan over steps; no per-call allocation beyond the step list (called per card on the home screen). Generated chart steps take text from `rowRecap()` unless overridden; to stay pure in tests, accept an optional `recap` function parameter on `sectionSteps` defaulting to the global.
- [ ] **Step 4: Run** `stepsSelfTest()` — expect all pass. Run `node scripts/check.mjs` — expect `ok`.
- [ ] **Step 5: Commit (when asked)** `steps.js`, `steps.selftest.js`, `index.html`, `sw.js`.

### Task 2: Actions — Done, Mark incomplete, Pass ±, callout visibility

**Files:** Modify `js/core/steps.js`, `js/core/steps.selftest.js`.

**Interfaces:**
- Consumes: Task 1 functions.
- Produces (all pure, return new values, never mutate):
  - `doneAt(section, pattern, cursor, viewedRow) -> {cursor, confirm: null | {from, to}}` — `viewedRow` is a 1-based section row. On the cursor row (`viewedRow === cursor+1`): `cursor+1`, no confirm. Ahead: `cursor = viewedRow`, `confirm = {from: cursor+1, to: viewedRow}` (UI shows "Mark rows 12–15 complete?"). Behind or at total: unchanged.
  - `markIncompleteAt(cursor, viewedRow) -> {cursor, confirm: null | {from, to}}` — only for `viewedRow <= cursor`; new cursor `viewedRow-1`; `confirm` when it un-completes more than one row.
  - `passPlus(section, pattern, cursor) -> number` — finish current pass: cursor → row 1 of next pass; on the last pass completes the block. No-op if the cursor isn't inside a repeat.
  - `passMinus(section, pattern, cursor) -> number` — at row 1 of pass P → row 1 of P−1; mid-pass → row 1 of the current pass; clamped at row 1 of pass 1.
  - `calloutsFor(step, loc) -> {before: string|null, after: string|null}` — standalone row: both; repeat block: `before` only on pass 1 row 1, `after` only once complete; row inside a repeat: that row's own `before`/`after` every pass.

- [ ] **Step 1: Write failing cases** with the Task 1 fixtures:
  - `doneAt(cursor 4, viewed 5)` → `{cursor:5, confirm:null}`; `viewed 8` → `{cursor:8, confirm:{from:5,to:8}}`; at `total` Done twice → still `total`.
  - `markIncompleteAt(10, 10)` → `{cursor:9, confirm:null}`; `(10, 6)` → `{cursor:5, confirm:{from:6,to:10}}`.
  - `passPlus` at pass 2 row 2 of the 4×2 repeat → row 1 of pass 3; at pass 4 → block complete; outside a repeat → unchanged.
  - `passMinus` at pass 2 row 1 → pass 1 row 1; at pass 2 row 2 → pass 2 row 1; at pass 1 → row 1 of pass 1.
  - Round-trip: for every cursor, `passMinus(passPlus(c))` lands on a pass boundary within the same block, never outside it.
  - `calloutsFor` table from the spec's "`before`/`after` placement" (6 assertions).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement.** Work in the single scalar "rows done" dimension, as `repeatPosFromRowsDone` does, so ± stays exactly symmetric.
- [ ] **Step 4: Run** — expect all pass; `node scripts/check.mjs` ok.
- [ ] **Step 5: Commit (when asked).**

### Task 3: Persistence, tally, tap budget

**Files:** Modify `js/core/storage.js`, `js/core/rows.js`, `js/core/app.js`; add cases to `steps.selftest.js`; create `js/core/steps.demo.selftest.js`.

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces:
  - `stepCursor(section) -> number` — reads `entryProg['sc:'+section.id]`, clamped.
  - `setStepCursor(section, n) -> void` — writes `entryProg`, `stampClock('sc:'+id)`, `save()`, `renderGlobalRows()`. Synchronous.
  - `taskDone(task) / toggleTask(task)` — `entryProg['t:'+id]`, clock stamped.
  - `rows.js`: `sectionRowCount`, `sectionRowsDone`, `sectionComplete` return step-model values when `isStepSection(section)`; `patternRowsDone` is unchanged and so counts both shapes.
  - `PATTERNS` demo entry `step-demo` with: written row + `before`/`after`, a 4×2 repeat, a 12-row chart section with `chartSteps`, a rowless section.

- [ ] **Step 1: Write failing cases:** `patternRowsDone(demoPattern, ctx)` = Σ cursors; a rowless section contributes 0; `sectionComplete` for a rowless section only when every task ticked; old-shape Peacock tally is **identical** before/after the change (snapshot compare against `patternRowsDone(PEACOCK, ctx)` on a fixed fixture ctx).
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement.** Keep `chartCurrentRow`/`cr:` untouched for old-shape sections. `splitFields` still drops `sc:`/`t:` — intentional until Task 9; step sections must not reach production before then.
- [ ] **Step 4: Tap-budget test** in the selftest: 100 × `setStepCursor(section, cursor+1)` on the demo project under 50 ms mean per tap (mirror the existing `changeChartRow` budget test if present in `sync.pushpull.selftest.js`, else `performance.now()` loop). Expect pass.
- [ ] **Step 5: Run** `stepsSelfTest()`, `rowsSelfTest()`, `syncSelfTest()` — all pass (regression); `node scripts/check.mjs` ok.
- [ ] **Step 6: Commit (when asked).**

---

### Task 4: Playlist, mini-player, player — written sections *(after Gate A)*

- **Create** `js/core/player.js`; **modify** `js/core/render.js` (`renderPhase` dispatches to `renderStepSection` when `isStepSection`), `index.html`, `sw.js`, CSS in `index.html`.
- **Interfaces:** `renderStepSection(section) -> html`; `viewedRow` (module-local, not persisted/synced); `openPlayer(rowOrStepIndex)`, `closePlayer()`, `backToCurrent()`, `browseStep(delta)`; `doneTap()` → `doneAt` + `setStepCursor` + confirm via `sheetConfirm` when needed; `markIncompleteTap(row)`.
- **Acceptance:** with the demo pattern in the browser: playlist shows done/current/upcoming; mini-player Done advances; ‹ › never change the Rows tally; "Viewing row X · on row Y — Back to current" chip appears iff viewed ≠ cursor; Done on a row ahead raises the confirm sheet; `before`/`after` render as unticked callouts. Verify via preview tools (read_page + screenshot, mobile viewport).

### Task 5: Chart window + full chart screen

- Chart window (5–7 rows, current centred, clamped at ends, whole if shorter) inside the player for rows with a chart; ⤢ opens the full chart screen — a separate view, not an overlay — hosting zoom, recenter, mid-row marker, yarn chips/palette editor, legend (move from `chart.js` unchanged).
- **Removes:** `body.chart-idle` / `UI_IDLE_DELAY` auto-hide and the chart-only fixed-dock layout for step sections. Grep for what's left first (spec says verify).
- **Acceptance:** full-width chart section of the demo pattern (generated steps, override, `after` on last row); tap a row in the full chart = browse only; Back returns to the player on the same row.

### Task 6: Repeat block + motif chart

- Repeat card shown whole in the player (never auto-collapsed; delete `repeatExpanded` in `state.js` and `app.js:179` toggle), "Pass N of T", pass −/+ wired to `passMinus`/`passPlus` on the card **and** on the mini-player, styled distinct from ‹ ›. Motif chart for `chart:` repeats with the current row highlighted in both chart and rows; row ticks reset each pass; tapping a motif row previews only.
- **Acceptance:** Done inside a repeat → next row, then row 1 of next pass, then next step; Pass + from mid-pass with no confirm; 100-tap budget on Done and pass ±.

### Task 7: Rowless sections

- Task list with checkboxes (`toggleTask`), notes card, `[← Back] [Finished! 🎉]`, no player/mini-player/Done.
- **Acceptance:** ticking toggles only that task; Rows tally unchanged; section complete only when all ticked.

### Task 8: Convert the 8 patterns *(after Gate B; ships with Task 9)*

- Per pattern file: `notes` → section `notes` / `before` / `after` / rowless task steps; chart sections gain `chartSteps` (`postChart` → `after` on last chart row, Peacock row 44 "Count to confirm 253 sts"); motif repeats gain `chartRow` refs (Hatsuki leaf). Notes defer to `glossaryEntry` as today. Delete `postChart`, `buildChartTracker`/`renderChartDock` as the section renderer, `chartCurrentRow` as a progress model, and the old `entryHtml` card path once nothing uses it.
- **Acceptance per pattern:** playlist, player for each step kind, full chart; row total equals the old `patternRowTotal` where the spec didn't intentionally change counts (record any differences in the PR).

### Task 9: Schema 4 migration + sync

- **Modify** `storage.js`, `state.js` (`structSignature`/`structHash`), `sync.js`.
- **Interfaces:** `migrateToStepCursors()` gated on `pt3_schema < 4`; per section cursor from old keys — `r:` done flags counted in order, `rp:{y,z}` → `y·R + z − 1`, `cr:` → `chartRowOf(...) − 1` (verify against `chartRowOf`'s standing-row semantics); tasks → `t:` flags. Old keys left in place. **Re-stamps `phash` + `pattern` against the new live pattern in the same step**, and converts (or renders via compatibility path) frozen snapshots in the old shape. `splitFields`/`joinFields` carry `sc:`/`t:` in `entries`; `upgradeLegacyRow` extended for v2 → v3 rows (upgrade on read, refuse only newer); conflict sheet labels cursor clashes ("Yoke: row 12 vs row 15").
- **Acceptance:** mid-progress projects from schema 3 on every pattern keep the header Rows tally unchanged; no project shows "Pattern updated · Review" after migration; `syncPushPullTest()` extended for the v3 upgrade-on-read and new keys, both pass; `patternSyncTest()` passes (sanitizer covers `before`/`after`/`notes`).

## Rulings (Tasks 1–3, executed 2026-10-06)

- Persistence helpers (`stepCursor`, `setStepCursor`, `taskDone`, `toggleTask`) live at the bottom of `steps.js`, not `storage.js` — they only touch `entryProg` + `stampClock`/`save`/`renderGlobalRows`, and this keeps them testable. Cost if wrong: a move.
- `sectionSteps` does not take a `recap` parameter; generated chart steps carry no text unless overridden and the renderer calls `rowRecap()` (it reads the active phase, which a pure function must not). Cost: none.
- `calloutsFor` returns `{before: string[], after: string[]}`, not single strings — a repeat's block-level callout and a row's own can apply together. Block `before` shows throughout pass 1; block `after` shows on the last row of the last pass (where the Done that finishes it confirms it).
- `passMinus` on a finished section whose last step is a repeat lands on row 1 of the last pass; `passMinus(passPlus(c))` is only asserted while `passPlus` stays inside the block.
- Tap-budget test stubs `save()`; it measures what the step model adds, not localStorage write cost (same cost the chart tap already pays).
- Tests were written after `steps.js` for Tasks 1–2 (they passed first run); Task 3's dispatch tests were run RED (6 failures) before `rows.js` changed.
- Selftests also run under node: `scratchpad/run-selftests.mjs` (vm harness, stubs `save`/`stampClock`/`renderGlobalRows`). The browser run gives the same counts.

## Task 4 — done 2026-10-06 (rulings)

- **Designs are the Stitch project "Stitch Ease Knitting Tracker"** (screens: Playlist, Player – Balanced, Player – Repeat, Player – Chart Focused, Finishing checklist). Task 4 follows Playlist + Player – Balanced (palette `#163b32` forest / `#f6f7f7` page, row cards with COMPLETED / CURRENT ROW badges, setup pill, count chip, ‹ Done Row N › dock). Tasks 5–7 must pull the Chart Focused, Repeat and Finishing screens (`list_screens` on project 16157756393532470927) before building — the HTML is downloadable.
- Gaps filled where the designs are silent: playlist dock centre "Next row" records the current row (same as Mark done); tapping a row opens the player; notes are a collapsed card ("view"); browse chip "Viewing row X · on row Y — Back to current"; player back = chevron at top; repeats are **flattened** to one list item per row with a "Pass p of T" note until Task 6 builds the design's repeat card; `before` renders as the design's Setup pill, `after` as its count chip.
- The app's own project header is kept (the design's top bar maps onto it); system font instead of Inter so the PWA stays offline-safe.
- `isStepSection` now requires every `steps` entry to have a `kind` — legacy `steps` arrays (old snapshots, `sync.js:610`) must stay on the old path.
- **Task 9 must also** teach `structSignature` about step sections (it reads `ph.entries` only, so step-shape edits would not change `phash`).
- Rowless checklist is a minimal placeholder; Task 7 restyles it from the Finishing design.

## Task 5 — done 2026-10-06 (rulings)

- Follows Stitch "Player – Chart Focused" (the screenshot you shared): compact written strip (`R11 (RS)` chip, read direction, `before` as a chip), "Viewing rows a–b" bar with the `after` checkpoint chip and a ⤢ button, chart window (current row ±3, clamped at the ends, faded by distance, row numbers both sides, stitch numbers on top), legend strip, ‹ Done row N › dock. Cells are the app's own `stitchCell()` (real symbols, yarn colours), not the design's text glyphs.
- Wide charts bleed off-screen and scroll sideways (per your note); the window opens at the end the row starts from (right for RS, left for WS).
- Full chart screen (⤢): whole chart, A− / A+ (the existing `cellSz` pref), "Current row" recentre, yarn chips + Colours button for colourwork, legend, tap a row = look only (class swap, no repaint), dock "Back to row N". **Not built: dragging the mid-row marker** — the window shows the ring + dot on the marker's cell when one is already set. Needs the old tracker's `midRowX`/drag code adapted; do it before Task 8 removes the old chart path.
- Removed Back / Next from the playlist foot (old-design carryover): section switching is the "Current section" menu, and the dock becomes "Next section" / "Finished!" once a section is done.
- A repeat's current row is not tappable (user: no need to click into it).
- **Tap budget:** playlist Done patches two rows + progress + dock in place: ~0.47 ms/tap (≈47 ms per 100, including `save()`), within 50 ms. Done from the player repaints the window: ~1.4 ms/tap (≈140 ms per 100) — imperceptible but over the literal budget; optimise by caching window rows if it matters.
- CLAUDE.md still describes `body.chart-idle` / `UI_IDLE_DELAY`; the code no longer has them (grep: nothing left), so nothing to remove — update CLAUDE.md in Task 8.

## Task 6 — done 2026-10-07 (rulings)

- Follows the Stitch "Player – Repeat" design: while a repeat block is being worked (or looked at) the playlist shows a **pass stepper** (− · "Repeat sequence · Pass 2 of 4" · +) and only that pass's rows, numbered within the pass (R1, R2…); the selected row is the usual full-width section with the motif chart. A repeat that is done or not reached is one quiet line ("Repeat · 2 rows × 4"); tapping it selects its first row.
- Pass −/+ call `passMinus`/`passPlus` on the cursor (progress actions, no confirm). The stepper shows the pass of the selected row, but the buttons always act on progress.
- **Motif chart:** a repeat may carry `motif` — a small grid of tokens — and its rows `chartRow` indices into it. The selected row's preview and the player's chart window draw it with the same renderers (`spChartWindowHtml(..., chart)`), without RS/WS or mid-row marker (those belong to the section chart).
- The player head for a repeat row reads "Row 2 of 2 · Pass 3 of 4".
- Task 7 (rowless) is effectively done: the checklist uses the same top bar and heading; the dedicated Finishing design was not pulled separately.
- `sw.js` cache bumped to v44. Dev hook: `?demo` in the URL registers the unshipped demo pattern (`index.html`, before `app.js`).

## Task 8 — done 2026-10-07 (rulings)

- **Converted at load, not re-authored by hand.** `js/core/convert.js` turns each pattern's `entries` into `notes` + `steps` (row / repeat entries copied untouched, so ids and row totals are identical) and attaches `before` / `after` / tasks by position and wording. Why: eight files, ~2,800 lines, a classification that needs a person's eye either way — the converter makes it reviewable and reversible, and `describeStepConversion()` prints every decision. The pattern files stay in the old shape until the review is signed off and the schema-4 migration lands (Task 9); then the converted output can be written back into them.
- **Opt-in, off by default:** `?steps=1` turns it on (stored in `pt3_stepmodel`), `?steps=0` off. Existing projects keep the old shape through their frozen snapshot and show "Pattern updated · Review" — do not adopt until Task 9 (their `r:`/`rp:` progress is not carried over yet).
- **Rules:** leading notes → section notes, except an instruction (cast on / switch / place / join …) directly before the first row → its `before`; an interior note → `after` the previous step if it states a count or measurement ("sts", "cm", "check", "count", "≈"), otherwise `before` the next; a trailing checkpoint → `after` the last step, other trailing prose → section notes; a notes-only section is rowless with the items as section notes; a rowless finishing / bind-off / sew section → one task per note; a chart section's confirm note → `after` the last chart row.
- **Left on the old renderer:** Where Are the Leaves' chart section (its `pairedRow` companion text has no step equivalent yet).
- **Known gaps:** a trailing "Bind off…" note in a section that also has rows lands in section notes (tasks only exist in rowless sections); Posy's `chartSegments` seam markers are not drawn in the new chart; `sc:` / `t:` progress still does not sync.
- Supporting changes: `structSignature` sees step sections (kinds, ids, repeat shape — never prose); home cards count a step section's rows and tasks; "reset section" clears the cursor and tasks.
- Review sheet: `docs/superpowers/plans/2026-10-07-step-conversion-review.md`.

## Task 9 — done 2026-10-07 (rulings)

- **Local migration (`migrateToStepCursors`, `pt3_schema` 4)** runs at bootstrap, only with the step model on. Per project it derives `sc:<section>` (rows done) and `t:<task>` from the old `r:` / `rp:` / `cr:` / `n:` keys (`cursorsFromLegacyProgress`, pure, in `steps.js`), gives each a clock = the newest clock of the keys it came from, and re-freezes the project on the new-shape pattern in the same step so there is no "Pattern updated" chip. Old keys are left in place.
- **A project whose saved structure had already diverged from the code** (its frozen snapshot is not today's pattern) is moved onto its own snapshot, converted — not the live pattern — so it keeps the chip and its ticks stay on their rows. "Unchanged" is decided against the OLD shape (`legacyPatternFor`, kept by `convert.js`), since the stored hash was computed on it.
- **The cursor can only say how many rows were done**, not which: ticks made out of order land as that many rows from the top. The header tally is identical before and after — tested on every pattern and size with ticks scattered through it.
- **Sync, schema v3** (`PROGRESS_SCHEMA` is 3 only with the step model on, so a device not on it writes and reads exactly what it did): `sc:` is a non-negative int and `t:` a bool in the `entries` bucket; `splitFields` / `joinFields` carry them. Older rows are upgraded on read and on push (`upgradeRow`: v1 → v2 as before, then v2 → v3 via `upgradeV2Row`); a row from a NEWER schema is refused with the existing banner. A v1 row is mapped through the project's OLD-shape pattern, and skipped if that cannot be established. A project whose pattern has no step sections (an imported one) has its row renumbered, not reported as a mismatch.
- **Conflicts:** two devices on different rows of one section now raise a conflict (accepted in the spec). The sheet reads "Yoke chart — On row 12 of 44 / On row 15 of 44" and "Finished (44 rows)"; tasks read Done / Not done.
- **Bug found by running it:** the migration first read `projects`, which is empty at bootstrap (the other migrations read `pt3_projects` themselves) — it "succeeded" having moved nothing. Fixed, and the older migrations now read patterns in their old shape (`legacyShape`) so a pre-entries project on a flagged device still seeds correctly.
- **Test status:** steps 81/81 (flag on and off); sync 34/34; pattern sync 35/35; push/pull 62/62 with the step model on (its pattern-version section exercises the old shape and is skipped — run it with `?steps=0`, 74/74); rows 63/64 (the same failure as before, a stale pattern list). End to end in the preview: a Peacock Tee project with progress made under `?steps=0`, reloaded with `?steps=1` — tally 17 = 17, step-shaped snapshot, no chip, new keys clocked, collar on "Pass 4 of 7".
- **Not done / for the release:** the flag is still opt-in. Making it the default is a one-line change in `stepModelOn()` — do it only together with the pattern files being rewritten from the review sheet, a CLAUDE.md pass, and a decision on the Supabase row version (older app versions will show the "update" banner for v3 rows). Turning the flag off again after migrating leaves projects on their step-shaped snapshot (they keep working and show the chip).

## Restyle reverted — 2026-10-08

On request, the visual restyling made after the first Stitch-faithful build was undone, keeping every behaviour: back to the deep forest green and cream/beige, bold type, filled pills and badges, the filled "Mark done" button, the selected row as a rounded card with a left highlight (the chart preview inside it, in a rounded box), the old header blocks (Current section / title / % / Details / Row progress; a back-arrow row and "Row N of M" in the player), the Stitch chart-row strip and the large-card player for other rows, and the app header back on every screen. Kept: the dock with the browse chip above it and "Next section", ‹ › across sections and scrolling to the viewed row, selecting a row by tapping it, the pass stepper, the grow animation, "Setup:" / "Check:" labels. Removed with it: the compact top bar, the quiet row head, the gray heading bar and the full-bleed section. A copy of the pre-revert `index.html` and `player.js` is in the session scratchpad (`restyle-backup/`). `sw.js` cache bumped to v45.

## Self-Review

- **Spec coverage:** section model (T1,8), progress/cursor + actions (T1–3), browse mode + chip (T4), screens 1–6 (T4–7), removals (T5,6,8), migration/sync risks 1–5 (T8,9), testing (T1–3, 9), sequencing (matches the spec's 1–7, with Gates A/B and the Task 8+9 co-ship added).
- **Gaps carried, not hidden:** player layout (Gate A), classification of notes (Gate B), tasks 4–9 are not step-level yet.
- **Types:** `locateCursor`, `doneAt`, `passPlus/Minus`, `calloutsFor` names are used identically across tasks.

# Step Screen v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the step screens (player, playlist, repeat state, top bar, dock, sheets) to the v2 requirements, on a design-token and component foundation, and restyle the rest of the app from the same tokens with no logic or layout change.

**Architecture:** Three layers. `css/tokens.css` holds every colour, size, radius, space and type value, plus a bridge that points the app's legacy variables (`--bg`, `--card`, `--accent`…) at the new tokens, which is what restyles the other screens. `js/core/ui.js` + `css/ui.css` hold generic, reusable components (icon button, caps label, toggle section, facts line, top bar, dock, card). `js/core/stepViews.js` + `css/step.css` compose them into the step screens; `js/core/player.js` keeps only view state and handlers. Progress logic in `steps.js` is not touched.

**Tech Stack:** Classic browser scripts (no modules, no build), plain CSS files, in-browser selftests run under node via a `vm` harness. No new dependencies.

**Spec:** `docs/step-screen-v2-requirements.md` (behaviour), `docs/design-direction.md` (tokens and components), `docs/prototypes/step-screen-v2.html` (reference rendering). Base behaviour: `docs/step-screen-requirements.md`.

## Global Constraints

- **No raw values outside `css/tokens.css`:** no hex colours, no px radii, no font names in `ui.css`, `step.css` or inline `style=""` in JS. Enforced by `scripts/check-tokens.mjs` (Task 1).
- **One sans-serif family** for all text: `var(--font-ui)`, system fallback. No serif anywhere, including the app's old Georgia headings.
- **One accent:** sage (`--c-sage`, `--c-sage-strong`, `--c-sage-wash`). No orange, coral or beige.
- **Radii:** 12 px cards, 8–12 px controls, 16 px sheet top corners. **Spacing** multiples of 4; 16 px gutter, 20 px card padding.
- **Copy:** dock button `Mark row N done` / `Mark row N not done` (repeat rows: `Mark R2 of pass 3 done`); confirm titles `Mark rows A–B done?` / `Mark rows A–B not done?`; Setup toggle `SETUP ▸` / `SETUP ▾`, collapsed by default; tally `3 / 24 rows`.
- **Layout:** card ≈ 1/3 and chart ≈ 2/3 of the area between top bar and dock; card grows with long text; a row with no chart hides the chart area and the card keeps its natural height; chart is full-bleed.
- **Unchanged rules:** looking never changes progress; pass −/+ do progress; no `await` or network on Done / pass ± (budget: 100 `spDone` taps under 50 ms); pattern text is raw HTML by convention, everything else escaped with `escapeHtml`; `body.chart-page` auto-hide stays scoped to the old chart screen; no script loads after `js/core/app.js`; `pt3_` keys untouched.
- **Do not** deploy, push or merge. Commit per task on branch `step-screen-v2`.

## Review Focus

- A row with no `sts` renders no count and no empty gap; a row with `sts` but no Check renders only the count (and the reverse).
- A very long instruction (≈400 chars) grows the card past a third without clipping, and the chart keeps its minimum height.
- A repeat with no motif chart hides the chart area; a repeat with a motif draws it.
- Count and Check text from a synced pattern doc cannot inject HTML (`escapeHtml`), while instruction text stays raw.
- The top bar copes with a 40-character section name (truncates, tally and icons stay on screen at 320 px width).
- Without Figtree available (offline, no font file) the screens still render in the system font with the same layout.
- Selecting a row far ahead, then pressing ‹ ›, keeps the selected row in view with one row above it, including at the first and last row.

---

## File Structure

| File | Responsibility |
|---|---|
| `css/tokens.css` (new) | Every design value; legacy-variable bridge |
| `css/ui.css` (new) | Styles for the generic components in `ui.js` |
| `css/step.css` (new) | Layout of the step screens only, built from tokens and `ui-*` classes |
| `js/core/ui.js` (new) | Generic component builders, pure `(props) → html string` |
| `js/core/stepViews.js` (new) | Step-screen markup builders (moved out of `player.js`, then reworked) |
| `js/core/player.js` | View state and handlers only; calls `stepViews.js` |
| `js/core/ui.selftest.js`, `js/core/stepViews.selftest.js` (new, not shipped) | `uiSelfTest()`, `stepViewsSelfTest()` |
| `scripts/check-tokens.mjs` (new) | Fails on raw colours, radii or font names outside `tokens.css` |
| `index.html`, `sw.js` | Link CSS, load scripts, bridge legacy `:root`, cache list and version |
| `CLAUDE.md` | Typography, colour variables and file map updated at the end |

Load order in `index.html`: `ui.js` after `render.js`, `stepViews.js` after `ui.js`, `player.js` after `stepViews.js`; all before `app.js`.

---

### Task 1: Tokens, bridge and token lint

**Files:**
- Create: `css/tokens.css`, `scripts/check-tokens.mjs`
- Modify: `index.html` (link `css/tokens.css` before the inline `<style>`; the inline `:root` legacy values become `var()` references), `sw.js` (ASSETS, bump `CACHE`)

**Interfaces:**
- Produces: CSS custom properties — colour `--c-bg #f4f4f2`, `--c-card #ffffff`, `--c-paper #f8f8f6`, `--c-line #e4e4e0`, `--c-text #25272a`, `--c-soft #62666b`, `--c-muted #92969b`, `--c-sage #587a67`, `--c-sage-strong #2f4a3c`, `--c-sage-wash #e4eee4`, `--c-cell #efefec`, `--c-scrim rgba(30,32,35,.38)`, `--c-blue #2f63d6`; radius `--r-card 12px`, `--r-control 10px`, `--r-sheet 16px`; space `--s-1 4px` … `--s-6 24px`; type `--font-ui`, `--fs-instruction 21px`, `--fs-title 16px`, `--fs-body 14px`, `--fs-meta 13px`, `--fs-caps 11px`, `--fw-regular 400`, `--fw-medium 500`, `--fw-bold 700`; sizes `--h-bar 56px`, `--h-btn 54px`, `--h-icon 36px`. Legacy bridge: `--bg: var(--c-bg)`, `--card: var(--c-card)`, `--border: var(--c-line)`, `--text: var(--c-text)`, `--muted: var(--c-muted)`, `--accent: var(--c-sage)`, `--accent-light: var(--c-sage-wash)`, `--ch-blue: var(--c-blue)`.
- Produces: `node scripts/check-tokens.mjs` → exit 0 and prints `tokens ok`, exit 1 listing `file:line value` otherwise.

- [ ] **Step 1: Write the failing lint.** `check-tokens.mjs` scans `css/ui.css`, `css/step.css` and `js/core/ui.js`, `js/core/stepViews.js` for hex colours, `rgb(`/`rgba(`, `border-radius:\s*\d`, and `font-family` values; fails if any. Add a fixture test inside the script's `--selftest` flag: a string with `#fff` fails, one with `var(--c-card)` passes.
- [ ] **Step 2: Run** `node scripts/check-tokens.mjs --selftest` — expect it to fail until the matcher is written, then pass.
- [ ] **Step 3: Create `css/tokens.css`** with the values above and the legacy bridge.
- [ ] **Step 4: Wire `index.html` and `sw.js`.** Replace the inline `:root` colour values for the bridged names with the bridge (delete the old literals), link the CSS, add `./css/tokens.css` to ASSETS, bump `CACHE`. Replace `Georgia` heading rules in the inline CSS with `font-family: var(--font-ui)` (restyle only: no selector, spacing or layout edits).
- [ ] **Step 5: Verify in the browser:** home screen, picker, glossary and account sheet load; computed `body` background is `rgb(244, 244, 242)`; no console errors. Run `node scripts/check-tokens.mjs` → `tokens ok`.
- [ ] **Step 6: Commit** `css/tokens.css scripts/check-tokens.mjs index.html sw.js`.

### Task 2: Generic UI components

**Files:**
- Create: `js/core/ui.js`, `css/ui.css`, `js/core/ui.selftest.js`
- Modify: `index.html`, `sw.js` (add the files)

**Interfaces:**
- Produces (all return an HTML string; `label`/`text` props are escaped with `escapeHtml` unless the prop is named `html`):
  - `uiIconButton({ icon: string, label: string, onclick: string, dot?: boolean }): string`
  - `uiCapsLabel(text: string): string`
  - `uiToggleSection({ label: string, open: boolean, onclick: string, html: string }): string`: the `SETUP ▸/▾` toggle, body shown only when `open`
  - `uiFacts({ count?: number|null, check?: string|null }): string`: empty string when both are absent; count is `<b>N</b> sts`; Check is `CHECK` label plus text with a left rule
  - `uiTopBar({ project: string, title: string, tally?: string, onBack: string, onTitle: string, actions?: string }): string`
  - `uiDock({ label: string, onclick: string, variant?: 'solid'|'outline', chip?: string }): string`: ‹ main ›
  - `uiCard({ cls?: string, html: string }): string`
- Consumes: `escapeHtml`, `SP_CHEV_L`/`SP_CHEV_R` (moved here from `player.js`, same names).

- [ ] **Step 1: Write failing `uiSelfTest()`** with `check(name, actual, expected)` cases: `uiFacts({})` → `''`; `uiFacts({count:90})` contains `<b>90</b> sts` and no `check`; `uiFacts({check:'Row <b>x'})` contains `Row &lt;b&gt;x`; `uiToggleSection({open:false,…})` omits the body and contains `▸`; `uiTopBar` with a 40-char title contains `class="ui-top-title"` and the tally text; `uiDock({variant:'outline'})` contains `ui-dock-main--outline`.
- [ ] **Step 2: Run** under the node vm harness (stub `escapeHtml`) — expect FAIL, `ui.js` absent.
- [ ] **Step 3: Implement** the builders in `ui.js` and the styles in `css/ui.css` (classes prefixed `ui-`; only `var(--…)` values). Icon-only buttons carry `aria-label`.
- [ ] **Step 4: Run** `uiSelfTest()` — all pass; `node scripts/check-tokens.mjs` → `tokens ok`.
- [ ] **Step 5: Commit** `ui.js ui.css ui.selftest.js index.html sw.js`.

### Task 3: Move step markup into `stepViews.js` (no behaviour change)

**Files:**
- Create: `js/core/stepViews.js`, `js/core/stepViews.selftest.js`
- Modify: `js/core/player.js`, `index.html`, `sw.js`

**Interfaces:**
- Produces: the existing markup functions, moved with identical signatures (`spRowHtml(row, cursor, total)`, `spListHtml`, `spRepeatHtml`, `spPlaylistHtml`, `spPlayerHtml`, `spFullChartHtml`, `spChartWindowHtml`, `spLegendHtml`, `spDockHtml`, `spTasksHtml`, `spSectionOverviewHtml`, `spNotesHtml`). View state (`spViewedRow`, `spPlayerOpen`, …) stays in `player.js` and is read as globals.

- [ ] **Step 1: Write a failing characterization test** `stepViewsSelfTest()`: with the demo pattern loaded, `spPlaylistHtml` for a 3-row written section contains three `data-row=` attributes and one `selected`; `spPlayerHtml` contains `Done row 1`. These capture today's output.
- [ ] **Step 2: Run** — FAIL (functions still in `player.js` only matters if the test loads `stepViews.js`; it must load it).
- [ ] **Step 3: Move** the markup functions verbatim; leave handlers, view state and `spRender` in `player.js`.
- [ ] **Step 4: Run** `stepViewsSelfTest()` and `stepsSelfTest()` — pass; open `?steps=1` and `?demo` in the browser and confirm the screens render exactly as before (unstyled).
- [ ] **Step 5: Commit.**

### Task 4: Top bar, dock and sheets

**Files:**
- Modify: `js/core/stepViews.js`, `js/core/player.js`, `css/step.css` (create)
- Test: `js/core/stepViews.selftest.js`

**Interfaces:**
- Consumes: `uiTopBar`, `uiDock`, `uiIconButton` (Task 2).
- Produces: `spTopBarHtml(p, cursor, total): string` (back to the library, project name small over section name with ⌄, tally `cursor / total rows`, PDF icon button via `spPdfButton`, ⋮) used by every step screen; `spDockHtml(label, doneCall, variant?)` now built on `uiDock`.

- [ ] **Step 1: Write failing tests:** `spTopBarHtml` contains `3 / 24 rows` and an `aria-label="Original pattern PDF"` button; the player dock label for a done row is exactly `Mark row 4 not done`, for the current row `Mark row 4 done`, for a repeat row `Mark R2 of pass 3 done`; the incomplete-confirm copy is `Mark rows 1–3 not done?`.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** `spTopBarHtml`; replace `spSectionOverviewHtml` and the old `sp-player-bar` in the playlist, player and rowless screens; the section name opens the existing `togglePhaseNav()` switcher sheet, which also shows the section notes; change the labels and the two `sheetConfirm` titles in `player.js` to the Global Constraints copy. Create `css/step.css` with the bar and dock styles from tokens.
- [ ] **Step 4: Run** tests and `check-tokens`; browser: bar is 56 px, dock shows the new labels, 100-tap `spDone` timing under 50 ms.
- [ ] **Step 5: Commit.**

### Task 5: Player card and chart region

**Files:**
- Modify: `js/core/stepViews.js`, `css/step.css`
- Test: `js/core/stepViews.selftest.js`

**Interfaces:**
- Produces: `spPlayerCardHtml(p, row, cursor, total): string` — caps label `ROW n OF total` plus RS/WS and reading direction on one line, Setup via `uiToggleSection` (collapsed by default, state `spSetupOpen` in `player.js`), the instruction, then `uiFacts({ count: spCount(row), check: co.after[0] })` pinned to the bottom; `spChartRegionHtml(p, row, chart): string` — full-bleed chart, one-line legend (`Knit` + first 3 stitches used + `+N`) and a glossary icon button calling `openGlossary()`.
- Consumes: `spCount(row): number|null` (Task 8; until then returns `null`), `SYMS` for symbols, `spChartWindowHtml`.

- [ ] **Step 1: Write failing tests:** card for a chart row contains `ROW 4 OF 24` once and the instruction once; Setup body absent by default, present after `spSetupOpen = true`; chartless row output contains no `ui-chart-region`; legend for a 6-stitch chart shows `+3`; the glossary button has `aria-label="Glossary"`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; `step.css`: `.sp-card { flex: 1 0 33% }`, `.sp-chart-region { flex: 1 1 67%; min-height: 205px }`, `.sp-card--nochart { flex: 0 0 auto }`, chart region `margin: 0 calc(-1 * var(--s-4))`. Remove the old strip/hero markup and the next-row preview.
- [ ] **Step 4: Run** tests; browser: Peacock Tee yoke row (chart) and a Hatsuki written row at 375 px; a 400-character instruction grows the card.
- [ ] **Step 5: Commit.**

### Task 6: Repeat state in the player

**Files:**
- Modify: `js/core/stepViews.js`, `css/step.css`
- Test: `js/core/stepViews.selftest.js`

**Interfaces:**
- Produces: `spRepeatCardHtml(block, cursor, total, sel): string` — `REPEAT` caps label, `Pass n of T`, − / + (`spPass(-1)` / `spPass(1)`, `aria-label`s as today), every row of the viewed pass as a tappable row (`spSelectRow(n)`), the selected row emphasised, per-row count via `spCount`, and an `End of pass n` line with `spPassEndCount(block, pass): number|null`.
- Consumes: the Task 5 chart region for a motif chart.

- [ ] **Step 1: Write failing tests:** a 4-row repeat renders four `data-row` items for the viewed pass only; stepper buttons call `spPass`; with counts present, the end-of-pass line shows the last row's count; without counts, no `End of pass` line and no count cells.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** and wire `spPlayerHtml` to use it when `row.step.kind === 'repeat'`; the selected-row emphasis is a left-aligned larger text, not a boxed treatment.
- [ ] **Step 4: Run** tests; browser: repeat in the demo pattern, pass +/− and row taps leave progress unchanged until Mark row done.
- [ ] **Step 5: Commit.**

### Task 7: Playlist restyle and focus

**Files:**
- Modify: `js/core/stepViews.js`, `js/core/player.js`, `css/step.css`
- Test: `js/core/stepViews.selftest.js`

**Interfaces:**
- Produces: `spRowHtml` selected state as a plain white card (caps label, instruction, 3-row chart preview, facts line pinned at the bottom, one quiet `Open row ›` button, **no Mark button**); done rows muted with `✓`, current row tagged `CURRENT ROW`; `spFocusSelected()` in `player.js` scrolls the selected row to just below the top with the previous row visible above it (smooth unless reduced motion), called from `spBrowse`, `spSelectRow` and after `spRender()` in playlist mode.
- Consumes: Task 4 top bar and dock; `uiFacts`.

- [ ] **Step 1: Write failing tests:** selected row HTML contains `Open row` and no `sp-done-btn`; done row contains `✓`; the playlist heading shows `INSTRUCTIONS` and `3 / 24 rows · 13%` for cursor 3 of 24.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**, keeping `spPatchPlaylist` working on the new row markup (two-row patch, same selectors: update `data-row` lookups only if the markup changes).
- [ ] **Step 4: Run** tests; browser: press › three times from row 4 — the new selected row sits near the top with the previous row above it; first and last row do not over-scroll.
- [ ] **Step 5: Commit.**

### Task 8: Stitch-count wiring (count hidden until data exists)

**Files:**
- Modify: `js/core/stepViews.js`
- Test: `js/core/stepViews.selftest.js`

**Interfaces:**
- Produces: `spCount(row): number|null` — returns `row.def.sts` when it is a finite number, or `row.def.sts[row.pass - 1]` when it is an array, else `null`; `spPassEndCount(block, pass): number|null` — the count of the pass's last row, `null` if absent.

- [ ] **Step 1: Write failing tests:** `sts: 41` → 41; `sts: [66, 68, 70]` on pass 2 → 68; missing, `'41'`, `NaN` → `null`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; document the optional `sts` field in `docs/step-screen-requirements.md` §7 (one paragraph). No pattern data is changed.
- [ ] **Step 4: Run** tests; confirm the card, repeat and playlist render no count anywhere for the demo pattern, and add `sts` to one demo row to see it appear in all three.
- [ ] **Step 5: Commit.**

### Task 9: Restyle the rest of the app (tokens only)

**Files:**
- Modify: `index.html` (inline CSS only), `css/ui.css`
- Test: `scripts/check-tokens.mjs`

- [ ] **Step 1:** List every hard-coded colour, radius and font name in the inline CSS of `index.html` with `grep -nE '#[0-9a-fA-F]{3,6}|border-radius|font-family' index.html`.
- [ ] **Step 2:** Replace them with `var()` tokens (adding tokens to `tokens.css` where none fit), for home, picker, glossary, account, conflict, pattern-update and import sheets, and the `openSheet` primitive. No selector, spacing, or markup change beyond values; no JS change.
- [ ] **Step 3: Verify:** each screen at 375 px next to a screenshot taken before the task; `node scripts/check-tokens.mjs --all` (extends the lint to `index.html`) → `tokens ok`.
- [ ] **Step 4: Commit.**

### Task 10: Docs and release hygiene

**Files:**
- Modify: `CLAUDE.md`, `sw.js`, `docs/design-direction.md`

- [ ] **Step 1:** Update `CLAUDE.md`: file structure (`css/`, `ui.js`, `stepViews.js`), typography (sans-serif only; remove the Georgia line), key CSS variables, and "Don't use raw colours outside `tokens.css`".
- [ ] **Step 2:** Bump `CACHE` in `sw.js` once more; confirm every new file is in `ASSETS`.
- [ ] **Step 3: Run** all selftests (`stepsSelfTest`, `rowsSelfTest`, `syncSelfTest`, `uiSelfTest`, `stepViewsSelfTest`) and `check-tokens`; all pass.
- [ ] **Step 4: Commit.** Do not push or open a PR until asked.

---

## Open items carried from the spec

- **Figtree file:** the design uses Figtree; the app is offline-first, so the font would need to be vendored (`fonts/`). Until you decide, `--font-ui` falls back to the system font.
- **`scripts/check.mjs` and CI** live only on the archive branch; `check-tokens.mjs` here is standalone.
- **Counts data, markers, library/glossary layout changes, and the full-chart screen** are out of scope.

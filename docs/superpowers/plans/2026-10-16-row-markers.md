# Row markers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A knitter can put a lifeline or note marker (plus optional short text) on any row of a step section, see it in the playlist and player, and have it sync across their devices.

**Architecture:** A marker is one more synced field in a project's `entryProg`, key `mk:<sectionId>:<n>`, value `{t, x}`, with its own clock, so the existing per-field three-way merge handles it. A new pure module `js/core/markers.js` owns the key, the value rules and the read/write helpers. `stepViews.js` renders the badge, strip and icon button; `player.js` owns the bottom sheet. `PROGRESS_SCHEMA` goes 3 → 4 so a device without this code shows the "reload" banner instead of erasing markers.

**Tech Stack:** Vanilla JS classic scripts (global scope, inline `onclick` handlers), localStorage, Supabase `entries` jsonb (no SQL migration), tokens-only CSS.

**Spec:** `docs/superpowers/specs/2026-10-16-row-markers-design.md`

## Global Constraints

- Classic scripts, not modules. `js/core/app.js` stays the last script; new script tags go after `js/core/steps.js`.
- Row numbers `n` are the flattened row numbers from `spRows` (each repeat pass has its own `n`). Handlers take row numbers, never ids or text.
- Marker value `{ t: 'lifeline' | 'note' | '', x: string }`; `t: ''` is the tombstone for "removed". Note text trimmed and capped at 120 characters (`MARKER_TEXT_MAX`).
- Marker text is stored raw and escaped at render with `escapeHtml`. It can arrive from another device.
- Tokens only in CSS (`node scripts/check-tokens.mjs --all` must pass). Sage is the only accent. No orange, coral or beige.
- Do not touch the dock. "Open row ›" stays the only text button on a row card.
- No `await`, network call or pattern-doc `JSON.stringify` on any render path or on `changeChartRow`.
- Use `openSheet` / `sheetBodyHtml` / `btnHtml`, never `prompt()` or `confirm()`.
- Do not commit, push or open a PR until the user asks. Tasks end in verification, not a commit.
- Bump `CACHE` in `sw.js` from `stitch-ease-v86` to `stitch-ease-v87` and add new shipped files to `ASSETS`.
- Self-tests (`*.selftest.js`) are not shipped: absent from `index.html` and `sw.js`.

## Review Focus

- Two different markers must not look "equal" in the merge: `sameFieldValue` today compares only `.y`/`.z`, so `{t:'note',x:'a'}` vs `{t:'lifeline',x:'b'}` would silently agree and a real conflict would vanish. Pinned in Task 2.
- A removed marker stays removed on the other device (tombstone survives push, pull and reload; it is never resurrected by absence). Pinned in Task 2.
- A hostile or malformed remote marker (unknown type, non-string text, script in text) is neutralised: unknown type becomes a tombstone, text is clamped and rendered escaped. Pinned in Tasks 1 and 3.
- A device on schema 3 meets a schema 4 row (and the reverse): the new build upgrades a v3 row without losing entries; the old build never merges a v4 row. Pinned in Task 2.
- Empty and edge notes: whitespace-only text saves as a marker with no text, a 200-character note is cut to 120, and a marker whose row number no longer exists (pattern changed) is ignored, not a crash. Pinned in Tasks 1 and 3.

---

### Task 1: Marker model (`js/core/markers.js`)

**Files:**
- Create: `js/core/markers.js`
- Create: `js/core/markers.selftest.js`
- Modify: `index.html` (script tag after `js/core/steps.js`)
- Modify: `sw.js` (add `js/core/markers.js` to `ASSETS`, bump `CACHE` to `stitch-ease-v87`)

**Interfaces:**
- Produces:
  - `const MARKER_TEXT_MAX = 120`
  - `markerKey(sectionId: string, n: number) -> string` (`'mk:' + sectionId + ':' + n`)
  - `normalizeMarker(v: any) -> {t: 'lifeline'|'note'|'', x: string}` (never throws; unknown type or non-object gives `{t:'', x:''}`; `x` coerced to string, trimmed, clamped; a tombstone's `x` is `''`)
  - `markerAt(section, n: number) -> {t, x} | null` (null when absent, tombstoned, or `n` outside `1..stepsRowCount(section, activeDoc)`)
  - `setMarker(section, n: number, type: 'lifeline'|'note', text: string) -> boolean` (false for a bad type or out-of-range `n`; otherwise writes `entryProg`, `stampClock(key)`, `save()`)
  - `clearMarker(section, n: number) -> void` (writes the tombstone, stamps, saves; no-op when no marker exists)
  - `blockMarker(rows: Array) -> {t, x} | null` (first marker in a block of flattened rows, a lifeline preferred over a note; used by the collapsed repeat line)
- Consumes: `entryProg`, `stampClock`, `save`, `stepsRowCount`, `activeDoc` (existing globals).

- [ ] **Step 1: Write the failing self-test** in `js/core/markers.selftest.js`, shaped like `stepViews.selftest.js` (`markersSelfTest()` returning `{passed, failed, failures}`; it creates a `step-demo` project, snapshots and restores every `pt3_*` key). Assertions:
  - `normalizeMarker({t:'lifeline', x:'  in at 253  '})` equals `{t:'lifeline', x:'in at 253'}`
  - `normalizeMarker({t:'banana', x:'y'})` equals `{t:'', x:''}`; `normalizeMarker(null)` and `normalizeMarker('<img>')` equal `{t:'', x:''}`
  - `normalizeMarker({t:'note', x:'a'.repeat(200)}).x.length === 120`; `normalizeMarker({t:'note', x:42}).x === '42'`; `normalizeMarker({t:'note', x:'   '}).x === ''`
  - `setMarker(p, 2, 'lifeline', 'in at 253')` returns true and `markerAt(p, 2)` equals `{t:'lifeline', x:'in at 253'}`; `clocks[markerKey(p.id, 2)]` is set
  - `setMarker(p, 2, 'banana', '')` and `setMarker(p, 99, 'note', '')` return false
  - after `clearMarker(p, 2)`: `markerAt(p, 2) === null` and `entryProg[markerKey(p.id, 2)]` equals `{t:'', x:''}` (key still present)
  - `markerAt(p, 99) === null` even when `entryProg` holds `mk:<id>:99`
  - `blockMarker` on rows where row 1 is a note and row 2 a lifeline returns the lifeline

- [ ] **Step 2: Run it to see it fail.** Load `js/core/steps.demo.selftest.js`, `js/core/markers.js`'s absence makes `markersSelfTest` fail. Run from the preview console: `markersSelfTest()`. Expected: ReferenceError / failures.

- [ ] **Step 3: Implement `js/core/markers.js`** with the signatures above. `setMarker` trims and clamps through `normalizeMarker`; a stored marker is always the normalised value. Add the file to `index.html` and `sw.js` as listed above.

- [ ] **Step 4: Run `markersSelfTest()` again.** Expected: `failed: 0`.

---

### Task 2: Sync (fields, merge equality, conflict label, schema 4)

**Files:**
- Modify: `js/cloud/sync.js` (`splitFields` ~L205, `joinFields` ~L232, `sameFieldValue` ~L1552, `conflictLabel` ~L880, `PROGRESS_SCHEMA` ~L939, `upgradeRow` ~L1067)
- Modify: `js/cloud/sync.selftest.js`
- Modify: `js/cloud/sync.pushpull.selftest.js`

**Interfaces:**
- Consumes: `normalizeMarker`, `markerKey` from Task 1.
- Produces: `mk:` keys cross the wire inside `entries`; `PROGRESS_SCHEMA === 4`; `upgradeRow` turns a v3 row into a v4 row with entries untouched.

- [ ] **Step 1: Write the failing tests.**
  - In `sync.selftest.js`:
    - `splitFields({'mk:s1:2': {t:'lifeline', x:'hi'}, 'mk:s1:3': {t:'banana', x:'z'}}).entries` equals `{'mk:s1:2': {t:'lifeline', x:'hi'}, 'mk:s1:3': {t:'', x:''}}`
    - `joinFields({entries: {'mk:s1:2': {t:'note', x:'a'}}, chart_rows: {}, cur: 0}).values['mk:s1:2']` equals `{t:'note', x:'a'}` (not `true`)
    - `sameFieldValue({t:'note', x:'a'}, {t:'lifeline', x:'b'})` is false; `sameFieldValue({t:'note', x:'a'}, {t:'note', x:'a'})` is true; `sameFieldValue({y:1, z:1}, {y:1, z:1})` still true; `sameFieldValue({t:'', x:''}, {t:'', x:''})` is true
    - `diffProgress` with local `mk:s1:2` = note edited at t1 and remote `mk:s1:2` = lifeline edited at t1 (base at t0) reports a conflict; with different keys (`mk:s1:2` local, `mk:s1:9` remote) keeps both and reports no conflict; a remote tombstone newer than an unchanged local marker produces the tombstone locally
  - In `sync.pushpull.selftest.js`: `upgradeRow({project_id, entries: {'sc:s1': 3, 'mk:s1:2': {t:'note', x:'a'}}, clocks: {...}, schema_ver: 3, ...})` returns `schema_ver === 4` with the same `entries`; a row with `schema_ver: PROGRESS_SCHEMA + 1` is still dropped by the push guard (existing test at ~L714 must keep passing).
  - `conflictLabel({k: 'mk:s1:2', p: <project id>}).field` starts with `Marker`, and `.fmt({t:'lifeline', x:'in at 253'})` equals `Lifeline: in at 253`; `.fmt({t:'', x:''})` equals `No marker`.

- [ ] **Step 2: Run both self-tests** (`syncSelfTest()`, `syncPushPullTest()`). Expected: the new cases fail.

- [ ] **Step 3: Implement.**
  - `splitFields` / `joinFields`: an `mk:` branch that stores `normalizeMarker(v)` in `entries`. Put it before the `n:`/`r:` branches (the existing order note about `rp:` before `r:` still holds).
  - `sameFieldValue`: when both are objects and either has a `t` property, compare `t` and `x`; keep the existing `y`/`z` comparison for repeat positions.
  - `conflictLabel`: an `mk:` branch (after the `sc:` branch) returning `{ field: 'Marker · row N', fmt }` where `N` is parsed from the key's last segment, and `fmt` says `Lifeline` / `Note` followed by `: <text>` when there is text, or `No marker` for a tombstone. The text goes through `plainText`.
  - `PROGRESS_SCHEMA`: `stepModelOn() ? 4 : 2`; update the comment above it (v4 = markers).
  - `upgradeRow`: run `upgradeV2Row` only when `v < 3`; for a v3 row return `Object.assign({}, row, { schema_ver: PROGRESS_SCHEMA })`.

- [ ] **Step 4: Run both self-tests again.** Expected: all pass, including the pre-existing cases.

---

### Task 3: Markers on screen (badge, strip, icon button, CSS)

**Files:**
- Modify: `js/core/stepViews.js` (`spRowHtml`, `spRepeatHtml`, `spRepeatCardHtml`, `spPlayerCardHtml`; new builders at the top)
- Modify: `css/step.css`
- Modify: `js/core/stepViews.selftest.js`

**Interfaces:**
- Consumes: `markerAt`, `blockMarker` (Task 1); `uiIconButton`, `escapeHtml` (existing).
- Produces (all pure, return HTML strings):
  - `spMarkerBadgeHtml(m: {t, x}) -> string` (lifeline: sage-filled `.mk-badge.mk-badge--lifeline`; note: outlined `.mk-badge`; label text "Lifeline" / "Note")
  - `spMarkerStripHtml(row, m: {t, x} | null) -> string` (empty string when `m` is null; otherwise a `.mk-strip` with the badge and the escaped note text, clickable with `onclick="spOpenMarkerSheet(${row.n})"`)
  - `spMarkerButtonHtml(row, m: {t, x} | null) -> string` (a `uiIconButton` with a flag icon, `onclick="spOpenMarkerSheet(${row.n})"`; aria-label "Mark row" or "Edit marker"; wrapper class `mk-btn mk-btn--on` when `m` is set, `mk-btn` otherwise)
- Placement:
  - Plain playlist line: `spMarkerBadgeHtml` right before the count; the badge has no handler (a tap selects the row).
  - Selected card: `spMarkerButtonHtml` inside `.sp-card-top-r`; `spMarkerStripHtml` directly under the instruction text.
  - Repeat card (list and player): button in the pass line, strip under `.sp-rlist`, both for the selected row `v`.
  - Collapsed repeat line: one badge from `blockMarker(block)`.
  - Player: the same button and strip in `spPlayerCardHtml` (button in the card's top right).
  - `spCardTap` already ignores taps on buttons; the strip needs `event.stopPropagation()` handling the same way, so tapping it opens the sheet and not the player.

- [ ] **Step 1: Write the failing tests** in `stepViews.selftest.js` (using the `step-demo` project, row 2 marked via `setMarker`):
  - Playlist HTML for a non-selected marked row contains `mk-badge--lifeline` and no `spOpenMarkerSheet`; for the selected marked row it contains `aria-label="Edit marker"`, `mk-strip` and the note text.
  - A selected unmarked row contains `aria-label="Mark row"` and no `mk-strip`.
  - `spPlayerHtml` for a marked row contains `mk-strip` and `aria-label="Edit marker"`; the dock markup is byte-identical to the same row unmarked.
  - A note of `<img src=x onerror=alert(1)>` renders as `&lt;img` and never as `<img src=x` anywhere in the strip.
  - A marker saved on row 99 (out of range) does not change any markup and does not throw.
  - A repeat block with a marker on one pass row: the collapsed line contains exactly one `mk-badge`.

- [ ] **Step 2: Run `stepViewsSelfTest()`.** Expected: the new cases fail.

- [ ] **Step 3: Implement** the three builders and the placements above. Flag and line icons are small inline SVG constants next to the existing `UI_CHEV_*` constants in `js/core/ui.js` (`UI_FLAG`, `UI_LINE`), stroke `currentColor`. CSS in `css/step.css`, tokens only: `.mk-badge` (pill, `--c-line` outline), `.mk-badge--lifeline` (`--c-sage` fill, white text via the existing on-sage token), `.mk-strip` (`--c-sage-wash` background, `--r-small`), `.mk-btn` (round icon button, `--c-muted`), `.mk-btn--on` (`--c-sage-wash` background, `--c-sage-strong` icon). Add whichever size tokens are missing to `css/tokens.css` rather than raw values.

- [ ] **Step 4: Run `stepViewsSelfTest()`, then `node scripts/check-tokens.mjs --all`.** Expected: no failures, no raw colours or radii.

---

### Task 4: Mark row sheet (`js/core/player.js`)

**Files:**
- Modify: `js/core/player.js`
- Modify: `js/core/stepViews.selftest.js` (sheet markup tests)

**Interfaces:**
- Consumes: `markerAt`, `setMarker`, `clearMarker` (Task 1); `openSheet`, `closeSheet`, `sheetBodyHtml`, `btnHtml` (existing); `spRender` (existing, repaints the step screen).
- Produces (global inline-onclick handlers, all take a row number or a type string):
  - `spOpenMarkerSheet(n: number) -> void` (opens `openSheet('Mark row ' + n, …)`; no-op when `n` is outside the section)
  - `spMarkerPick(type: 'lifeline'|'note') -> void` (switches the two choices in place, `aria-pressed`; no re-render)
  - `spSaveMarker(n: number) -> void` (reads the choice and `#mk-note`; `setMarker`, `closeSheet()`, `spRender()`)
  - `spRemoveMarker(n: number) -> void` (`clearMarker`, `closeSheet()`, `spRender()`)
  - `spMarkerSheetHtml(n: number, m: {t, x} | null) -> string` (pure, for testing: two choices with the current one pressed, a text input `id="mk-note"` with `maxlength="120"` and placeholder `Add a note, e.g. lifeline in at 253 sts`, Save, and Remove marker only when `m` is set)

- [ ] **Step 1: Write the failing tests.**
  - `spMarkerSheetHtml(2, null)`: contains `Save`, both choices, `maxlength="120"`, and does not contain `Remove marker`; Lifeline is pressed by default.
  - `spMarkerSheetHtml(2, {t:'note', x:'a <b>'})`: Note is pressed, `Remove marker` present, the text appears escaped (`a &lt;b&gt;`).
  - Through the real handlers on the demo project: open the sheet for row 2, pick Note, set `#mk-note` to `'  '`, call `spSaveMarker(2)`: `markerAt(p, 2)` equals `{t:'note', x:''}` and the playlist now shows the badge. `spRemoveMarker(2)` then makes `markerAt(p, 2)` null and the cursor (`stepCursor(p)`) is unchanged by both calls.
  - `spOpenMarkerSheet(99)` does nothing and does not throw.

- [ ] **Step 2: Run `stepViewsSelfTest()`.** Expected: the new cases fail.

- [ ] **Step 3: Implement** the four handlers and the sheet builder in `player.js` (the sheet builder may live in `stepViews.js` with the other markup builders, keeping handlers in `player.js`, matching the file split described at the top of both files). The default choice for a new marker is Lifeline.

- [ ] **Step 4: Run `stepViewsSelfTest()`.** Expected: all pass.

---

### Task 5: Whole-feature verification

**Files:** none new.

- [ ] **Step 1: Run the static checks:** `node scripts/check.mjs` and `node scripts/check-tokens.mjs --all`. Expected: both pass (check.mjs also confirms no self-test is loaded by `index.html` and the new script is linked and in `ASSETS`).

- [ ] **Step 2: Run every self-test** from the preview console (load each on demand): `markersSelfTest()`, `stepViewsSelfTest()`, `syncSelfTest()`, `syncPushPullTest()`, plus the existing step-model self-test. Expected: zero failures; the push/pull test snapshots and restores all `pt3_*` keys so it is safe on a device with real progress.

- [ ] **Step 3: Walk it in the browser preview** with a step-model project: mark a done row as Lifeline with a note, mark the current row as Note, open the player, edit then remove a marker, reload and confirm markers persist, and confirm a repeat block shows one badge when collapsed. Screenshot the playlist (marked and unmarked card) and the sheet. Check the console for errors.

- [ ] **Step 4: Two-device sync check** (needs the user's signed-in test account, so ask before doing it): mark different rows on two browser profiles, confirm both survive; edit the same row on both while offline, confirm the conflict sheet reads "Marker · row N" with both versions; remove on one, confirm it disappears on the other. Report anything not run.

- [ ] **Step 5: Report** what was verified and what was not. Do not commit, push or open a PR until the user asks.

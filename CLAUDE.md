# Peacock Tee Tracker — Project Handoff

## What this is
A single-page PWA knitting **pattern library**, built for mobile use while knitting. It opens on a home/library screen listing patterns; tapping one opens the step-by-step tracker for that pattern. The Peacock Tee (Size S, 97 cm) is the first built-in pattern. Deployed at: **https://tamaradidproduct.github.io/stitch_ease/**

## File structure
```
peacock-tee-deploy/
  index.html                    ← shell + all CSS + the <script src> list
  js/vendor/supabase.js         ← vendored supabase-js UMD (pinned, works offline)
  js/core/state.js              ← globals, PATTERNS, applyPattern, activateProject
  js/patterns/*.js              ← one file per pattern; each PATTERNS.push()es itself
  js/core/storage.js            ← pkey/save/load*/migrations/projects registry
  js/core/chart.js              ← chart tracker, zoom, scroll, changeChartRow
  js/core/render.js             ← render*/stepHtml/openSheet/escapeHtml
  js/cloud/auth.js              ← Supabase client, session, account sheet, claim flow
  js/cloud/sync.js              ← clocks, outbox, push, pull, three-way merge
  js/core/app.js                ← nav, SW registration, bootstrap  ← MUST BE LAST
  js/cloud/*.selftest.js        ← NOT shipped: absent from index.html and sw.js
  sw.js                         ← service worker (network-first HTML + /js/**)
  manifest.json / icon-*.png    ← PWA manifest and icons
  supabase/migrations/*.sql     ← record of the applied schema (no CLI in this project)
  docs/                         ← runbooks and design notes
  CLAUDE.md                     ← this file
```

**Classic scripts, not modules.** They share global scope, which is what lets the
inline `onclick` handlers in generated HTML keep working with no `window.*`
plumbing. Load order matters only for top-level *executed* code — the pattern
data and the bootstrap. Function declarations can live anywhere.

## Deployment
- Hosted on **GitHub Pages** at https://tamaradidproduct.github.io/stitch_ease/, deploying from the `main` branch.
- **Auto-deploys on every push to `main`** — GitHub Pages rebuilds the site instantly when the branch updates. **Merging a PR into `main` is the deploy action** — nothing further to run.
- **Only merge when the user explicitly asks** — make and verify changes locally, commit, push, and open a PR; hold the merge until requested.
- Service worker cache is named `stitch-ease-vN` — bump N in `sw.js` when deploying a change so clients refresh. HTML is served **network-first** (see SW section), so page updates land on next load without a manual cache bump; bump N mainly for the cached static assets.

## How the app works

### Patterns vs. projects
- **Pattern** = a reusable template (registry entry). **Project** = an instance of a pattern with its own progress. You can have several projects from the same pattern (e.g. two Peacock Tees).
- `PATTERNS` is the template registry; `projects` (persisted as `pt3_projects`) is the user's list of `{ id, patternId, name, created }`.

### Views & routing
Global `view` is `'home'`, `'picker'`, or `'project'`. `render()` dispatches:
- `renderHome()` — the home screen: one card per **project** (name, pattern meta, progress via `projectProgress(proj)`), plus a **＋ New project** button and an empty state.
- `renderPicker()` — pick a pattern to start a new project from.
- `renderProject()` — the tracker for the active project.

Navigation: `openProject(id)` → `'project'`; `goHome()` → `'home'` (back chevron); `startNewProject()` → `'picker'`; `choosePattern(patternId)` creates a project and opens it. `createProject` auto-names ("Peacock Tee", then "Peacock Tee 2"…); `renameProject` (prompt; also tap the project title in the header) and `deleteProject` (confirm; removes its `pt3_proj_<id>_*` keys) manage the list. `renderHeader()` builds the header per view and only rebuilds when the view/project changes (call `resetHeaderKey()` to force a rebuild, e.g. after a rename).

### Pattern registry
`PATTERNS` is an array of pattern objects: `{ id, name, badge, desc, phases, chart }`. The Peacock Tee is `PATTERNS[0]`. To add a pattern, append another entry with its own `phases` (and `chart` array if it has a chart).

`activateProject(id)` looks up the project, then `applyPattern(pattern)` swaps the **active-pattern pointers** — `PHASES`, `CHART_B`, `CHART_TOTAL`, `TOTAL_STEPS` are `let` globals reassigned to the project's pattern, so the rest of the rendering code is pattern-agnostic. It then loads that project's saved progress.

### Phases & steps
Each pattern's `phases` array holds phases in order (Peacock Tee: Materials → Collar → Short rows → Yoke chart → Raglan → Body → Sleeves). A step is `{ id, text, ... }` with optional fields:
- `rows: true` + `target` + `lbl` — shows a row counter.
- `cadence: N` + `cadenceOn` / `cadenceOff` — for "every Nth round" steps: counts the round you're on (1-based, no round 0) and shows a highlighted reminder on rounds where `round % N === 0`, muted otherwise (see `cadenceHintHtml`).
- `bullets: [...]` — renders a bulleted list under the step text.
- `postChart: true` — on a `hasChart` phase, folds the step into the chart card (the "Count to confirm 253 sts" confirm step).

### State & persistence (per project)
Progress is **namespaced per project**. Keys:
- `pt3_projects` — the registry: `[{ id, patternId, name, created, updatedAt, deletedAt? }]`. `deletedAt` marks a **tombstone** — the record stays, only the progress keys are purged (see `deleteProject`). A hard delete cannot survive sync: absence means "never seen", so the other device would helpfully re-create it.
- `pt3_proj_<projectId>_state` — `{stepId: boolean}` completed steps
- `pt3_proj_<projectId>_ctrs` — `{stepId: number}` row counters
- `pt3_proj_<projectId>_cur` — current phase index
- `pt3_proj_<projectId>_chartRows` — `{phaseId: row}`, one per chart phase
- `pt3_proj_<projectId>_chartRow` — LEGACY single chart row, still read when `chartRows` is absent
- `pt3_proj_<projectId>_grows` — global row tally (see below)
- `pt3_proj_<projectId>_clk` — `{fieldKey: epoch_ms}` when this device last changed each field
- `pt3_proj_<projectId>_base` — the same map as of the last successful sync. **Never uploaded** — each device's baseline legitimately differs, and that difference is what makes the merge three-way.
- `pt3_proj_<projectId>_phash` — the pattern structure hash the project was started on
- `pt3_proj_<projectId>_pattern` — frozen copy of the pattern as it was then (~15KB); the only record of it once the code moves on
- `pt3_cellSz` — chart cell-size pref (10–32px, default 16) — **global**
- `pt3_schema` / `pt3_outbox` / `pt3_last_sync` / `pt3_sync_cursor` / `pt3_conflicts` / `pt3_owner` / `pt3_claim_declined` / `pt3_sb_auth` — **global**, see the Cloud sync section

`save()` writes the active project's keys (via `pkey(suffix)` → `pt3_proj_<id>_*`); `loadProjectState()` reads them; `loadGlobal()` loads shared prefs. Three one-time migrations run on startup, in order: `migrateLegacy()` folds the original single-pattern keys (`pt3_state`, …) into `pt3_peacock-tee_*`; `migrateToProjects()` turns any pattern-namespaced progress into a first project and writes `pt3_projects`; `migrateAddClocks()` backfills `clk`/`base` for every existing project; `migrateAddPatternHash()` backfills `phash`/`pattern`. Each has its **own** sentinel — `migrateAddClocks` gates on `pt3_schema`, **not** on `pt3_projects`, which `migrateToProjects` already claims. **Keep the `pt3_` prefix and all four migrations** — removing them breaks saved progress. `pt3_schema` is a version *number* (`SCHEMA_VERSION`), not a boolean — later migrations compare against it rather than adding a key each.

### Cloud sync (Supabase)
localStorage stays the source of truth; the cloud is a background replica. **No sign-in wall** — signed out, `flush()` and `pull()` no-op and the app is exactly what it was before any of this existed. Same if `js/vendor/supabase.js` fails to load (`cloudState() === 'unavailable'`).

- **Clock per field, not per blob.** Keys are `s:<stepId>`, `c:<stepId>`, `cur`, `cr:<phaseId>`, `global_rows`. Ticking steps on the phone while the iPad sits on a chart row touches disjoint keys, so both survive with nothing to ask about.
- **Three-way merge** (`diffProgress`) against `base`. Without a baseline you cannot tell "the other side is stale" from "the other side diverged".
- **Conflicts** — both devices changed one field differently. The merge keeps THIS device's value (it's what's on screen) with a **fresh clock** so it settles rather than ping-pongs, records the other device's value in `pt3_conflicts`, and raises a persistent amber banner. Tapping it opens the conflict sheet: one row per clash, labelled from the pattern, with both values side by side. Storing the other value is what makes the choice reversible — without it "use the other one" has nothing to restore. **Dismissing is an answer** (keep this device), not a deferral.
- **Push is read-merge-write**, guarded by the row's `server_rev`. A plain whole-row upsert silently erases whatever the other device pushed and reports no conflict — this is the single most important invariant in the sync code.
- **`base` advances only for fields the server already agrees with** (`agreedBase`). Advancing it further marks a local edit as synced and it is never pushed at all.
- **Sync only runs once the signed-in account has claimed this device's data** (`pt3_owner`), so a shared iPad can't hand one person's projects to another.
- **Pull triggers:** sign-in, `online`, refocus after 30s away, and a 60s interval **while visible only**. Never a timer while hidden — this PWA sits open for weeks.
- Schema and RLS live in `supabase/migrations/`; runbooks in `docs/`.
- `js/cloud/sync.selftest.js` and `js/cloud/sync.pushpull.selftest.js` are **not shipped**. Load one from the console and call `syncSelfTest()` / `syncPushPullTest()`. The second stands up a mock server and snapshots/restores every `pt3_*` key, so it is safe to run on a device with real progress.

### Pattern versions (structure hash)
Patterns ship with the deploy, so **text edits reach everyone immediately** — fix a typo, push, done. Structural edits are the danger: progress is keyed on step ids, so adding, removing or renaming a step moves someone's ticks onto the wrong rows.

- `structHash(pattern)` hashes **structure, not prose**: ordered phase ids, `hasChart`, `countable`, chart length, step ids, `rows`/`target`, `cadence`, `bullets.length`. A step's `text`, a phase's `name` and the notes are deliberately excluded. Two FNV-1a passes → 16 hex chars; one 32-bit hash would fail in the silent direction (a collision means a changed pattern is treated as unchanged).
- `createProject` stores the hash **and a frozen copy of the pattern**. The copy is taken at create because by the time a change is noticed the old pattern is already gone from the code.
- `patternForProject(proj)` decides what a project knits: hashes match → the **live** pattern (text edits flow through); they differ → the **frozen snapshot**, and `patternChanged`/`patternFrozen` go true. The snapshot is only parsed when the cheap hash comparison says it's needed — `renderHome()` calls this per card.
- A non-blocking **"Pattern updated · Review"** chip appears while a changed project is open. Adopting (`adoptPattern`) is an explicit tap, shows a kept/dropped summary first, and **destroys nothing**: orphaned progress keys are left in place, so a step that comes back brings its tick with it — and deleting them would fight sync, since a device that hasn't adopted would push them straight back. The one thing that must move is `cur`, a phase *index*, which is translated through the phase id it pointed at.
- Sync: `pattern_struct_hash` always; `pattern_doc` **only once the project has diverged** from the code, since otherwise the receiving device can rebuild the snapshot from its own bundle. `applyRemotePattern` never overwrites a snapshot this device already has.

### Global row tally
A read-only **Rows** display in the header. `globalRows` auto-advances by the real change whenever a section row counter (`changeCount`) or the yoke-chart row (`changeChartRow`) moves; clamped taps (counter already at min/max) don't move it. It's a project-wide total (persisted as `pt3_proj_<id>_grows`), updated in place by `renderGlobalRows()`.

### Chart
`CHART_B` (the active pattern's `chart`) is a 44-row × 23-stitch array. Each cell: `K` knit, `P` purl, `YO` yarn over, `K2` k2tog, `SK` SKPO, `M1` make one, `E` no-stitch. Displayed top-to-bottom (row 44 at top = worked last) but knitted bottom-to-top (row 1 first). Cell size is the CSS var `--cell-sz`; `A−` / `A+` call `resizeChart(delta)`.

### Chart screen layout (fixed bars)
On a `hasChart` phase, `body.chart-page` is set. The header and the row-counter/nav dock are `position: fixed` (top and bottom), and the scrolling middle (`.content`) is sized between them by measuring their heights in JS (`syncChartLayout()`). This avoids relying on viewport-height units (`vh`/`dvh`/`svh`/`innerHeight` all mis-report inside Chrome Custom Tabs on Pixel). Only `.chart-vp` scrolls.

**Auto-hide (idle):** after `UI_IDLE_DELAY` (2.5s) of no interaction outside the chart, `body.chart-idle` collapses the surrounding panels so the chart fills the screen; a minimized top bar (pattern/section name) stays as the affordance to bring them back. Tapping anywhere outside `.chart-vp` / the row counter / the recenter FAB wakes them. **This auto-hide is confined to `body.chart-page` only** (the collapse transitions are scoped to `body.chart-page`); other sections never animate show/hide.

> Gotcha: `body.classList.toggle('chart-page', isChart)` must get a **real boolean**. `PHASES[cur].hasChart` is `undefined` (not `false`) on non-chart phases, and `toggle(cls, undefined)` *flips* the class — which made panels jump on every step toggle. It's coerced with `!!` in `renderPattern()`.

### Service worker update flow
HTML is fetched **network-first** (fresh page on each load when online; cache fallback offline); other assets are cache-first. On a new SW version:
1. Browser fetches updated `sw.js` in the background
2. New SW installs but waits (no `skipWaiting` in install)
3. App detects `reg.waiting` → shows dark toast: "Update available · Update now"
4. User taps → app posts `{ type: 'SKIP_WAITING' }` → SW `skipWaiting()` → `controllerchange` → reload

## Key CSS variables (in `:root`)
```css
--bg: #f5f2ed        /* page background */
--card: #fffefb      /* card/header background */
--border: #e0dbd2    /* borders */
--text: #2a2520      /* primary text */
--muted: #8a8178     /* secondary text */
--accent: #4a6b5a    /* green accent */
--ch-blue: #2563eb   /* chart active row / current row number */
--cell-sz: 16px      /* chart cell size, user-adjustable */
```

## Key JS functions
- `render()` — dispatcher: home / picker / project view
- `renderHome()` / `renderPicker()` / `renderHeader()` — projects list / pattern chooser / per-view header
- `openProject(id)` / `goHome()` / `startNewProject()` / `choosePattern(id)` — view navigation
- `createProject` / `renameProject` / `deleteProject` — manage the projects list
- `activateProject(id)` / `applyPattern(p)` — open a project: swap active-pattern pointers + load its progress
- `structHash(p)` / `patternForProject(proj)` — which version of a pattern a project knits, and why
- `freezePattern` / `frozenPattern` / `storedHash` / `patternChangeSummary` / `adoptPattern` — the freeze-and-adopt flow
- `projectProgress(proj)` — done/total/pct for a project's home card (no activation)
- `renderProject()` — header + phase content + tabs + progress + chart wiring
- `renderPhase()` — builds current phase HTML (chart if `hasChart`)
- `buildChartTracker()` — chart viewport, zoom bar, legend, recap, confirm step
- `changeChartRow(delta)` — moves chart row ±1 (targeted DOM update); auto-advances `globalRows`
- `changeCount(id, delta)` — section row counter; auto-advances `globalRows`
- `resizeChart` / `scrollChartToCurrent` / `smartScrollChart` / `syncChartLayout` — chart layout & scroll
- `save()` / `loadProjectState()` / `loadGlobal()` / `migrateLegacy()` — persistence
- `renderGlobalRows()` — updates the header Rows tally in place
- `showUpdateBanner(worker)` / `applyUpdate()` — PWA update prompt
- `openSheet(title, html, opts)` / `sheetConfirm` / `sheetPrompt` — the bottom-sheet primitive; **use these, never `prompt()`/`confirm()`** (unreliable in Chrome Custom Tabs, which is where magic links open)

**Cloud (`js/cloud/`)**
- `initCloud()` / `cloudState()` / `openAccountSheet()` — client, status, the only sign-in surface
- `handleSignedIn(uid)` / `claimLocalProjects(uid)` — whose data on this device is
- `stampClock(key)` / `syncNow()` — record an edit; `syncNow` floors stamps above what's on disk
- `readLocalProgress` / `writeLocalProgress` / `splitFields` / `joinFields` — localStorage ⇄ field keys ⇄ server columns
- `diffProgress(local, remote, base)` — the pure three-way merge
- `flush(reason)` / `pushProject` / `pushProgress` — push (read-merge-write, `server_rev` guarded)
- `pull(reason)` / `mergeRemoteProgress` / `applyRemoteProject` / `agreedBase` — pull and apply
- `enqueue` / `dequeue` / `markDirty` / `flushNow` — the outbox and its scheduler
- `noteConflicts` / `liveConflicts` / `resolveConflict` / `openConflictSheet` / `showConflictBanner` — the conflict flow

## Nav buttons
Within a pattern, phase nav is at the bottom. On non-chart phases it's the fixed `.nav-btns` (first phase shows only "Next →" full-width; others "← Back" + "Next →"). On the chart phase it lives in the fixed `.chart-dock` alongside the row counter.

## Typography
- Headings (pattern names, phase names, library card names): Georgia serif
- Everything else: system sans-serif (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)

## What NOT to do
- Don't suggest "Add to Home Screen" on Android Chrome — owner can't do this and doesn't want it mentioned
- Don't add the stats bar back (Steps Done / Phase / Complete) — removed intentionally
- Don't change the `pt3_` localStorage prefix or drop any of the three migrations — would break saved progress
- Don't replace the progress push with a plain upsert — it silently erases the other device's rows and reports no conflict
- Don't upload `pt3_proj_<id>_base` — each device's baseline is its own, and sharing it corrupts the other device's merge
- Don't put a network call, an `await`, or a pattern-doc `JSON.stringify` on the `changeChartRow` path (budget: 100 taps under 50ms)
- Don't `await` anything on a render path — read `session` synchronously, never `supabase.auth.getSession()`
- Don't put a step's `text` (or any prose) into `structHash` — every typo fix would freeze every project in the family
- Don't strip "orphaned" progress keys when adopting a pattern update — they're inert, they come back if the step does, and a device that hasn't adopted would push them back anyway
- Don't load a script after `js/core/app.js` — it ends with the bootstrap, so anything it calls must already be defined
- Don't run the panel auto-hide/collapse animation off the chart screen — keep it scoped to `body.chart-page`
- Don't deploy or push unless the user asks

## Figma design reference
The layout follows a Figma design at:
`https://www.figma.com/design/mSct8t0TpsyYJad4teKfwl/Stitch-ease-knitting?node-id=3328-12548`

Key measurements from the design:
- Header: 44px, Progress bar: 4px, Tabs: 44px → content starts at y=92
- Chart viewport: fills between the fixed header and dock
- Row tracker footer: centered large number, "Current row" label above, "Total rows 44" below, 48×48 circular ± buttons
- Nav: bottom, full-width on first phase, 50/50 split on others

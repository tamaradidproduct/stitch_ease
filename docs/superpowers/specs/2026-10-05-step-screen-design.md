# Step screen redesign — design spec

**Status:** design, agreed in brainstorming 2026-10-05. Nothing here is built.
**Supersedes:** the UI half of `docs/rows-sections-model.md` and its step 7 ("fold the chart in").

## Why

Today a section renders one of two unrelated ways, decided by `phase.hasChart`:

- **Written section** — a scrolling list of cards (`entryHtml`): notes and rows with
  checkboxes, repeat blocks with a pass counter. Progress lives in `entryProg`
  (`n:`/`r:`/`rp:{y,z}` keys).
- **Chart section** — a fixed header, a full-height scrolling chart and a dock with a
  derived row recap and ± (`buildChartTracker` / `renderChartDock`). Progress is one
  integer, `cr:<phaseId>`.

The knitter's actual mental model is neither. **The row I'm on is the screen.** Written
instructions and the chart are both *components* of that screen, present when the
row has them. And while working one row, the knitter still wants to glance at what's
coming.

## Mental model: playlist and player

Borrowed from music apps.

| Music app | Here |
|---|---|
| Album header | Section name, description, **section notes** |
| Playlist | Every **step** in the section, in order, current one highlighted |
| Mini-player (collapsed dock) | The current row, one line, plus **Done** (and pass ± on a repeat) |
| Full player | The **step screen** — everything about one step |

The playlist is the glance-ahead; the player is the detail. Done works from both, so a
knitter can sit in the playlist and still record progress.

## Section model

A section is **section notes** + an ordered list of **steps**.

### What happens to today's `note` entries

Notes stop being mixed in with rows, and **nothing informational gets a checkbox**.

| Today's note is… | Examples | Becomes |
|---|---|---|
| Context true for the whole section | materials; WATL edge rhythm; Sophie "increase every Nth row"; "i-cord now only on face edge" | **Section notes** — persistent, collapsible, prose |
| A setup action, once, before a row | cast on; switch to 4 mm; place markers; pick up sts | **`before`** on that row |
| A checkpoint after a row | "39 sts on the needle"; "count to confirm 253 sts" (today's `postChart`); "check ≈ 22 cm" | **`after`** on that row |
| Work that isn't rows | bind off; sew hood; weave in ends; a materials-only section | A step in a **rowless section** |

**Rule of thumb:** work gets a tick; information never does.

- Section notes, `before` and `after` render as distinct, unticked callouts.
- An `after` checkpoint is confirmed **as part of Done** on its row. It is never ticked separately.

### Step kinds

- **Row** — one physical row.
- **Repeat block** — kept as a block, as today: the whole motif visible, current row
  highlighted, "Pass N of T".
- **Task** — only in rowless sections; a ticked item, no row semantics.

Every row (standalone or inside a repeat) has a **written part**, rendered the same in
every context:

- authored `text`, **or**
- derived from the chart via `rowRecap()`, **or**
- authored text that **overrides** the derived recap (today's WATL `pairedRow`).

### The chart is a component of a row, not of a section

- **Full-width chart sections** (Peacock yoke, Posy): one row step per chart row,
  generated from the chart. Overrides attach by row number.
- **Motif charts** (Hatsuki leaf, 15 sts between markers): a repeat's authored rows
  reference chart rows. The repeat card shows chart + motif rows, the current row
  highlighted in both. The written part covers the rest of the row.

### `before` / `after` placement

| Attached to | `before` shows | `after` shows |
|---|---|---|
| A standalone row | on that row | on that row, confirmed by its Done |
| A repeat block | first pass only | after the last pass |
| A row inside a repeat | every pass | every pass |

### Data shape (sketch)

```js
{ id:'yoke', name:'Yoke', desc:'4 mm circular · raglan increases',
  notes: ['Markers: 38 back / 48 sleeve / 77 front / 48 sleeve'],
  steps: [
    { kind:'row', id:'y1', text:'Increase round — 8 inc',
      before:'Switch to 4 mm. Place 4 markers.' },
    { kind:'repeat', id:'y-rep', times:4,
      after:'285 sts. Mid-front ≈ 22 cm.',
      rows:[ { id:'y-rep-1', text:'Increase round — 8 inc' },
             { id:'y-rep-2', text:'Plain round' } ] },
  ] }

// Full-width chart section — steps generated, one per chart row
{ id:'yoke-chart', name:'Yoke chart', notes:[…],
  chart: CHART_B, flatChart:false,        // existing chart fields unchanged
  chartSteps: {                           // optional per-row extras, keyed by chart row
    text:   { /* row: 'authored override' */ },   // or a function, as pairedRow is today
    before: { 1:  'Join, place BOR marker' },
    after:  { 44: 'Count to confirm 253 sts' },
  } }

// Motif chart inside a repeat
{ kind:'repeat', id:'leaf', times:6, chart:'leaf',
  rows:[ { id:'leaf-1', chartRow:1, text:'k to marker, sm, [chart], sm, k to end' }, … ] }

// Rowless section
{ id:'finish', name:'Finishing', rowless:true, notes:[…],
  steps:[ { kind:'task', id:'f1', text:'Bind off loosely' }, … ] }
```

The exact field names are an implementation decision. The constraints are:

- Chart sections must not need 44 hand-written row entries.
- Override, `before` and `after` must be able to attach to any row.

## Progress

### One cursor per section, counting physical rows

- One integer per section: **rows completed**. Repeat rows × passes each count.
- Everything before the cursor is complete, everything after is incomplete.
- Pass and row-in-pass are **derived** from the cursor.
- It replaces both `cr:<phaseId>` and `rp:<id>{y,z}` (and `r:` for row entries).
- Rowless sections keep a done flag per task. There is no cursor.
- The Rows tally = Σ section cursors. Rowless sections contribute 0.
- A section is complete when cursor = section row count (rowless: all tasks ticked).
- Progress UI counts **rows, not screens** ("Row 12 of 20"), so it agrees with the Rows tally.

### Two interaction modes

**Browse** — never changes progress.

- ‹ / › moves between steps.
- Tapping a row inside a repeat previews it.
- Tapping a playlist item opens the player on that step.
- The viewed position is local and ephemeral (not persisted, not synced).
- When the viewed position ≠ the cursor, a chip shows:
  "Viewing row X · on row Y → **Back to current**".

**Progress** — explicit actions only.

| Action | Effect |
|---|---|
| **Done** on the cursor row | Completes it and auto-advances. Inside a repeat: next row, or row 1 of the next pass, on the same screen. After the last row of the last pass: the next step. |
| **Done** on a row ahead of the cursor | **Confirm** ("Mark rows 12–15 complete?"), then move the cursor past it. |
| **Mark incomplete** on a completed row | Moves the cursor back to that row. Confirm if it un-completes more than one row. |
| **Pass +** on a repeat | **Finishes the current pass**: cursor → row 1 of the next pass. No confirm, because using it *is* the statement that the pass was knitted. On the last pass it completes the block. |
| **Pass −** on a repeat | At row 1 of pass P: → row 1 of pass P−1. Mid-pass: → row 1 of the current pass. Clamped at row 1 of pass 1. |
| Tick a task (rowless) | Toggles that task. |

- Pass ± is a progress action, styled distinctly from browse ‹ / ›.
- It is on the repeat card in the player and on the mini-player when the current step is a repeat.
  This supports the "worked the whole pass in one go" habit.
- Today's chart dock −/+ (which *is* progress) becomes browse.
- **Done** is the progress action, so the **< 50 ms tap budget moves to Done** (and pass ±).
  No network, no `await`, no pattern-doc stringify on that path.

## Screens

### 1. Playlist (section view)

```
┌──────────────────────────────────────────┐
│ ‹ Peacock Tee              Rows 112  ☰ ⓘ │  header
├──────────────────────────────────────────┤
│ Yoke chart                         ▾     │  section name + switcher
│ 4 mm circular · Chart B ×11              │
│ ┌──────────────────────────────────────┐ │
│ │ Notes                              ▾ │ │  section notes, collapsible
│ │ Markers: 38 back / 48 sleeve / …     │ │
│ └──────────────────────────────────────┘ │
│                                          │
│  ✓  9   k3, yo, k2tog, k5, ssk, yo, k3   │  done: muted
│  ✓ 10   knit all                         │
│  ▶ 11   k2, yo, k2tog, k3, ssk, yo, k2   │  current: highlighted
│    12   knit all                         │
│    13   k1, (yo, k2tog) ×2, k1, …        │  upcoming
│    14   knit all                         │
│    …                                     │
│    44   k1, m1, k to end                 │
│         ⓘ Count to confirm 253 sts       │  `after` callout, inline
├──────────────────────────────────────────┤
│ Row 11 · k2, yo, k2tog, k3, ssk…  [Done] │  mini-player
└──────────────────────────────────────────┘
```

- A repeat is **one item**: "Repeat rows 5–12 · pass 2 of 4", with pass ± on the
  mini-player while it's current.
- Section-to-section navigation (← Back / Next →) sits at the end of the list.
- Tapping the mini-player opens the player. Tapping an item opens the player on it, in browse mode.

### 2. Player — a row in a chart section

```
┌──────────────────────────────────────────┐
│ ⌄  Yoke chart                   Row 11/44│  ⌄ back to playlist
├──────────────────────────────────────────┤
│ Notes                                  ▸ │  collapsed bar
│                                          │
│ ⚑ Switch to colour B                     │  `before` (if any)
│                                          │
│ Row 11 (RS) · read right → left          │  written part — the largest text
│ k2, yo, k2tog, k3, ssk, yo, k2           │
│                                          │
│  13 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢             │
│  12 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢             │  chart window: 5–7 rows,
│▶ 11 ▢▢○╱▢▢▢▢▢▢▢▢▢▢▢▢▢▢╲○▢▢▢  ◀          │  current row centred
│  10 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢             │
│   9 ▢▢▢○╱▢▢▢▢▢▢▢▢▢▢▢▢╲○▢▢▢▢          ⤢  │  ⤢ full chart screen
│                                          │
│ ⓘ (after, if any)                        │  `after` callout
├──────────────────────────────────────────┤
│   ‹              Row 11 of 44          › │  browse
│ [              Done                    ] │  progress
└──────────────────────────────────────────┘
```

- The window centres the current row and clamps at the chart's top and bottom. A chart shorter
  than the window shows whole.
- No zoom, mid-row marker or legend here. Those live on the full chart screen.

### 3. Player — a repeat block with a motif chart

```
┌──────────────────────────────────────────┐
│ ⌄  Front                   Row 23 of 60  │
├──────────────────────────────────────────┤
│ Notes                                  ▸ │
│                                          │
│ Leaf motif                      repeat   │
│ ┌──────────────────────────────────────┐ │
│ │  − ]   Pass 2 of 6   [ +             │ │  pass ± (progress)
│ │                                      │ │
│ │  4 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢                   │ │
│ │▶ 3 ▢▢○╱▢▢▢▢▢▢▢╲○▢▢  ◀                │ │  motif chart, current row
│ │  2 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢                   │ │
│ │  1 ▢▢▢○╱▢▢▢▢▢╲○▢▢▢                   │ │
│ │                                      │ │
│ │  ✓ 1  k to m, sm, [chart], sm, k…    │ │  motif rows: done this pass
│ │  ✓ 2  p to end                       │ │
│ │  ▶ 3  k to m, sm, [chart], sm, k…    │ │  current
│ │    4  p to end                       │ │
│ └──────────────────────────────────────┘ │
│ ⓘ After the last pass: 47 sts            │  block `after`
├──────────────────────────────────────────┤
│   ‹              Row 23 of 60          › │
│ [              Done                    ] │  → row 4 of pass 2
└──────────────────────────────────────────┘
```

- Ticks on motif rows reset each pass, as today.
- Tapping a motif row previews it (browse). It does not move progress.
- The repeat is never auto-collapsed. In the playlist it is one item; in the player it is shown whole.

### 4. Player — a row in a written section

The same frame as screen 2, without the chart window:

```
│ ⚑ Cast on 88 sts on 3 mm circular.       │  `before`
│   Join in the round.                     │
│                                          │
│ Round 1                                  │
│ k1, p1 rib to end                        │
│                                          │
│ ⓘ 88 sts                                 │  `after`
```

### 5. Rowless section

```
┌──────────────────────────────────────────┐
│ Finishing                          ▾     │
│ ┌──────────────────────────────────────┐ │
│ │ Notes                              ▾ │ │
│ └──────────────────────────────────────┘ │
│  ☑  Bind off loosely in pattern          │
│  ☐  Sew hood seam                        │
│  ☐  Weave in ends                        │
│                                          │
│ [← Back]                 [Finished! 🎉]  │
└──────────────────────────────────────────┘
```

There's no player, no mini-player and no Done.

### 6. Full chart screen

- Opened from ⤢ on the chart window. It's a separate screen, not an overlay that auto-hides.
- It holds today's whole-chart tooling:
  - the full scrolling chart with the cursor row highlighted
  - zoom A− / A+
  - recenter
  - the draggable mid-row marker
  - yarn chips and the palette editor
  - the legend
- Tapping a row previews it (browse). Back returns to the player.

### Browse chip

```
│ Viewing row 15 · on row 11   Back to current │
```

Shown on the player and the playlist whenever the viewed step ≠ the cursor.

## Removed

- **Auto-collapse / auto-hide of any kind.** It makes the UI jerky.
  - This includes any remaining idle collapse on chart screens
    (CLAUDE.md still describes `body.chart-idle` / `UI_IDLE_DELAY`; verify what's left in the code).
  - It also includes the repeat card's expand-only-when-active behaviour (`repeatExpanded`).
  - Layout changes only on a tap.
- Checkboxes on notes.
- The separate chart code path: `buildChartTracker` / `renderChartDock` as the section renderer,
  and `chartCurrentRow` as an independent progress model.
- `postChart` — it becomes an `after` on the last chart row.

## Kept

- Sheets: notes / glossary, PDF, colours, conflicts, pattern update.
- The header Rows tally, now Σ cursors.
- `rowRecap()`, `collapseRepeats()` and per-cell yarn colours, as the derived written part.
- Section notes defer to the glossary as today (`glossaryEntry`).

## Migration and sync — risks to design around

1. **Pattern re-authoring (8 patterns).**
   - Each `note` is classified into section notes, `before`, `after` or a task.
   - Chart sections gain `chartSteps` overrides.
   - Motif repeats gain `chartRow` refs.
   - This is manual; `postChart` → `after`.
2. **Every structure hash changes.**
   - Moving notes out of the step list changes `structHash` for every pattern. Untreated,
     every existing project would freeze on its snapshot and show "Pattern updated · Review".
   - The migration must:
     - convert progress to the new shape
     - re-stamp `phash` against the new live pattern in the same step
   - Frozen snapshots in the old shape must be either converted or rendered by a compatibility path.
3. **Progress keys.**
   - New `pt3_schema` = 4.
   - Each section's cursor = rows done, derived from the old keys:
     - `r:` done flags in order
     - `rp:{y,z}` → `y·R + z−1` (the existing row-count math)
     - `cr:` → chart row − 1, or the chart row itself, depending on the existing "current row"
       semantics (verify against `chartRowOf`)
   - Rowless tasks keep done flags.
   - Old keys are left in place, as adopt does.
4. **Sync clock namespace.**
   - A new key per section cursor (e.g. `sc:<sectionId>`); `t:<taskId>` for tasks.
   - **Upgrade-on-read**, as `upgradeLegacyRow` does for v1 → v2. Never refuse an older row;
     refuse only a newer one.
   - Trade-off: today two devices editing different rows of one section merge silently. One
     cursor per section turns that into a conflict. This is acceptable, because one knitter is
     at one row, but the conflict sheet needs a readable label ("Yoke: row 12 vs row 15").
5. **Tap budget.** Done and pass ± inherit `changeChartRow`'s < 50 ms / 100 taps budget.

## Testing

- Extend `js/core/rows.selftest.js` with:
  - cursor ↔ (step, pass, row-in-pass) math
  - pass ± from row 1 and mid-pass
  - the clamps
  - Done-ahead and mark-incomplete
- Extend `sync.pushpull.selftest.js` for the schema-4 upgrade-on-read and the new keys.
- Browser-verify each of the 8 patterns:
  - the playlist
  - the player for every step kind
  - the full chart
  - mid-progress projects migrated from schema 3, with the header Rows tally unchanged
    before and after

## Open questions

- **Player layout on a phone.** How the chart window and the written part split the height
  (window height in rows vs cell size), and how wide charts like Posy fit (horizontal scroll
  vs fit-to-width). Settle with mockups before implementation.
- **Field names** for `chartSteps`, `before`, `after` and `notes`, and whether `before`/`after`
  allow more than one item.
- **Sequencing.** Suggested increments, each browser-verified:
  1. Pure cursor math + selftests.
  2. Playlist + mini-player + player on one converted written section, behind a shape check.
  3. Chart window on chart sections; the full chart screen.
  4. Repeat + motif chart.
  5. Rowless sections.
  6. Convert the remaining patterns.
  7. Migration (schema 4) + sync keys + upgrade-on-read — only after 1–6 are stable.

# Sections, rows, and repeats — implementation instructions

**Status:** design only. Nothing here is built. Written 2026-08-10, to be picked up after
the sync phases land (see the phase plan in the Phase 2 branch history).

## Why

The app currently has no concept of a row. A pattern is a list of `phases`, each holding
`steps`, and a step is whatever the pattern author needed it to be:

```js
{id:'c1', text:'Cast on 88 sts on 3 mm circular…'}                             // not a row
{id:'c2', text:'Work 7 rounds k1, p1 rib', rows:true, target:7, lbl:'rib rounds'} // seven rows
{id:'r2', text:'Increase every 2nd round…', rows:true, target:8, cadence:2}       // eight rows
```

Three different things wearing the same shape. That has two consequences:

1. **Rows are not addressable.** "Work 7 rounds rib" is one step with a counter at 4/7.
   There is no row 4 to point at, annotate, or show a recap for. The yoke chart is the only
   place in the app where a row is a real object, and that is a separate code path
   (`chartCurrentRow`, `CHART_B`) that shares nothing with the rest.
2. **Repeats can only be counted, never positioned.** Today a repeat is a step whose counter
   counts *how many times* you have done the thing — `{rows:true, target:12, lbl:'repeat: Ring Q'}`.
   That works for "do this one row twelve times". It cannot express **"work rows 5–12 four
   times"**, because there is nowhere to store *which of the eight rows you are on*. Put the
   app down mid-repeat and it cannot tell you where to resume.

`globalRows` papers over this with a single running tally that every mutator nudges by hand
(`toggleStep`, `changeCount`, `changeChartRow` each adjust it). It is a number with no
referent — nothing can reconstruct it, so it can only drift.

## The model

Three levels. Sections hold entries; entries are one of three kinds.

```js
{
  id:'yoke', name:'Yoke', desc:'4 mm circular · raglan increases',
  entries: [
    { kind:'note',   id:'y0', text:'Place 4 markers: 38 back / 48 sleeve / 77 front / 48 sleeve' },
    { kind:'row',    id:'y1', text:'Increase round — m1-R before marker, k1, m1-L after (8 inc)' },
    { kind:'row',    id:'y2', text:'Plain round — knit all stitches' },
    { kind:'repeat', id:'y-rep', times:4, rows:[
        { id:'y-rep-1', text:'Increase round — 8 inc' },
        { id:'y-rep-2', text:'Plain round' },
    ]},
    { kind:'note',   id:'y9', text:'285 sts total. Mid-front should measure ≈ 22 cm' },
  ]
}
```

| kind | is a row? | progress state | replaces today's |
|---|---|---|---|
| `note` | no | `done: bool` | a step with no `rows:` |
| `row` | yes, exactly one | `done: bool` | a step standing for a single row |
| `repeat` | yes, `times × rows.length` | `{y, z}` — see below | a step with `rows:true, target:N` |

### Repeat position

A repeat block of `R = rows.length` rows worked `times` times carries **one position**:

- **Z** — which row inside the current pass, `1 … R`
- **Y** — how many full passes are finished, `0 … times`

Both derived quantities the knitter actually wants come from those two:

```
rowsIntoBlock = Y × R + Z          // how far through this repeat block
absoluteRow   = rowsBefore + rowsIntoBlock
```

where `rowsBefore` is the count of rows in the section preceding this block. So with the
block starting after pattern row `n`, repeat-row 1 is pattern row `n+1`, repeat-row 2 is
`n+2`, and after the first pass completes, repeat-row 1 of the *second* pass is `n+R+1` —
which is the arithmetic requested.

Advancing past the last row of a pass increments Y and resets Z to 1. Reversing off the
front of a pass decrements Y and sets Z to R, so the ± controls stay symmetric — a knitter
who taps + once too often must be able to tap − once and land exactly where they were.

**Y and Z are one value, not two.** They must be stamped, stored, and merged together.
Taking Y from one device and Z from another yields a position neither device was ever at
— "pass 3, row 7" when one device was at pass 3 row 2 and the other at pass 1 row 7. See
the clock-key note below.

### Row totals become derived

Every count the UI shows is now computable:

```js
function sectionRowCount(section) {
  return section.entries.reduce((n, e) =>
    n + (e.kind === 'row' ? 1
       : e.kind === 'repeat' ? e.times * e.rows.length
       : 0), 0);
}
function sectionRowsDone(section, progress) { /* same shape, using done flags and Y·R+Z */ }
```

`globalRows` is then `Σ sectionRowsDone`, and `patternTotalRows()` is `Σ sectionRowCount`.
**Delete the stored `grows` key and its hand-nudging in every mutator.** A derived total
cannot drift; the current one can and does.

## What this touches

Anchored on function names — re-grep before editing, line numbers rot.

| File | Change |
|---|---|
| `js/patterns/*.js` | `steps:` → `entries:` with a `kind` on each. The bulk of the work; four patterns. |
| `js/core/state.js` | `applyPattern()` seeds `{done}` / `{y,z}` per entry instead of `state`/`ctrs`. Drop `globalRows`. |
| `js/core/storage.js` | New progress shape; `resetStep`/`resetPhase`/`resetPattern`; `projectProgress()`; migration. |
| `js/core/render.js` | `stepHtml()` splits into `noteHtml` / `rowHtml` / `repeatHtml`. `renderPhase()` walks `entries`. |
| `js/core/app.js` | `toggleStep` → `toggleNote`/`toggleRow`; `changeCount` → `advanceRepeat(blockId, ±1)`. `renderGlobalRows()` reads the derived total. |
| `js/cloud/sync.js` | New clock-key namespace (below). |
| `js/core/chart.js` | Optional — fold `chartCurrentRow` into a section position so the chart stops being a separate code path. Do this **last**, or not at all. |

### Clock keys

The Phase 2 clock namespace (`s:<stepId>`, `c:<stepId>`, `cur`, `chart_row`, `global_rows`)
does not survive this change. Replace with:

```
n:<entryId>     a note's done flag
r:<entryId>     a row's done flag
rp:<entryId>    a repeat block's {y,z} position — ONE key for the pair
cur             which section is open
```

`global_rows` **disappears** — it is derived, so it is not independently editable and must
not be independently clocked. Two devices can no longer disagree about the total; they can
only disagree about the positions it is computed from, which is the right granularity.

`rp:` being a single key is what keeps Y and Z consistent under merge. The three-way merge
treats the pair as one opaque value: it survives whole from one side or the other, and a
genuine clash prompts once for "which position", not twice for two halves of one.

### Migration (#4)

Bump the `pt3_schema` sentinel to `'2'` and branch on it. For each project:

- `state[stepId]` (bool) → `n:` or `r:` done flag, by the entry's new kind.
- `ctrs[stepId]` (int) → the replacement entry's position. **This is lossy and cannot be
  made exact**: today's counter says "12 of 12 done" with no record of position within a
  pass, because that information was never captured. Map it to `Y = floor(count / R)`,
  `Z = (count % R) + 1`, which is right whenever the old counter counted whole passes —
  true for every current pattern, since today's repeats are all single-row.
- Drop `grows` and `chartRow` handling per whatever the chart decision is.
- Rewrite `clk`/`base` into the new namespace with one shared `t0`, exactly as
  `migrateAddClocks()` does. Do not try to carry the old timestamps across a key rename;
  they describe fields that no longer exist.

Sub-step bullet keys (`<stepId>__b<i>`, see `toggleSubStep()`) fold into repeat rows
naturally — a bullet list on a counter step *is* a repeat block whose rows are the bullets.
That is the one place where the current model already gestures at this design, and it
should collapse into it rather than survive alongside.

### UI

The repeat control needs to show all three numbers at once, because a knitter mid-repeat
needs to know both where they are in the pass and how many passes remain:

```
        Repeat rows 5–12          ← the block
   Row 3 of 8  ·  pass 2 of 4     ← Z of R  ·  Y+1 of times
        Pattern row 47            ← absoluteRow
      [ − ]              [ + ]
```

Reuse the existing `.chart-dock` layout — it already presents exactly this (a large current
number, a total beneath, 48×48 circular ± buttons), which is the strongest argument that
the chart and the row tracker want to be one component in the end.

## Sequencing

One increment per commit, verified in the browser before the next.

1. **Add the shapes without using them.** `sectionRowCount`, `sectionRowsDone`,
   `absoluteRow` as pure functions plus a console harness. Nothing renders. Verify against
   hand-worked examples, including Y=0 and Z=R edge cases.
2. **Convert one pattern.** Peacock Tee's Collar section only, behind a `section.entries`
   check so unconverted sections keep the old path. Both must render.
3. **Convert the remaining sections and patterns.** Delete the old `steps` path once nothing
   references it.
4. **Derive the totals.** Delete stored `grows`, delete the per-mutator nudging, point
   `renderGlobalRows()` at `Σ sectionRowsDone`. Verify the header total matches what the old
   stored value was for a project mid-progress.
5. **Migration #4 + the new clock namespace.** Verify with a project saved under schema 1.
6. **Repeat UI.** The three-number dock.
7. **Optional: fold the chart in.** Only if 1–6 are settled.

Do not start 5 until 1–4 are stable — a migration written against a shape still in motion
has to be rewritten anyway, and a migration rewritten after users have run it is the one
kind of change this codebase cannot take back.

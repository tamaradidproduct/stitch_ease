# Pattern CSV template

Fill-in-yourself template for hand-building a pattern to keep **local only** (not committed, not built into `js/patterns/`). Maps directly onto the app's existing entry model — [pattern-csv-template.csv](pattern-csv-template.csv) is a filled-in example using placeholder text.

No CSV importer exists in the app yet — this is the data shape to fill in by hand today; an on-device upload UI (parse this CSV → write a pattern object to localStorage, never to a committed file) would be a separate follow-up.

## Columns

| Column | Required on | Meaning |
|---|---|---|
| `pattern_id` | every row | slug, must match on every row of the pattern. The app adds a random suffix on import, so it never has to be globally unique — and re-importing a file never replaces anything (use **Update** on the pattern's tile for that) |
| `pattern_name` | first row only | display name |
| `pattern_badge` | first row only | small label, e.g. "Tatting" |
| `pattern_desc` | first row only | one-line description |
| `phase_id` | every row | groups rows into a phase/section; repeat the same id across a phase's rows |
| `phase_name` | first row of each phase | phase display name (tab label) |
| `phase_desc` | first row of each phase, optional | shown under the phase name |
| `kind` | every row | `note`, `row`, or `repeat` |
| `entry_id` | every row | unique within the phase; a `repeat` reuses the same `entry_id` across its sub-rows |
| `text` | note/row, optional on repeat | the step instruction text |
| `bullets` | note only, optional | `\|`-separated bullet list rendered under `text` |
| `repeat_times` | repeat only | how many times the sub-rows repeat |
| `sub_row_id` | repeat only | id of one row within the repeat block |
| `sub_row_text` | repeat only | instruction text for that sub-row |
| `for_sizes` | any row, optional | which sizes this step belongs to (`M\|L`); empty = all. See *Steps that differ by size* |
| `sizes` | first row only, optional | `\|`-separated size names, e.g. `XS/S\|M/L`. Makes the pattern **sized** (see below). Leave the column out or empty for a one-size pattern |

## Kinds

- **note** — informational, no row counted (materials list, finishing instructions). Use `bullets` for a list.
- **row** — one countable step (one ring, one chain, one round).
- **repeat** — a block of `sub_row_id`/`sub_row_text` pairs repeated `repeat_times` times; give every sub-row of the same block the same `entry_id`.

No chart support — this template only covers written/prose instructions (rings, chains, picots as text), matching how [js/patterns/tatted-triangle.js](../js/patterns/tatted-triangle.js) is already built.

## Sizes

Add a `sizes` cell on the first row (`XS/S|M/L`, or nine names, or any number from 2 up). Wherever a number differs between sizes, write the values once inside braces, one per size, in the same order as `sizes`:

```csv
...,kind,entry_id,text,...,sizes
...,row,co,"CO {30|34} using a tubular cast-on",...,XS/S|M/L
...,row,rib,"Work a 1x1 ribbing for 2.5 cm",...,
```

- Text without braces is the same for every size.
- **Where placeholders work:** `phase_name`, `phase_desc`, `text`, `bullets`, `sub_row_text`. Ids are never changed.
- **Every placeholder needs exactly one value per size, and no value may be empty.** A wrong count blocks the import and names the row: `Row 14: {30|34|38} has 3 values, expected 2 (one per size).`
- **Bullets:** the `|` between bullets and the `|` inside `{…}` don't clash; only a `|` outside braces starts a new bullet.
- The picker asks which size to knit when a project starts, and the project keeps that size. Sizes can't be changed afterwards; start another project for another size.
- **No `sizes` cell → braces are plain text.** Existing CSVs import exactly as before.
### Steps that differ by size

Add a `for_sizes` column. On a `note` or `row`, a `|`-separated list of size names (`M|L`) keeps that step for those sizes only; empty means every size. On a `repeat` row it filters that **sub-row**, so one block can have more sub-rows in a larger size. A phase whose steps are all filtered out for a size disappears for that size.

```csv
...,kind,entry_id,text,...,sizes,for_sizes
...,row,r1,"Work even",...,S|M|L,
...,row,r2,"Extra increase row",...,,M|L
...,repeat,rp,"Rep",{6|7},s1,"Always",,
```

- **Repeat counts** can use placeholders too: `repeat_times` = `{6|7}`.
- **Alternative wording per size:** two rows may share an `entry_id` as long as no size gets both. Repeat blocks are grouped by `entry_id`, so give two different repeats different ids.
- **Checked on import:** unknown size names, a size left with no steps, and a size that ends up with two steps sharing an id are all errors that name the size or row.
- A project knits one size, so progress is per size. Sizes can't be switched afterwards.

## Keeping this off the public repo

A pattern you don't have redistribution rights to (a bought PDF pattern, etc.) should never be turned into a committed `js/patterns/*.js` file — the GitHub Pages repo is public. Fill in this CSV for your own use, then either:
- keep it as a local-only reference and hand-copy steps into the app one at a time via whatever on-device entry mechanism exists, or
- wait for an actual CSV-upload feature that writes straight to localStorage without ever touching a tracked file.

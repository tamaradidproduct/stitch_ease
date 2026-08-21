# Pattern CSV template

Fill-in-yourself template for hand-building a pattern to keep **local only** (not committed, not built into `js/patterns/`). Maps directly onto the app's existing entry model — [pattern-csv-template.csv](pattern-csv-template.csv) is a filled-in example using placeholder text.

No CSV importer exists in the app yet — this is the data shape to fill in by hand today; an on-device upload UI (parse this CSV → write a pattern object to localStorage, never to a committed file) would be a separate follow-up.

## Columns

| Column | Required on | Meaning |
|---|---|---|
| `pattern_id` | every row | unique slug, must match on every row of the pattern |
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

## Kinds

- **note** — informational, no row counted (materials list, finishing instructions). Use `bullets` for a list.
- **row** — one countable step (one ring, one chain, one round).
- **repeat** — a block of `sub_row_id`/`sub_row_text` pairs repeated `repeat_times` times; give every sub-row of the same block the same `entry_id`.

No chart support — this template only covers written/prose instructions (rings, chains, picots as text), matching how [js/patterns/tatted-triangle.js](../js/patterns/tatted-triangle.js) is already built.

## Keeping this off the public repo

A pattern you don't have redistribution rights to (a bought PDF pattern, etc.) should never be turned into a committed `js/patterns/*.js` file — the GitHub Pages repo is public. Fill in this CSV for your own use, then either:
- keep it as a local-only reference and hand-copy steps into the app one at a time via whatever on-device entry mechanism exists, or
- wait for an actual CSV-upload feature that writes straight to localStorage without ever touching a tracked file.

# Row markers (lifeline / note) — design

## Goal
Let a knitter flag a specific row they need to remember — a **lifeline** (a safety thread run through that row; rip back to here) or a plain **note** ("increase here", "check gauge") — and see the flag in both the playlist and the player, on every device.

## Agreed decisions
- A marker is a property of one row: a **type** (`lifeline` | `note`) plus an **optional short note**.
- One marker per row. Any row can be marked (done, current or upcoming).
- Added and edited from a small **marker icon button in the top right of the selected row card** (playlist) and of the row card in the player, via a bottom sheet. Tapping the marker strip (shown under a selected row's text) opens the same sheet. The badge on a plain playlist line has no handler of its own: a tap selects the row, as for any row. The icon is secondary to "Open row ›".
- Markers **sync across devices**, per marker, using the existing per-field clock and three-way merge.
- The bottom dock is untouched (its main button stays the one primary action).

## UI
- **Badges:** lifeline = sage-filled with a line icon and "Lifeline"; note = outlined, quiet, flag icon and "Note". Built from existing `chipHtml`/`uiTag` and tokens only (no new raw colours; sage is the only accent).
- **Playlist, plain row lines:** small badge at the right end, before the row count.
- **Playlist, selected card:** a round icon button (flag) in the card's top right, beside the "Current"/"Done" tag. Outlined and grey when the row has no marker; sage-tinted when it does. When a marker exists, a strip under the instruction text shows the badge + note text. "Open row ›" stays the card's only text button. Accessible label: "Mark row" / "Edit marker".
- **Repeat blocks:** the collapsed line shows one badge if any pass inside has a marker; the open card behaves as a normal row.
- **Player:** same strip under the row instruction, same icon button in the row card's top right. Nothing else changes.
- **Sheet** (`openSheet`, never `prompt()`): title "Mark row N"; Lifeline / Note choice; optional text field ("Add a note, e.g. lifeline in at 253 sts"); Save; Remove marker when editing. Saving never moves progress.

## Data and sync
- Stored with the rest of a project's step progress. Key `mk:<sectionId>:<n>`, `n` = the flattened row number from `spRows` (each repeat pass has its own `n`). Value `{ t: 'lifeline' | 'note', x: '<text>' }`, `x` capped at ~120 chars.
- **Remove** writes a tombstone (`{ t: '' }`); the UI treats it as "no marker". The key is never deleted — absence means "never seen" to the merge and would be resurrected.
- Text is stored raw and **escaped at render**; it can arrive from another device.
- Sync: edits call `stampClock('mk:…')`. `splitFields`, `joinFields` and `readLocalProgress` gain an `mk:` branch that normalises values (type whitelist, text clamped). The conflict labeller shows "Marker · row N" with both versions.
- `PROGRESS_SCHEMA` is bumped so older clients show the existing "reload" banner instead of dropping markers on push. No SQL migration (`entries` is jsonb).
- Pattern changes: structural edits already freeze a project on its snapshot, so row numbers cannot shift under a marker. Markers are keyed by row number, like section cursors, so after "Adopt update" inserts rows earlier in a section a marker stays on its old row number, not on the row it was set on. Accepted for v1. A whole-project reset tombstones every marker; a single-section reset leaves markers in place.
- No network call, `await` or extra work on the `changeChartRow` path.

## Out of scope (YAGNI)
- Several markers on one row; marker colours; reminders or notifications.
- A dock shortcut for one-tap lifelines (possible follow-up).
- A "jump to my lifelines" list (possible follow-up; the badges cover scanning for now).
- Marking chart-screen rows directly (markers show in the step screens only; confirm in planning whether the chart screen needs a read-only indicator).

## Testing
- Self-test alongside the existing sync self-tests: marker on device A and a different row on device B both survive a merge; same-row edits raise the conflict sheet with both versions; remove on one device removes on the other; a malformed remote marker is normalised or ignored.
- Step-view tests: badge on plain line, strip on selected card, repeat collapsed line, player strip, icon button switches between its empty and marked states.
- Manual: phone + second device, offline edit then reconnect, token lint (`node scripts/check-tokens.mjs --all`).
- Bump the service-worker cache version when shipping.

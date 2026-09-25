# Chart import (`.stitchchart.json`)

The second way to add a pattern on-device, beside CSV (`docs/pattern-csv-template.md`).
**New project → Import pattern** takes either file type; the content decides which
parser runs (`handlePatternFileText`, `js/core/chartImport.js`). On desktop a file
can also be dropped onto the picker screen.

The result is a **custom pattern** (`pt3_custom_patterns`, `custom: true`) with one
chart phase — stored, frozen, adopted and synced exactly like a CSV import.

## What is read (v3)

| Field | Use |
|---|---|
| `name` | Pattern name (editable in the preview sheet) |
| `palette` | Stitch ids; `stitches[i][2]` indexes it. Mapped by `STITCHCHART_IDS` |
| `stitches` | `[x, y, paletteIndex]`. **min y = row 1** (y grows upward), x left → right. Any cell inside the bounding box with no stitch is `E` (no stitch) |
| `colors` + `colorPalette` | `[x, y, colourIndex]` → yarn slots. Each distinct colour becomes one entry in `phase.chartYarns` (order of first use from row 1), and `phase.chartColors` holds the slot index per cell. The export colour is only the default swatch: the knitter names each slot in the preview and picks the real yarn colour per project |
| `v` | Anything above 3 is refused with "update the app" |

Ignored: `referenceImage` (a base64 PNG, ~95% of the file; never stored, it would
spend the localStorage quota `save()` needs), `groups`, `repeats`,
`glossaryIds`, `quickSymbolIds`, `exportedAt`.

An unknown stitch id blocks the import and names the stitch. Per CLAUDE.md's glossary
rule, ask the owner before adding a new stitch to `STITCHCHART_IDS` / `GLOSSARY`.

## Optional fields the exporter can add

All optional; the preview sheet asks when they're absent.

- `worked`: `"flat"` | `"round"` (default flat)
- `firstRow`: `"RS"` | `"WS"` (default RS; flat only)
- `colorNames`: `{ "#d3f3d0": "Front", "#e4d4fb": "Back" }` — pre-fills the slot names in the preview

## Notation

Cells are read as **RS-view chart symbols**, like every chart in this app: on a WS row
of a flat chart the recap translates (a knit cell reads "p"). If an exporter writes
the stitch *as worked* on each row instead, import it as "In the round", which skips
the translation, or add a field for it.

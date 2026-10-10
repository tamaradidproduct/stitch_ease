# Design direction

The visual language of the step screen v2 prototype (`docs/prototypes/step-screen-v2.html`), written down so every other screen can follow it. Requirements for the step screen itself are in `step-screen-v2-requirements.md`.

**In one line:** neutral, modern and friendly. White cards on a light grey ground, one sage-green accent, one sans-serif family, small corner radii, generous spacing.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f4f2` | Page ground |
| `--card` | `#ffffff` | Cards, bars, sheets, chart |
| `--paper` | `#f8f8f6` | Quiet fills (tally, secondary buttons) |
| `--line` | `#e4e4e0` | Hairlines, card borders |
| `--text` | `#25272a` | Primary text |
| `--soft` | `#62666b` | Secondary text |
| `--muted` | `#92969b` | Labels, counts, inactive |
| `--sage` | `#587a67` | Accent: "where you are" markers |
| `--sage-d` | `#2f4a3c` | Primary button, key figures, links |
| `--sage-w` | `#e4eee4` | Current-row highlight |
| `--blue` | `#2f63d6` | Current row number in charts only |

- **One accent.** Sage green. No orange, coral or beige anywhere.
- **Primary action:** the only solid `--sage-d` button on a screen.
- **Colour means something.** Don't decorate with it. Chart cells are one neutral unless the pattern defines yarn colours.

## Typography
- **One family, sans serif:** Figtree, falling back to the system font. No serif.
- **Weights:** 400 body, 500 instructions, 600 buttons and titles, 700 tiny caps labels.
- **Scale:**

| Role | Size |
|---|---|
| Instruction (main content) | 21–25 px, 500 |
| Section title in the bar | 16 px, 600 |
| Button label | 15–16 px, 600 |
| Body, setup text | 14–15 px |
| Counts, secondary | 13 px |
| Caps labels (`ROW 4 OF 24`, `SETUP`) | 11 px, 700, 8–12 % tracking, `--muted` |

- **Main content is plain text on the card.** No chips or pills around instructions or counts.

## Shape and space
- **Corner radius:** 12 px cards, 8–12 px buttons and controls, 16 px sheet top corners. Nothing rounder, except full circles where a thing is genuinely round.
- **Spacing:** multiples of 4; 16 px screen gutter, 20 px card padding, 12–14 px between stacked blocks.
- **Borders:** 1 px `--line` hairlines; no shadows except the sheet backdrop.
- **Full-bleed content** (charts, wide tables) runs edge to edge with no box.

## Components
- **Top bar (56 px):** 36 px square back button · project name (11 px muted) over the section name (16 px) · tally in a small bordered label · icon buttons.
- **Card:** white, 1 px border, 12 px radius. Caps label at the top, main content in the middle, **facts and checks pinned to the bottom** above a hairline.
- **Facts line:** the count is a muted label (figure in `--sage-d`); the designer's Check sits beside it with a 2 px `--sage-d` rule on its left.
- **Toggles for secondary info** (Setup): a small caps text toggle, collapsed by default; expanded text has a 2 px accent rule on its left.
- **Current row:** `--sage-w` band across the chart; in lists, a 3 px `--sage` bar on the left and larger text. Never a dashed or boxed treatment.
- **Dock:** 54 px buttons; ‹ › are white with a hairline; the main button is solid `--sage-d`. Its "undo" state is outlined.
- **Sheets:** white, 16 px top radius, title 19 px, caps section labels, two buttons max (outlined cancel, solid confirm).
- **Icon buttons:** 36 px, white with a hairline ring, `--sage-d` icon.

## Applying it to the other screens
- **Library (home):** project cards follow the card spec; progress is a thin sage bar; **New project** is the one solid button.
- **Picker:** pattern tiles as cards; Import and Update are quiet outlined buttons.
- **Playlist:** the selected row uses the current-row treatment above; rows are plain lines, not boxes; the dock is the step screen's.
- **Checklist and notes sections:** same card and top bar; ticks use `--sage-d`.
- **Glossary:** caps group labels, term in 600, definition in `--soft`; pattern-specific stitches first.
- **Account, conflict and pattern-update sheets:** the sheet spec.
- **Implemented:** tokens in `css/tokens.css`, components in `js/core/ui.js` + `css/ui.css`, step screens in `js/core/stepViews.js` + `css/step.css`. The older screens follow through the legacy-variable bridge; `CLAUDE.md` is updated to match.

# Nightly audit 2026-10-14

## Fixed autonomously
- `index.html`: removed CSS rules for classes with no consumer in `index.html` markup, `css/`, or `js/**` (generated HTML strings and inline onclicks checked): `.finished-btn` (+ `.primary`, `:active`), `.step-circle` (+ `.done`, `svg`, including the `.chart-confirm-step.done .step-circle` rules), `.rep-pass-btn` (the grouped `.step.done .rep-pass-lbl, .step.done .rep-pass-btn` rule now only names the live `.rep-pass-lbl`), `.rep-check` (+ `.done`, `svg`), `.rc-btn`, `.imp-yarn`. Safe: CSS-only deletion; the live siblings (`.finished-*`, `.rep-pass-lbl`, `.rep-row`, `.chart-confirm-step`) are untouched. Replaced by `.check` per CLAUDE.md (`checkHtml`).
- `sw.js`: CACHE bumped v87 → v88 because `index.html` is in ASSETS.

`node scripts/check.mjs` and `node scripts/check-tokens.mjs --all` pass.

## Needs your decision
- `js/cloud/sync.js` `isDirty(key)` has no callers (sync logic, so not touched). Unchanged from last audit.
- `removeCustomPattern` is only called from `patternsync.selftest.js`; no UI path removes an imported pattern. Intentional, or a missing delete button? Unchanged.
- Still-unremoved candidates: `.sp-row-tag` (`css/step.css`), `.imp-swatch`, `.lib-card-style`, `.round-hint*` and `.cc-minus/.cc-plus/.cc-rownum-r` (these also have duplicate copies in `css/components.css` and `index.html`, so the dedupe needs a human look at which copy is canonical).
- `describeStepConversion` (`js/core/convert.js`) has no callers, but docs reference it as a console tool; kept.
- `<button>` elements in generated HTML lack `type="button"`; none are in a `<form>`, so harmless. No `prompt()`/`confirm()`/`alert()` found outside the sheet helpers.

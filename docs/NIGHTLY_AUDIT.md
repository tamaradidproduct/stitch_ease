# Nightly audit 2026-10-15

## Fixed autonomously
- `index.html`, `css/components.css`, `css/step.css`: removed CSS rules for classes with no consumer in `index.html` markup, `css/`, or `js/**` (generated HTML strings, inline onclicks and dynamic class prefixes grepped): `.imp-swatch` (index.html), `.round-hint`, `.round-hint-lbl`, `.round-hint-txt`, `.round-hint.on …` (both duplicate copies, index.html and components.css) and `.sp-row-tag` (step.css). Safe: CSS-only deletion; live siblings (`.sp-row`, `.sp-row-n/-t/-c/-h/-sub`) untouched.
- `sw.js`: CACHE bumped v89 → v90 because `index.html` and the CSS files are in ASSETS.

`node scripts/check.mjs` and `node scripts/check-tokens.mjs --all` pass.

## Needs your decision
- `js/cloud/sync.js` `isDirty(key)` has no callers (sync logic, so not touched). Unchanged.
- `removeCustomPattern` is only called from `patternsync.selftest.js`; no UI path removes an imported pattern. Intentional, or a missing delete button? Unchanged.
- `.lib-card-style` is only mentioned in a CSS comment in `index.html` (no rule or consumer); `.cc-minus/.cc-plus/.cc-rownum-r` still have duplicate copies in `css/components.css` and `index.html`, so which copy is canonical needs a human look.
- `describeStepConversion` (`js/core/convert.js`) has no callers, but docs reference it as a console tool; kept.
- `<button>` elements in generated HTML mostly lack `type="button"`; none are in a `<form>`, so harmless. No `prompt()`/`confirm()`/`alert()` found outside the sheet helpers.

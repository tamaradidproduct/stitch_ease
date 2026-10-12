# Nightly audit 2026-10-12

## Fixed autonomously
- `index.html`: removed 15 CSS rules whose class appears nowhere else in the repo (checked across `index.html`, `css/`, `js/**` including generated HTML strings and inline onclicks; no dynamic class-name construction matches): `.acct-note`, `.acct-err`, `.acct-ok`, `.acct-pdf-row`, `.acct-pdf-main`, `.fam-row`, `.imp-swatch-lg`, `.yarn-dot`, `.rc-label`, `.rc-controls`, `.rc-val`, `.rc-target`, `.cc-ctrl`, `.header-badge`, `.recap-row-dot`. Safe: CSS-only deletion of selectors with no consumers; sibling classes such as `.acct-pdf-name`/`.acct-pdfs-*` are untouched.
- `sw.js`: CACHE bumped v86 → v87 because `index.html` is in ASSETS.

`node scripts/check.mjs` passes.

## Needs your decision
- `js/cloud/sync.js` `isDirty(key)` has no callers (sync logic, so not touched).
- `removeCustomPattern` (`js/core/patternImport.js`) is only called from `patternsync.selftest.js`; no UI path removes an imported pattern. Intentional, or a missing delete button?
- Candidate unused classes not removed because the rule isn't a simple single block or I wasn't certain: `.sp-row-tag` (`css/step.css`), `.imp-swatch` family and `.lib-card-style` (referenced only in a comment).
- Many `<button>` elements in generated HTML lack `type="button"`. None are inside a `<form>`, so harmless; left alone. All icon-only buttons checked have `aria-label`.
- No `prompt()`/`confirm()`/`alert()` calls found outside sheet helpers.

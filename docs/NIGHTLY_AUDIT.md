# Nightly audit 2026-10-19

## Fixed autonomously
- `index.html`: removed the `.cc-minus` / `.cc-plus` rules (+ `:active`) and the comment reference to them. No consumer: not in index.html markup, `js/**` (no dynamic `cc-` class construction found), or `css/`. CSS-only deletion.
- `sw.js`: CACHE bumped v92 → v93 because `index.html` is in ASSETS.

`node scripts/check.mjs` and `node scripts/check-tokens.mjs --all` pass.

## Needs your decision
- `js/cloud/sync.js` `isDirty(key)` still has no callers (sync logic, not touched).
- `describeStepConversion` (`js/core/convert.js`) has no callers; kept as a console tool.
- `.lib-card-style` is only mentioned in an `index.html` CSS comment (no rule or consumer).
- `removeCustomPattern` is only called from a selftest; no UI path removes an imported pattern. Intentional?
- Generated `<button>`s mostly lack `type="button"`; none are in a form, so harmless. No `prompt()`/`confirm()` outside the sheet helpers. Nothing else new found.

// Fails when a raw colour, radius or font name appears outside css/tokens.css.
// Usage: node scripts/check-tokens.mjs [--all] | --selftest
//   default: css/ui.css, css/step.css, js/core/ui.js, js/core/stepViews.js (missing files are skipped)
//   --all  : also index.html (the inline CSS the legacy screens use)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function findViolations(text) {
  const out = [];
  for (const m of text.matchAll(/(?<![&\w])#[0-9a-fA-F]{3,8}\b/g)) out.push('raw colour ' + m[0]);
  for (const m of text.matchAll(/rgba?\(/g)) out.push('raw colour ' + m[0]);
  for (const m of text.matchAll(/border-radius\s*:\s*[^;"]*\d+px/g)) out.push('raw radius ' + m[0].trim());
  for (const m of text.matchAll(/font-family\s*:\s*(?!\s*(?:var\(|inherit))[^;"]+/g)) out.push('raw font ' + m[0].trim());
  return out;
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--selftest')) {
  const cases = [
    ['hex colour', 'color: #fff;', 1],
    ['rgba', 'background: rgba(0,0,0,.4);', 1],
    ['px radius', 'border-radius: 12px;', 1],
    ['font name', 'font-family: Georgia, serif;', 1],
    ['token colour', 'color: var(--c-card);', 0],
    ['token radius', 'border-radius: var(--r-card);', 0],
    ['token font', 'font-family: var(--font-ui);', 0],
    ['inherit is not a raw font', 'font-family: inherit;', 0],
    ['50% radius is a circle, still a raw value', 'border-radius: 50%;', 0],
  ];
  let bad = 0;
  // The chart window never scrolls vertically (a full-chart view comes later).
  const stepCss = fs.readFileSync(path.join(root, 'css/step.css'), 'utf8');
  const scroller = (stepCss.match(/\.sp-cw-scroll\s*\{[^}]*\}/) || [''])[0];
  if (!/overflow-y:\s*hidden/.test(scroller)) { console.log('FAIL .sp-cw-scroll must not scroll vertically'); bad++; }
  // A stitch has two states. In the current row EVERY stitch (knit included, but not no-stitch cells) gets the
  // active background, border ring and symbol colour from the chart tokens.
  const activeRule = (stepCss.match(/\.sp-cw-row\.active \.cc:not\(\.cc-e\)\s*\{[^}]*\}/) || [''])[0];
  if (!/background:\s*var\(--ch-active-bg\)/.test(activeRule) || !/box-shadow:[^;]*--ch-active-border/.test(activeRule) || !/\.sp-cw-row\.active \.cc-sym\s*\{[^}]*--ch-active-symbol/.test(stepCss)) { console.log('FAIL the current row must colour every stitch (background, border, symbol)'); bad++; }
  // The current stitch state stays inside the one sage theme (no separate blue).
  const tok = fs.readFileSync(path.join(root, 'css/tokens.css'), 'utf8');
  for (const name of ['--ch-active-bg', '--ch-active-border', '--ch-active-symbol']) {
    const m = tok.match(new RegExp(name + '\\s*:\\s*([^;]+);'));
    if (!m || !/var\(--c-sage/.test(m[1])) { console.log('FAIL ' + name + ' must use the sage tokens'); bad++; }
  }
  if (/\.sp-cw-row\.active \.sp-cw-n\s*\{[^}]*--c-blue/.test(stepCss)) { console.log('FAIL the current row number must not be blue'); bad++; }
  // The top bar's project name must truncate, or a long name runs under the tally and buttons.
  const ui = fs.readFileSync(path.join(root, 'css/ui.css'), 'utf8');
  const proj = (ui.match(/\.ui-top-project\s*\{[^}]*\}/) || [''])[0];
  if (!/text-overflow:\s*ellipsis/.test(proj) || !/overflow:\s*hidden/.test(proj)) { console.log('FAIL .ui-top-project must truncate'); bad++; }
  for (const [name, text, want] of cases) {
    const got = findViolations(text).length;
    if (got !== want) { console.log('FAIL', name, 'got', got, 'want', want); bad++; }
  }
  console.log(bad ? `selftest: ${bad} failed` : 'selftest ok');
  process.exit(bad ? 1 : 0);
}

const files = ['css/ui.css', 'css/step.css', 'js/core/ui.js', 'js/core/stepViews.js'];
if (process.argv.includes('--all')) files.push('index.html');
let n = 0;
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');
  if (f === 'index.html') {                       // only the inline CSS; meta tags and icons carry their own colours
    const a = text.indexOf('<style>'), b = text.indexOf('</style>');
    text = text.split('\n').map((ln, i, arr) => ln).join('\n');
    const before = text.slice(0, a).split('\n').length - 1;
    text = '\n'.repeat(before) + text.slice(a, b);
  }
  text.split('\n').forEach((line, i) => {
    findViolations(line).forEach(v => { console.log(`${f}:${i + 1} ${v}`); n++; });
  });
}
console.log(n ? `${n} violation(s)` : 'tokens ok');
process.exit(n ? 1 : 0);

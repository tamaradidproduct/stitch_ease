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
  for (const m of text.matchAll(/font-family\s*:\s*(?!\s*var\()[^;"]+/g)) out.push('raw font ' + m[0].trim());
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
    ['50% radius is a circle, still a raw value', 'border-radius: 50%;', 0],
  ];
  let bad = 0;
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
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    findViolations(line).forEach(v => { console.log(`${f}:${i + 1} ${v}`); n++; });
  });
}
console.log(n ? `${n} violation(s)` : 'tokens ok');
process.exit(n ? 1 : 0);

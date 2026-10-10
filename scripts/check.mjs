// CI gate for a no-build static site: syntax, manifest, and shipped-file consistency.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const errors = [];
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name).replace(/\\/g, '/')]);

const jsFiles = walk('js').filter(f => f.endsWith('.js')).map(f => f.replace(/\\/g, '/'));
for (const f of [...jsFiles, 'sw.js']) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { errors.push(`syntax: ${f}\n${e.stderr}`); }
}

try { JSON.parse(readFileSync('manifest.json', 'utf8')); }
catch (e) { errors.push(`manifest.json: ${e.message}`); }

const shipped = jsFiles.filter(f => !f.endsWith('.selftest.js'));
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/g)].map(m => m[1]);

for (const f of shipped) {
  if (!scripts.includes(f)) errors.push(`index.html does not load ${f}`);
  if (!sw.includes(`./${f}`)) errors.push(`sw.js ASSETS missing ./${f}`);
}
for (const s of scripts.filter(s => s.startsWith('js/'))) {
  if (!existsSync(s)) errors.push(`index.html loads missing file ${s}`);
}
for (const m of sw.matchAll(/["']\.\/([^"']+)["']/g)) {
  if (!existsSync(m[1])) errors.push(`sw.js ASSETS lists missing file ${m[1]}`);
}
if (scripts.filter(s => s.startsWith('js/')).at(-1) !== 'js/core/app.js')
  errors.push('js/core/app.js must be the last script in index.html');
if (scripts.some(s => s.includes('selftest'))) errors.push('a selftest is loaded by index.html');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ok: ${shipped.length} shipped scripts, ${jsFiles.length} syntax-checked`);

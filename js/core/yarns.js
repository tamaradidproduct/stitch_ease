// ─────────────────────────────────────────────
// YARN COLOURS — the knitter's colours for an imported chart
//
// An imported chart (chartImport.js) names its colour slots in
// phase.chartYarns — [{ color, name }], e.g. Front / Back — and marks each
// cell with a slot index in phase.chartColors. `color` there is only the
// export's highlight; the real yarn is chosen per project and kept in
// `yarnColors` (state.js), saved to pt3_proj_<id>_yarns.
//
// Cells never carry a colour themselves, only var(--yarn-N). applyYarnVars()
// sets those variables once on :root, so changing a yarn repaints the chart,
// the row recap and the notes swatches with no re-render — and stays off the
// changeChartRow path entirely.
// ─────────────────────────────────────────────

const YARN_HEX = /^#[0-9a-f]{6}$/i;
let yarnVarCount = 0;

function yarnKey(phase, i) { return phase.id + ':' + i; }

function yarnColorFor(phase, i) {
  const own = yarnColors[yarnKey(phase, i)];
  if (typeof own === 'string' && YARN_HEX.test(own)) return own;
  const def = phase.chartYarns && phase.chartYarns[i] && phase.chartYarns[i].color;
  return typeof def === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(def) ? def : '#d8d2c8';
}

// <input type="color"> only accepts #rrggbb, and the export may use #rgb.
function fullHex(hex) {
  return hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
}

// Dark yarn needs a light symbol, or a purl dot on navy disappears.
function yarnSymbolColor(hex) {
  const h = fullHex(hex);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(parseInt(h.slice(1, 3), 16)) + 0.7152 * lin(parseInt(h.slice(3, 5), 16)) + 0.0722 * lin(parseInt(h.slice(5, 7), 16));
  return L < 0.3 ? '#fffefb' : '#2a2520';
}

function applyYarnVars(phase) {
  const root = document.documentElement.style;
  for (let i = 0; i < yarnVarCount; i++) { root.removeProperty(`--yarn-${i}`); root.removeProperty(`--yarn-${i}-fg`); }
  const yarns = (phase && phase.chartYarns) || [];
  yarns.forEach((y, i) => {
    const hex = yarnColorFor(phase, i);
    root.setProperty(`--yarn-${i}`, hex);
    root.setProperty(`--yarn-${i}-fg`, yarnSymbolColor(hex));
  });
  yarnVarCount = yarns.length;
}

// The chips under the chart's section name — the legend, and the way in to
// changing a colour. A legend you can tap beats a palette icon competing for
// the five slots the tool row already has.
function yarnChipsHtml(phase) {
  const yarns = phase.chartYarns;
  if (!yarns || !yarns.length) return '';
  return `<button class="yarn-chips" onclick="openYarnSheet()" aria-label="Yarn colours — tap to change">
    ${yarns.map((y, i) => `<span class="yarn-chip"><span class="yarn-dot" style="background:var(--yarn-${i})"></span>${escapeHtml(y.name)}</span>`).join('')}
  </button>`;
}

function setYarnColor(phase, i, hex) {
  const k = yarnKey(phase, i);
  if (hex) yarnColors[k] = hex; else delete yarnColors[k];
  // Written directly rather than through save(): save() enqueues a progress
  // push, and a colour is not progress.
  try { localStorage.setItem(pkey('yarns'), JSON.stringify(yarnColors)); } catch (e) {}
  applyYarnVars(phase);
}

function openYarnSheet() {
  const phase = PHASES[cur];
  if (!phase || !phase.chartYarns) return;
  const rows = phase.chartYarns.map((y, i) => `<div class="yarn-row">
      <label class="yarn-pick" style="background:var(--yarn-${i})">
        <input type="color" data-yarn="${i}" value="${fullHex(yarnColorFor(phase, i))}" aria-label="Colour for ${escapeHtml(y.name)}">
      </label>
      <div class="yarn-row-name">${escapeHtml(y.name)}</div>
      <button class="sheet-btn slim" data-reset="${i}">Reset</button>
    </div>`).join('');
  openSheet('Yarn colours', `${rows}
    <p class="sheet-sub">Tap a swatch to match your yarn. Only this project changes.</p>
    <div class="sheet-actions"><button class="sheet-btn primary" onclick="dismissSheet()">Done</button></div>`, {
    onOpen: el => {
      el.querySelectorAll('input[type=color]').forEach(inp => {
        inp.oninput = () => setYarnColor(phase, +inp.dataset.yarn, inp.value.toLowerCase());
      });
      el.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => {
        const i = +b.dataset.reset;
        setYarnColor(phase, i, null);
        el.querySelector(`input[data-yarn="${i}"]`).value = fullHex(yarnColorFor(phase, i));
      });
    }
  });
}

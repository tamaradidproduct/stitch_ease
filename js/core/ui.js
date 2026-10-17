// ─────────────────────────────────────────────
// GENERIC UI COMPONENTS — pure (props) → HTML string.
//
// Styles are in css/ui.css and use only tokens from css/tokens.css. Text props
// are escaped; props named `html` / `actions` / `chip` are trusted markup built
// by the caller. No state, no DOM access: these are testable (ui.selftest.js)
// and reusable by any screen. Docs: docs/design-direction.md
// ─────────────────────────────────────────────

const UI_CHEV_L = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15.75 19.5-7.5-7.5 7.5-7.5"/></svg>';
const UI_CHEV_R = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>';
// The flag's drawing is centred in its 24-unit box (a pole on the left made it sit off-centre inside a round or square button).
const UI_FLAG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 20.5v-17"/><path d="M6.5 3.5h11l-2 4 2 4h-11"/></svg>';
const UI_LINE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>';
const UI_CHEV_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>';

// A square icon-only button. `icon` is trusted markup; `dot` adds the "something is waiting" dot.
// `active` is the "something is set here" state (sage wash), e.g. a row that has a marker.
function uiIconButton({ icon, label, onclick, dot, active }) {
  return `<button class="ui-icon-btn${dot ? ' has-dot' : ''}${active ? ' ui-icon-btn--active' : ''}" onclick="${onclick}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon}</button>`;
}

// A small pill label with an optional leading icon. `icon` is trusted markup, `text` is escaped.
// variant: 'solid' (sage fill) or none (outlined).
function uiBadge({ text, icon, variant }) {
  return `<span class="ui-badge${variant ? ' ui-badge--' + variant : ''}">${icon || ''}${escapeHtml(text)}</span>`;
}

// A quiet tappable panel that holds a badge (or any trusted `leadHtml`) and a line of text, which is
// escaped. Wraps onto a second line when the text is long. `onclick` is developer-authored JS.
function uiNoteStrip({ leadHtml, text, onclick }) {
  return `<button class="ui-strip" onclick="${onclick}">${leadHtml || ''}${text ? `<span class="ui-strip-t">${escapeHtml(text)}</span>` : ''}</button>`;
}

// Mutually exclusive choices in equal segments; the chosen one reads as selected (aria-pressed).
// options: [{ value, label, icon? }] (value and label escaped, icon trusted). `onpick` is the name of a
// global function called with the value, which repaints the pressed state in place (see uiSegmentedPick).
function uiSegmented({ options, value, onpick }) {
  return '<div class="ui-seg" role="group">' + options.map(o =>
    `<button class="ui-seg-opt" data-value="${escapeHtml(o.value)}" aria-pressed="${o.value === value}" onclick="${onpick}('${escapeHtml(o.value)}')">${o.icon || ''}${escapeHtml(o.label)}</button>`).join('') + '</div>';
}

// A single-line text field for a sheet. Everything is escaped; `label` is the accessible name.
function uiTextInput({ id, value, placeholder, maxlength, label }) {
  return `<input class="sheet-input" id="${escapeHtml(id)}" type="text"${maxlength ? ` maxlength="${maxlength | 0}"` : ''} value="${escapeHtml(value || '')}"` +
    `${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''} aria-label="${escapeHtml(label)}">`;
}

// The chosen value of a segmented control, or null; and moving the choice without repainting.
function uiSegmentedValue(root) {
  const on = (root || document).querySelector('.ui-seg-opt[aria-pressed="true"]');
  return on ? on.dataset.value : null;
}
function uiSegmentedPick(value, root) {
  (root || document).querySelectorAll('.ui-seg-opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
}

// Small tracked-out label: ROW 4 OF 24, INSTRUCTIONS.
function uiCapsLabel(text) {
  return `<span class="ui-caps">${escapeHtml(text)}</span>`;
}

// A quiet text toggle with a body that shows only while open (Setup).
function uiToggleSection({ label, open, onclick, html }) {
  return `<div class="ui-toggle"><button class="ui-toggle-btn" onclick="${onclick}" aria-expanded="${!!open}">${escapeHtml(label)} ${open ? '▾' : '▸'}</button>` +
    (open ? `<div class="ui-toggle-body">${html}</div>` : '') + '</div>';
}

// The line at the foot of a card: the stitch count (muted label) and the designer's
// Check (accent rule). Either may be absent; with neither, nothing is rendered.
// `check` is pattern text — raw HTML by convention, already sanitised when a pattern
// arrives by sync — so it is not escaped here, like an instruction.
function uiFacts({ count, countLabel, check }) {
  const hasCount = typeof count === 'number' && isFinite(count);
  if (!hasCount && !check) return '';
  return '<div class="ui-facts">' +
    (hasCount ? `<span class="ui-count"><b>${count}</b> ${escapeHtml(countLabel || 'sts')}</span>` : '<span></span>') +
    (check ? `<span class="ui-check"><b>CHECK</b> ${check}</span>` : '') + '</div>';
}

// Back · a title block · tally · actions. The block is an optional small project line over the
// title; the title may be a button (onTitle) with a chevron (chevron), the project line its own
// button (onProject). Pass neither handler and it is plain text.
function uiTopBar({ project, title, tally, onBack, onTitle, onProject, chevron, strong, titleLabel, actions }) {
  const proj = project
    ? (onProject ? `<button class="ui-top-project ui-top-project--btn" onclick="${onProject}" aria-label="Rename project">${escapeHtml(project)}</button>` : `<span class="ui-top-project">${escapeHtml(project)}</span>`)
    : '';
  const ttl = `<span class="ui-top-title${strong ? ' ui-top-title--strong' : ''}">${escapeHtml(title)}${chevron ? ' ' + UI_CHEV_DOWN : ''}</span>`;
  const block = onTitle
    ? `<button class="ui-top-ttl" onclick="${onTitle}" aria-label="${escapeHtml(titleLabel || title)}">${proj}${ttl}</button>`
    : `<div class="ui-top-ttl">${proj}${ttl}</div>`;
  return `<header class="ui-top"><button class="ui-icon-btn" onclick="${onBack}" aria-label="Back">${UI_CHEV_L}</button>` + block +
    (tally ? `<span class="ui-top-tally">${escapeHtml(tally)}</span>` : '') + (actions || '') + '</header>';
}

// ‹ main › with an optional chip (browse chip) above the buttons.
function uiDock({ label, onclick, variant, chip, onPrev, onNext }) {
  return `<footer class="ui-dock">${chip || ''}<div class="ui-dock-in">` +
    `<button class="ui-dock-nav" onclick="${onPrev || 'spBrowse(-1)'}" aria-label="Previous row">${UI_CHEV_L}</button>` +
    `<button class="ui-dock-main${variant === 'outline' ? ' ui-dock-main--outline' : ''}" onclick="${onclick}">${escapeHtml(label)}</button>` +
    `<button class="ui-dock-nav" onclick="${onNext || 'spBrowse(1)'}" aria-label="Next row">${UI_CHEV_R}</button></div></footer>`;
}

function uiCard({ cls, html, tag, attrs }) {
  const t = tag || 'div';
  return `<${t} class="ui-card${cls ? ' ' + cls : ''}"${attrs ? ' ' + attrs : ''}>${html}</${t}>`;
}

// A small status label beside a heading or a row ("Current", "Done").
function uiTag(text, variant) {
  return `<span class="ui-tag${variant ? ' ui-tag--' + variant : ''}">${escapeHtml(text)}</span>`;
}

// A plain labelled button; the look comes from `cls`.
function uiButton({ label, onclick, cls, aria }) {
  return `<button${cls ? ` class="${cls}"` : ''} onclick="${onclick}"${aria ? ` aria-label="${escapeHtml(aria)}"` : ''}>${escapeHtml(label)}</button>`;
}

// A short buzz where the browser allows it (Android); a quiet no-op elsewhere (iOS Safari has no vibration API).
function uiHaptic(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not available */ }
}

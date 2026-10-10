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
const UI_CHEV_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>';

// A square icon-only button. `icon` is trusted markup; `dot` adds the "something is waiting" dot.
function uiIconButton({ icon, label, onclick, dot }) {
  return `<button class="ui-icon-btn${dot ? ' has-dot' : ''}" onclick="${onclick}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon}</button>`;
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

// Back · project name over section name (taps open the section menu) · tally · actions.
function uiTopBar({ project, title, tally, onBack, onTitle, actions }) {
  return `<header class="ui-top"><button class="ui-icon-btn" onclick="${onBack}" aria-label="Back">${UI_CHEV_L}</button>` +
    `<button class="ui-top-ttl" onclick="${onTitle}" aria-label="Switch section"><span class="ui-top-project">${escapeHtml(project)}</span>` +
    `<span class="ui-top-title">${escapeHtml(title)} ${UI_CHEV_DOWN}</span></button>` +
    (tally ? `<span class="ui-top-tally">${escapeHtml(tally)}</span>` : '') + (actions || '') + '</header>';
}

// ‹ main › with an optional chip (browse chip) above the buttons.
function uiDock({ label, onclick, variant, chip, onPrev, onNext }) {
  return `<footer class="ui-dock">${chip || ''}<div class="ui-dock-in">` +
    `<button class="ui-dock-nav" onclick="${onPrev || 'spBrowse(-1)'}" aria-label="Previous row">${UI_CHEV_L}</button>` +
    `<button class="ui-dock-main${variant === 'outline' ? ' ui-dock-main--outline' : ''}" onclick="${onclick}">${escapeHtml(label)}</button>` +
    `<button class="ui-dock-nav" onclick="${onNext || 'spBrowse(1)'}" aria-label="Next row">${UI_CHEV_R}</button></div></footer>`;
}

function uiCard({ cls, html }) {
  return `<div class="ui-card${cls ? ' ' + cls : ''}">${html}</div>`;
}

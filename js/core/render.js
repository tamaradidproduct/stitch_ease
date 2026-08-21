// ─────────────────────────────────────────────
// RENDER — all view builders and layout functions
// ─────────────────────────────────────────────
function phaseComplete(p) { return sectionComplete(p, progressCtx(), activeDoc); }

function renderTabs() {
  const el = document.getElementById('phase-tabs');
  if (!el) return;
  el.innerHTML = PHASES.map((p, i) => {
    let cls = 'phase-tab';
    if (i === cur) cls += ' active';
    else if (phaseComplete(p)) cls += ' complete';
    return `<button class="${cls}" onclick="go(${i})">${phaseComplete(p) && i !== cur ? '<span class="check-dot"></span>' : ''}${p.name}</button>`;
  }).join('');
  el.classList.toggle('collapsed', !phaseNavOpen);

  const btn = document.getElementById('phase-switch-btn');
  if (btn) btn.classList.toggle('open', phaseNavOpen);

  if (phaseNavOpen) {
    const tabs = el.querySelectorAll('.phase-tab');
    if (tabs[cur]) tabs[cur].scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }
}

function togglePhaseNav() {
  phaseNavOpen = !phaseNavOpen;
  renderTabs();
}

const CHECK_SVG = `<svg width="12" height="10" viewBox="0 0 11 9" fill="none">
        <path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

// Back chevron — same stroke weight/shape as the phase-switch chevron so the
// two circular icon buttons look like one family.
const BACK_CHEVRON_SVG = `<svg class="chevron" width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
        <path d="M5 1L1 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

// Down chevron — same shape as the phase-switch-btn's, reused for a
// collapsed repeat's expand control.
const DOWN_CHEVRON_SVG = `<svg class="chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

// Open-book icon (pattern notes / stitch help)
const NOTES_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 6.5C10.6 5.2 8.7 4.5 6.5 4.5c-1.2 0-2.4.2-3.5.7v13c1.1-.5 2.3-.7 3.5-.7 2.2 0 4.1.7 5.5 2 1.4-1.3 3.3-2 5.5-2 1.2 0 2.4.2 3.5.7v-13c-1.1-.5-2.3-.7-3.5-.7-2.2 0-4.1.7-5.5 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 6.5v13" stroke="currentColor" stroke-width="1.6"/>
      </svg>`;

// Original-pattern PDF — a document with a folded corner. Sits beside the
// notes book in the phase header; see js/core/pdf.js for what it opens.
const PDF_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M13.8 3.6V8.2h4.6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M8.8 13h6.4M8.8 16.2h4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;

// App logo — a ball of yarn with a knitting needle.
const LOGO_SVG = `<svg class="lib-logo" viewBox="0 0 40 40" width="34" height="34" fill="none" aria-hidden="true">
  <circle cx="18" cy="22" r="13" fill="var(--accent-light)" stroke="var(--accent)" stroke-width="1.7"/>
  <g stroke="var(--accent)" stroke-width="1.3" fill="none" stroke-linecap="round">
    <path d="M7.5 17.5 C12 12, 24 12, 29.5 19.5"/>
    <path d="M5.5 24 C12 18.5, 25 20, 30 25.5"/>
    <path d="M8.5 30 C13 26, 23 27, 28 30.5"/>
    <path d="M14.5 10 C11 17, 12 28, 16.5 34"/>
    <path d="M22.5 10.5 C19.5 17, 20.5 28, 24 33"/>
  </g>
  <line x1="24" y1="13" x2="35.5" y2="4.5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="35.5" cy="4.5" r="1.7" fill="var(--accent)"/>
</svg>`;

// Does the PDF icon need a dot? Only for 'remote-newer' — a copy sitting in the
// account that this device hasn't got, which is the one state with something to
// do that nothing else on screen would ever reveal.
//
// Deliberately not shown for 'local' (not backed up yet). That resolves itself
// on the next flush, so a badge for it would be up briefly after every attach
// and mean nothing by the time anyone looked. A dot that appears for two
// different reasons is a dot nobody reads.
function pdfWaiting() {
  const pat = activePattern();
  return !!pat && typeof pdfSyncState === 'function' && pdfSyncState(pat.id) === 'remote-newer';
}

// A note's bullets are an informational list — no counter, no checkbox of
// their own. A bulleted list that IS repeated work is a repeat block instead.
function bulletsHtml(e) {
  if (!e.bullets) return '';
  return `<ul class="step-bullets">${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
}

// ─────────────────────────────────────────────
// CONVERTED SECTIONS — entries rather than steps
//
// The only entry renderer there is. A note and a row are one tappable card; a
// repeat gets the chart dock's layout, because a repeat's position is the one
// thing the old counter could never express.
//
// isActive marks the ONE entry — the first not-yet-done one in the section —
// that gets lifted onto the "you are here" card. Done entries and ones not
// reached yet both rest flat on the page; there is exactly one active entry
// at a time, same as a repeat's own "now" row.
// ─────────────────────────────────────────────
function entryHtml(e, isActive) {
  if (e.kind === 'repeat') return repeatEntryHtml(e, isActive);
  return noteOrRowEntryHtml(e, isActive);
}

// A note and a row tick identically. They differ in what a tick MEANS — a row
// moves the Rows tally, a note does not — which is toggleEntry()'s business,
// not the markup's.
function noteOrRowEntryHtml(e, isActive) {
  const done = entryDone(e, entryProg);
  const cls = done ? 'done' : isActive ? 'active' : '';
  return `<div class="step ${cls}" onclick="toggleEntry('${e.id}')">
    <div class="step-circle">${CHECK_SVG}</div>
    <div class="step-body">
      <div class="step-text">${e.text.replace(/\n/g, '<br>')}</div>
      ${bulletsHtml(e)}
    </div>
  </div>`;
}

// A repeat block: the whole motif, with the row you are on highlighted.
//
// Showing only the current row plus a large number reads fine for "work 7
// rounds rib" and badly for a six-ring tatting motif, where you need the shape
// of the whole thing in front of you while working any one part of it. So all
// the rows stay visible; position is carried by highlighting, and the number
// is sized to be read rather than to dominate what it belongs to.
//
// Rows earlier in the CURRENT pass strike through and reset each pass, which
// is how the pre-conversion checkable bullets behaved.
function repeatEntryHtml(e, isActive) {
  const pos      = repeatPos(e, entryProg);
  const R        = repeatLength(e), T = e.times | 0;
  const total    = repeatRowCount(e);
  const done     = repeatComplete(e, pos);
  const cls      = done ? 'done' : isActive ? 'active' : '';
  const title    = (e.text || 'Repeat').replace(/\n/g, '<br>');

  // Collapsed unless it's the active entry or the knitter tapped it open to
  // check something — a preview, not a position change, so it never touches
  // entryProg. Rows/passes rather than "repeat unit" here: that label makes
  // sense once you're looking at the rows it names, not as a summary of them.
  //
  // The row count is R (rows in ONE pass), not R×T — "6 rows · 3 passes"
  // describes the shape of the motif you're about to see; "18 rows" is the
  // section's problem (the ROWS tally up top), not this block's.
  if (!isActive && !repeatExpanded[e.id]) {
    const summary = R === 1
      ? total + (total === 1 ? ' row' : ' rows')
      : R + ' rows · ' + T + (T === 1 ? ' pass' : ' passes');
    return `<div class="step repeat-step ${cls} collapsed">
      <div class="step-body">
        <div class="repeat-head" onclick="toggleRepeatExpand('${e.id}')">
          <div class="step-circle" onclick="toggleRepeatDone('${e.id}', event)">${CHECK_SVG}</div>
          <div class="repeat-head-text">
            <div class="repeat-head-title-row">
              <div class="step-text">${title}</div>
              <span class="repeat-tag">repeat</span>
            </div>
            <div class="repeat-head-sub">${summary}</div>
          </div>
          <button class="repeat-expand-btn" aria-label="Expand" tabindex="-1">${DOWN_CHEVRON_SVG}</button>
        </div>
      </div>
    </div>`;
  }

  const rows = e.rows.map((r, i) => {
    const n = i + 1;
    const rcls = done ? 'done' : n < pos.z ? 'done' : n === pos.z ? 'now' : '';
    return `<li class="rep-row ${rcls}" onclick="toggleRepeatRow('${e.id}',${n})">
      <span class="rep-check">${CHECK_SVG}</span>
      <span class="rep-n">${n}</span>
      <span class="rep-t">${r.text}</span>
    </li>`;
  }).join('');

  // A single-row repeat has no inside to be part-way through — its pass IS its
  // row, so "pass 4 of 7" next to a "row 1 of 1" would invent a distinction.
  const passLabel = done ? 'All ' + T + ' repeats worked'
    : R === 1 ? 'Repeat ' + (pos.y + 1) + ' of ' + T
    : 'Pass ' + (pos.y + 1) + ' of ' + T;

  // The active entry has nothing to collapse back to — it's what you're
  // working on. Only a manually-opened preview offers a way to close itself.
  const collapseBtn = isActive ? '' :
    `<button class="repeat-expand-btn open" onclick="toggleRepeatExpand('${e.id}')" aria-label="Collapse">${DOWN_CHEVRON_SVG}</button>`;

  return `<div class="step repeat-step ${cls}">
    <div class="step-body">
      <div class="repeat-head">
        <div class="step-circle" onclick="toggleRepeatDone('${e.id}', event)">${CHECK_SVG}</div>
        <div class="repeat-head-text">
          <div class="step-text">${title}</div>
          <div class="repeat-head-sub">repeat unit</div>
        </div>
        ${collapseBtn}
        <div class="rep-pass">
          <button class="rep-pass-btn" onclick="advanceRepeatPass('${e.id}',-1)" aria-label="Previous pass">−</button>
          <span class="rep-pass-lbl">${passLabel}</span>
          <button class="rep-pass-btn" onclick="advanceRepeatPass('${e.id}',1)" aria-label="Next pass">+</button>
        </div>
      </div>
      <ul class="rep-rows">${rows}</ul>
    </div>
  </div>`;
}

// Puts the active entry at the top of the viewport — after a fresh phase
// load, and after every progress-changing tap (toggleEntry, toggleRepeatRow,
// toggleRepeatDone, advanceRepeatPass), so the "you are here" card never
// drifts out of view as a knitter works down a section.
//
// Plain scrollIntoView({block:'start'}) isn't enough: .header and
// .phase-header both sit position:sticky on top of the scrolling content, so
// aligning the target to the scroll container's own top tucks it straight
// behind them.
//
// window.scrollTo clamps at the bottom of the page on its own: an active
// entry near the end of a section can't be pushed all the way under the
// sticky bars without scrolling past content that doesn't exist, so it just
// scrolls as far as it can and stops — "keep it at the top unless that would
// run past the end."
//
// Falls back to the very top when there's no active entry to find — a
// chart phase (which tracks its own current row separately) or a section
// that's entirely done.
//
// Forces the header visible first, via suppressHeaderHide (app.js) rather
// than just flipping the class — snapping the active step back into focus
// is exactly the moment the header should be visible, and .header
// auto-hides on scroll-down (see updateHeaderScrollState), which this
// scroll itself triggers if left alone. A plain one-time class flip isn't
// enough: the scroll listener re-evaluates on every 'scroll' event this
// programmatic scroll fires (and on the layout shift from whatever
// re-rendered before this ran), and by its own reading this IS a scroll
// down, so it would hide the header again mid-flight. The suppression flag
// sidesteps that race outright instead of trying to out-time it, and
// clears itself after the scroll (smooth or instant) has had time to settle.
//
// Clearance is the two sticky bars' own heights (offsetHeight), not
// .phase-header's getBoundingClientRect — its `top` runs a 0.25s CSS
// transition off --header-h, so a rect read straight after flipping
// header-hidden would catch it mid-transition, not at either end state.
// offsetHeight is intrinsic box height, untouched by that transition.
function scrollActiveIntoView(smooth) {
  const active = document.querySelector('#phase-content .step.active');
  const behavior = smooth ? 'smooth' : 'auto';
  if (!active) { window.scrollTo({ top: 0, behavior }); return; }
  if (typeof suppressHeaderHide !== 'undefined') suppressHeaderHide = true;
  const h = document.getElementById('header');
  if (h) h.classList.remove('header-hidden');
  const phaseHeader = document.querySelector('.phase-header');
  const clearance = (h ? h.offsetHeight : 0) + (phaseHeader ? phaseHeader.offsetHeight : 0);
  if (typeof updatePhaseHeaderOffset === 'function') updatePhaseHeaderOffset();
  const target = Math.max(0, window.scrollY + active.getBoundingClientRect().top - clearance - 8);
  window.scrollTo({ top: target, behavior });
  setTimeout(() => { if (typeof suppressHeaderHide !== 'undefined') suppressHeaderHide = false; }, smooth ? 500 : 150);
}

function renderPhase() {
  const p = PHASES[cur];
  const items = p.entries || p.steps || [];
  const totalRows = sectionRowCount(p, activeDoc);
  const doneRows = sectionRowsDone(p, progressCtx(), activeDoc);
  const showCompleted = !p.hasChart && totalRows > 0;
  // The first not-done entry, top to bottom — everything else is either
  // already worked or not reached yet, and rests flat either way.
  const active = p.entries ? items.find(e => !entryDone(e, entryProg)) : null;
  const phaseHeaderHtml = `<div class="phase-header">
    <div class="phase-head-row">
      <div class="phase-head-main">
        <div class="phase-name-row">
          <div class="phase-name">${p.name}</div>
          <button class="phase-switch-btn" id="phase-switch-btn" onclick="togglePhaseNav()" aria-label="Switch section">
            <svg class="chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="phase-desc">${p.desc}</div>
      </div>
      <div class="phase-head-tools">
        ${(activePattern() && activePattern().notes) ? `<button class="phase-folder" onclick="openNotes()" aria-label="Pattern notes" title="Pattern notes">${NOTES_SVG}</button>` : ''}
        <button class="phase-folder${pdfWaiting() ? ' has-dot' : ''}" onclick="openPatternPdf()"
                aria-label="Original pattern PDF${pdfWaiting() ? ' — a copy is waiting to download' : ''}"
                title="Original pattern PDF">${PDF_SVG}</button>
      </div>
    </div>
    <div class="phase-scroll collapsed" id="phase-tabs"></div>
  </div>`;

  let html = '';

  if (p.hasChart) {
    html += buildChartTracker(phaseHeaderHtml);
  } else {
    html += phaseHeaderHtml;
    if (showCompleted) html += `<div class="steps-row"><span class="steps-row-label">Rows</span><span class="steps-row-count"><span class="src-num">${doneRows} / ${totalRows}</span><span class="src-lbl">completed</span></span></div>`;
    if (items.length) html += '<div class="steps">' + items.map(e => entryHtml(e, e === active)).join('') + '</div>';
    // Only reachable if migrateToEntries() skipped this project because its
    // pattern is no longer in the code. Say so rather than rendering nothing.
    else if (!p.entries && !p.hasChart) html += '<div class="steps"><div class="step"><div class="step-body">' +
      '<div class="step-text">This section can\'t be shown — its pattern is no longer in this version of the app.</div>' +
      '</div></div></div>';

    html += '<div class="nav-btns">';
    if (cur > 0) html += `<button class="nav-btn" onclick="go(${cur - 1})">← Back</button>`;
    if (cur < PHASES.length - 1) html += `<button class="nav-btn primary" onclick="go(${cur + 1})">Next →</button>`;
    else html += `<button class="nav-btn primary" onclick="showFinishedScreen()">Finished! 🎉</button>`;
    html += '</div>';
  }

  document.getElementById('phase-content').innerHTML = html;
}

// ─────────────────────────────────────────────
// BOTTOM SHEET
//
// One primitive, several uses: pattern notes, and the confirm/prompt dialogs
// below. The CSS was already written for the notes sheet, so generalising it
// costs almost no new styling — and it is what lets prompt()/confirm() go.
//
// Those have to go before any sign-in flow exists: native dialogs are
// unreliable inside Chrome Custom Tabs, which is exactly where a magic link
// opened from an email app lands.
//
// opts:
//   onDismiss  called when the sheet is closed by scrim tap, ✕, or Escape —
//              i.e. the "cancel" path. Not called on programmatic close.
//   onOpen     called with the .sheet element once it is in the DOM
// ─────────────────────────────────────────────
let sheetDismissHandler = null;

function openSheet(title, bodyHtml, opts) {
  opts = opts || {};
  closeSheet(); // never stack two
  const scrim = document.createElement('div');
  scrim.className = 'sheet-scrim';
  scrim.id = 'sheet-scrim';
  scrim.onclick = e => { if (e.target === scrim) dismissSheet(); };
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="sheet-grab"></div>
      <div class="sheet-head">
        <div class="sheet-title">${escapeHtml(title)}</div>
        <button class="sheet-close" onclick="dismissSheet()" aria-label="Close">✕</button>
      </div>
      <div class="sheet-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(scrim);
  sheetDismissHandler = opts.onDismiss || null;
  document.addEventListener('keydown', sheetKeydown);
  // Force a layout flush so the transition has a start value, then set the end
  // value synchronously. requestAnimationFrame would be the usual way to do
  // this, but it does not fire while a tab is throttled or not painting — and
  // a sheet that never gets `.open` sits entirely below the fold, invisible,
  // with no way for the user to recover. Reading offsetHeight cannot be
  // deferred, so the animation degrades to an instant open at worst.
  void scrim.offsetHeight;
  scrim.classList.add('open');
  if (opts.onOpen) opts.onOpen(scrim.querySelector('.sheet'));
}

function closeSheet() {
  const s = document.getElementById('sheet-scrim');
  if (s) s.remove();
  sheetDismissHandler = null;
  document.removeEventListener('keydown', sheetKeydown);
}

// Closing via scrim / ✕ / Escape means "cancel", so the dismiss handler runs.
// closeSheet() alone is the programmatic path and stays silent — otherwise a
// confirmed action would also fire its own cancel.
function dismissSheet() {
  const fn = sheetDismissHandler;
  closeSheet();
  if (fn) fn();
}

function sheetKeydown(e) {
  if (e.key === 'Escape') dismissSheet();
}

// Notes icon → bottom sheet with the pattern's stitch help / abbreviations.
function openNotes() {
  const pat = activePattern();
  if (!pat || !pat.notes) return;
  // `sym` names a key in SYMS (the shared chart artwork) so a pattern's
  // legend can't drift from what the chart actually draws; `symbol` is a
  // raw SVG string, still supported for one-off glyphs with no chart cell.
  const rows = pat.notes.map(n => {
    const art = n.sym ? SYMS[n.sym] : n.symbol;
    return `<div class="note-row">
      <span class="note-term">${art ? `<span class="note-sym">${art}</span>` : ''}${n.term ? escapeHtml(n.term) : ''}</span>
      <span class="note-def">${escapeHtml(n.def)}</span>
    </div>`;
  }).join('');
  openSheet('Pattern notes', rows);
}
// Kept as a name: render paths call this to dismiss the sheet on navigation.
function closeNotes() { closeSheet(); }

// ── confirm() / prompt() replacements ──
//
// Both are callback-based, not blocking, so call sites that read
// `if (!confirm(...)) return;` have to move their work into onConfirm.

function sheetConfirm(o) {
  const body = `<p class="sheet-msg">${escapeHtml(o.message)}</p>
    ${o.detail ? `<p class="sheet-sub">${escapeHtml(o.detail)}</p>` : ''}
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">${escapeHtml(o.cancelLabel || 'Cancel')}</button>
      <button class="sheet-btn ${o.danger ? 'danger' : 'primary'}" id="sheet-ok">${escapeHtml(o.confirmLabel || 'OK')}</button>
    </div>`;
  openSheet(o.title, body, {
    onDismiss: o.onCancel,
    onOpen: el => {
      el.querySelector('#sheet-ok').onclick = () => { closeSheet(); o.onConfirm(); };
    }
  });
}

function sheetPrompt(o) {
  const body = `${o.message ? `<p class="sheet-msg">${escapeHtml(o.message)}</p>` : ''}
    <input class="sheet-input" id="sheet-input" type="text"
           value="${escapeHtml(o.value || '')}" aria-label="${escapeHtml(o.title)}">
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Cancel</button>
      <button class="sheet-btn primary" id="sheet-ok">${escapeHtml(o.confirmLabel || 'Save')}</button>
    </div>`;
  openSheet(o.title, body, {
    onDismiss: o.onCancel,
    onOpen: el => {
      const input = el.querySelector('#sheet-input');
      const ok = el.querySelector('#sheet-ok');
      // An empty name is the one input this can't accept, so the button says
      // so rather than the sheet silently doing nothing on submit.
      const sync = () => { ok.disabled = !input.value.trim(); };
      const submit = () => {
        const v = input.value.trim();
        if (!v) return;
        closeSheet();
        o.onSubmit(v);
      };
      input.oninput = sync;
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
      ok.onclick = submit;
      sync();
      input.focus();
      input.select();
    }
  });
}

// Context menu for resetting project progress.
function showResetMenu(e) {
  if (e.preventDefault) e.preventDefault();
  closeResetMenu(); // never stack two
  const proj = activeProject();
  const phase = PHASES[cur];
  const menu = document.createElement('div');
  menu.className = 'reset-menu';
  menu.id = 'reset-menu';
  menu.innerHTML = `
    <button class="reset-menu-item" onclick="confirmResetPhase('${proj ? proj.id : ''}', '${phase ? phase.name : ''}')">
      Reset "${phase ? escapeHtml(phase.name) : 'this section'}"
    </button>
    <button class="reset-menu-item" onclick="confirmResetPattern('${proj ? proj.id : ''}')">
      Reset all progress
    </button>
  `;
  document.body.appendChild(menu);
  const rect = e.target.getBoundingClientRect();
  const margin = 8;
  // Prefer below + right-aligned to the target, but clamp to the viewport on
  // every side — the target can sit anywhere from the far-left title to the
  // far-right menu button, and the menu must never render off-screen.
  let top = rect.bottom + 4;
  if (top + menu.offsetHeight > window.innerHeight - margin) {
    top = rect.top - menu.offsetHeight - 4;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - menu.offsetHeight - margin));

  let left = rect.right - menu.offsetWidth;
  left = Math.max(margin, Math.min(left, window.innerWidth - menu.offsetWidth - margin));

  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}

function closeResetMenu() {
  const m = document.getElementById('reset-menu');
  if (m) m.remove();
}

function confirmResetPhase(projectId, phaseName) {
  closeResetMenu();
  sheetConfirm({
    title: 'Reset section',
    message: 'Reset “' + phaseName + '”?',
    detail: 'This clears the progress for just this section.',
    confirmLabel: 'Reset section',
    danger: true,
    onConfirm: resetPhase
  });
}

function confirmResetPattern(projectId) {
  closeResetMenu();
  sheetConfirm({
    title: 'Reset all progress',
    message: 'Reset all progress?',
    detail: 'This clears every step and returns to the beginning.',
    confirmLabel: 'Reset everything',
    danger: true,
    onConfirm: resetPattern
  });
}

// Confetti fill/size are randomized per open so the celebration doesn't
// look identical every time.
const CONFETTI_COLORS = ['#4a6b5a', '#2563eb', '#e0a640', '#c96a4f', '#8a8178'];
function confettiHtml(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const w = 6 + Math.round(Math.random() * 4);
    const h = Math.round(w * 1.7);
    const dur = (2.2 + Math.random() * 1.4).toFixed(2);
    const delay = (Math.random() * 0.5).toFixed(2);
    html += `<div class="confetti-piece" style="left:${left}%; width:${w}px; height:${h}px; background:${color}; animation-duration:${dur}s; animation-delay:${delay}s;"></div>`;
  }
  return html;
}

// "Finished!" button on the last phase → full-screen celebration with a
// confetti burst, distinct from the plain step-completion checkmarks.
function showFinishedScreen() {
  closeFinishedScreen(); // never stack two
  const proj = activeProject();
  const pat = activePattern();
  const scrim = document.createElement('div');
  scrim.className = 'finished-scrim';
  scrim.id = 'finished-scrim';
  scrim.onclick = e => { if (e.target === scrim) closeFinishedScreen(); };
  scrim.innerHTML = `${confettiHtml(28)}
    <div class="finished-card" role="dialog" aria-label="Pattern finished">
      <span class="finished-icon">🎉</span>
      <div class="finished-title">${proj ? escapeHtml(proj.name) : 'Your project'} is finished!</div>
      <div class="finished-sub">Every step of ${pat ? escapeHtml(pat.name) : 'the pattern'} is complete — nice work.</div>
      <div class="finished-actions">
        <button class="finished-btn primary" onclick="closeFinishedScreen(); goHome();">Back to library</button>
        <button class="finished-btn" onclick="closeFinishedScreen()">Keep reviewing</button>
      </div>
    </div>`;
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('open'));
}
function closeFinishedScreen() {
  const s = document.getElementById('finished-scrim');
  if (s) s.remove();
}

// The project name is the only user-supplied string in the app, so it's the
// only thing that needs escaping — every site that renders it does.
// Pattern text (step text, bullets, phase names, notes, badges) is authored
// here in this file and injected raw on purpose. If patterns ever become
// user-authored or fetched from a server, every one of those sites needs
// escapeHtml() too, and the `${…id}` interpolations inside onclick attributes
// need to become delegated data-* handlers.
// Bottom-of-screen banner host, shared by the save-error, update and conflict
// banners. Created on demand, removed when it empties, so it never sits in the
// DOM intercepting taps on the nav buttons below it.
//
// This lived in a trailing inline <script> in index.html, which put it AFTER
// js/core/app.js — so anything the bootstrap wanted to show at startup threw a
// ReferenceError and took the rest of the bootstrap with it, initCloud()
// included. Nothing caught it: a device with a saved conflict would come up
// with sync silently dead. It belongs with the render code that uses it.
function bannerStack() {
  let s = document.getElementById('banner-stack');
  if (!s) { s = document.createElement('div'); s.id = 'banner-stack'; document.body.appendChild(s); }
  return s;
}

function pruneBannerStack() {
  const s = document.getElementById('banner-stack');
  if (s && !s.children.length) s.remove();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function render() {
  closeNotes(); // navigation/re-render dismisses the notes sheet
  closeFinishedScreen();
  // The chip belongs to the open project, so every render decides afresh
  // whether it should be up — including the renders that navigate away.
  showPatternChip();
  if (view === 'home')   { renderHome();   requestAnimationFrame(updatePhaseHeaderOffset); return; }
  if (view === 'picker') { renderPicker(); requestAnimationFrame(updatePhaseHeaderOffset); return; }
  renderProject();
  requestAnimationFrame(() => {
    updatePhaseHeaderOffset();
    updateHeaderScrollState();
  });
}

function leaveChartMode() {
  document.body.classList.remove('chart-page');
  const dock = document.getElementById('chart-dock'); if (dock) dock.innerHTML = '';
}

function renderProject() {
  renderHeader();
  renderPhase();
  renderTabs();
  renderGlobalRows();

  // NB: coerce to a real boolean — classList.toggle(cls, undefined) *flips*
  // the class (WebIDL treats explicit undefined as "no force arg"), which made
  // every step toggle flip chart-page on/off on non-chart screens.
  const isChart = !!PHASES[cur].hasChart;
  document.body.classList.toggle('chart-page', isChart);

  if (isChart) {
    renderChartDock();
    requestAnimationFrame(() => requestAnimationFrame(syncChartLayout));
  } else {
    document.getElementById('chart-dock').innerHTML = '';
  }
}

// Home = the user's projects (instances of patterns) + a New project button.
function renderHome() {
  leaveChartMode();
  renderHeader();

  let html = '<div class="lib-list">';
  const live = liveProjects();   // tombstones are registry bookkeeping, never shown
  if (!live.length) {
    html += `<div class="home-empty">No projects yet.<br>Tap ＋ to start one.</div>`;
  } else {
    html += live.map(proj => {
      const pr = projectProgress(proj);
      const pat = patternById(proj.patternId);
      const meta = pat ? [pat.badge, pat.desc].filter(Boolean).join(' · ') : '';
      return `<div class="lib-card proj-card" onclick="openProject('${proj.id}')">
        <div class="lib-card-top">
          <span class="lib-card-name">${escapeHtml(proj.name)}</span>
          <span class="lib-card-pct">${pr.pct}%</span>
        </div>
        <div class="lib-card-meta">${meta}</div>
        <div class="lib-card-track"><div class="lib-card-fill" style="width:${pr.pct}%"></div></div>
        <div class="lib-card-bottom">
          <span class="lib-card-sub">${pr.done} of ${pr.total} steps done</span>
          <span class="proj-actions">
            <button class="proj-act" onclick="renameProject('${proj.id}', event)">Rename</button>
            <button class="proj-act proj-del" onclick="deleteProject('${proj.id}', event)">Delete</button>
          </span>
        </div>
      </div>`;
    }).join('');
  }
  html += '</div>';
  html += `<button class="fab-new" onclick="startNewProject()" aria-label="New project" title="New project">+</button>`;
  document.getElementById('phase-content').innerHTML = html;
}

// Picker = choose a pattern to start a new project from.
function renderPicker() {
  leaveChartMode();
  renderHeader();
  const cards = PATTERNS.map(p => `<div class="lib-card proj-card" onclick="choosePattern('${p.id}')">
      <div class="lib-card-top"><span class="lib-card-name">${p.name}</span></div>
      <div class="lib-card-meta">${[p.badge, p.desc].filter(Boolean).join(' · ')}</div>
    </div>`).join('');
  document.getElementById('phase-content').innerHTML =
    `<div class="picker-hint">Choose a pattern for your new project</div><div class="lib-list">${cards}</div>
    <button class="picker-import-btn" onclick="triggerImportPattern()">Import pattern (CSV)</button>
    <input type="file" id="pattern-csv-input" accept=".csv,text/csv" style="display:none"
           onchange="handlePatternCsvFile(this)">`;
}

// Build the header for the current view. Only rebuilds when the view/project
// actually changes — otherwise the dynamic bits (row count) are updated in
// place by renderGlobalRows(), so checking off a step doesn't tear down and
// relayout the header (which caused the content to jump).
function renderHeader() {
  const h = document.getElementById('header');
  if (!h) return;
  // The account button lives in this header, so its state belongs in the
  // memo key — otherwise signing in or out would leave a stale button until
  // some unrelated navigation happened to rebuild the header.
  const key = (view === 'project' ? 'proj:' + activeProjectId : view) +
              '|' + (typeof cloudState === 'function' ? cloudState() : '');
  if (h.dataset.key === key) return;
  h.dataset.key = key;
  if (view === 'home') {
    h.innerHTML = `<div class="header-top lib-brand">${LOGO_SVG}<h1><span>Pattern</span> library</h1>` +
      (typeof accountButtonHtml === 'function' ? accountButtonHtml() : '') + `</div>`;
    return;
  }
  if (view === 'picker') {
    h.innerHTML = `<div class="header-top"><h1 class="pattern-h1"><button class="lib-back" onclick="goHome()" aria-label="Back">${BACK_CHEVRON_SVG}</button>New project</h1></div>`;
    return;
  }
  const proj = activeProject();
  const pat = activePattern();
  h.innerHTML = `<div class="header-top proj-head">
      <button class="lib-back" onclick="goHome()" aria-label="Back to projects">${BACK_CHEVRON_SVG}</button>
      <div class="proj-heading">
        <div class="proj-title" onclick="renameProject('${proj ? proj.id : ''}')" oncontextmenu="showResetMenu(event)" title="Tap to rename, right-click to reset">${proj ? escapeHtml(proj.name) : ''}</div>
        ${pat && pat.badge ? `<div class="proj-sub">${pat.badge}</div>` : ''}
      </div>
      <div class="proj-progress" title="Rows completed / total">
        <div class="pp-pct" id="prog-rows">0</div>
        <div class="pp-label">rows</div>
      </div>
      <button class="proj-menu-btn" onclick="showResetMenu(event)" aria-label="Options" title="Reset progress">⋮</button>
    </div>`;
}
// Force the header to rebuild on next render (e.g. after a project rename,
// where the view/project key is unchanged but the title text changed).
function resetHeaderKey() { const h = document.getElementById('header'); if (h) h.dataset.key = ''; }


// ─────────────────────────────────────────────
// PATTERN-UPDATED CHIP
//
// Non-blocking by design. The project keeps knitting the structure it started
// on; this only says a newer version exists. It appears while a changed
// project is open and goes away when the project is closed or the update is
// taken — there is nothing to answer from the library screen, where no
// particular project is in hand.
// ─────────────────────────────────────────────
function showPatternChip() {
  if (view !== 'project' || !patternChanged) return hidePatternChip();
  if (document.getElementById('pattern-chip')) return;
  const b = document.createElement('div');
  b.id = 'pattern-chip';
  b.innerHTML = '<span>Pattern updated</span><button onclick="openPatternUpdateSheet()">Review</button>';
  bannerStack().appendChild(b);
}

function hidePatternChip() {
  const b = document.getElementById('pattern-chip');
  if (b) { b.remove(); pruneBannerStack(); }
}

function openPatternUpdateSheet() {
  const id = activeProjectId;
  const sum = patternChangeSummary(id);
  if (!sum) return;

  // The counts come first because they are the decision. "3 new steps, 1
  // removed, 24 of your 27 ticks kept" is answerable; "the pattern changed"
  // is not.
  const bits = [];
  if (sum.added)   bits.push(sum.added + (sum.added === 1 ? ' new step' : ' new steps'));
  if (sum.removed) bits.push(sum.removed + (sum.removed === 1 ? ' step removed' : ' steps removed'));
  const changeLine = bits.length ? bits.join(', ') : 'Some steps changed';

  const kept = sum.ticks
    ? sum.kept + ' of your ' + sum.ticks + (sum.ticks === 1 ? ' tick is kept' : ' ticks are kept')
    : 'You haven’t ticked anything yet';

  // Only mention losses when there are some. A reassurance that nothing is
  // lost reads as a warning when it is the only thing in the box.
  const lost = sum.ticks - sum.kept;
  const lostNote = lost > 0
    ? `<p class="acct-err">${lost === 1 ? 'One tick belongs to a step that no longer exists'
        : lost + ' ticks belong to steps that no longer exist'} — they stay saved, and come back if the step does.</p>`
    : '';

  openSheet('Pattern updated', `
    <p class="sheet-msg">A newer version of this pattern is available.</p>
    <div class="pu-facts">
      <div class="pu-line">${escapeHtml(changeLine)}</div>
      <div class="pu-line">${escapeHtml(kept)}</div>
    </div>
    ${lostNote}
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Not now</button>
      <button class="sheet-btn primary" id="pu-adopt">Use the new version</button>
    </div>
    <p class="acct-note">Until you take it, this project keeps the version you started on. Nothing is deleted either way.</p>`,
    {
      onOpen: el => {
        el.querySelector('#pu-adopt').onclick = () => {
          if (!adoptPattern(id)) return;
          closeSheet();
          activateProject(id);   // re-open on the new structure
          hidePatternChip();
          render();
        };
      }
    });
}

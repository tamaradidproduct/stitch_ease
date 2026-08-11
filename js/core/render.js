// ─────────────────────────────────────────────
// RENDER — all view builders and layout functions
// ─────────────────────────────────────────────
function phaseComplete(p) { return p.steps.every(s => state[s.id]); }

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

// Open-book icon (pattern notes / stitch help)
const NOTES_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 6.5C10.6 5.2 8.7 4.5 6.5 4.5c-1.2 0-2.4.2-3.5.7v13c1.1-.5 2.3-.7 3.5-.7 2.2 0 4.1.7 5.5 2 1.4-1.3 3.3-2 5.5-2 1.2 0 2.4.2 3.5.7v-13c-1.1-.5-2.3-.7-3.5-.7-2.2 0-4.1.7-5.5 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M12 6.5v13" stroke="currentColor" stroke-width="1.6"/>
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

// For stepped-cadence rows (e.g. "increase every 2nd round"), show what to do
// on the round the tracker says you're currently working.
function cadenceHintHtml(s, ctr, done) {
  if (!s.cadence || done || ctr >= s.target) return '';
  const round = ctr + 1;               // the round you're about to work
  const isOn  = round % s.cadence === 0;
  return `<div class="round-hint ${isOn ? 'on' : ''}">
    <span class="round-hint-lbl">Round ${round} of ${s.target}</span>
    <span class="round-hint-txt">${isOn ? s.cadenceOn : s.cadenceOff}</span>
  </div>`;
}

// Bullets on a step with a repeat counter (`rows`) are individually
// checkable: ticking every bullet for one pass auto-advances the counter and
// resets them, ready for the next pass (see toggleSubStep() in app.js).
// Bullets without a counter are just an informational list (one-off steps).
function bulletsHtml(s) {
  if (!s.bullets) return '';
  if (!s.rows) return `<ul class="step-bullets">${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
  const items = s.bullets.map((b, i) => {
    const bd = !!state[s.id + '__b' + i];
    return `<li class="${bd ? 'done' : ''}" onclick="event.stopPropagation(); toggleSubStep('${s.id}', ${i})">
      <span class="sub-check">${bd ? CHECK_SVG : ''}</span>
      <span class="sub-text">${b}</span>
    </li>`;
  }).join('');
  return `<ul class="step-bullets checkable">${items}</ul>`;
}

function stepHtml(s) {
  const done = state[s.id];
  const ctr  = s.rows ? (ctrs[s.id] || 0) : 0;
  const pct  = s.rows ? Math.round(Math.min(100, ctr / s.target * 100)) : 0;
  // Cadence steps count the round you're working (1-based: round 1..N, no
  // "round 0"); plain row counters show completed rounds.
  const rcVal = s.cadence ? Math.min(ctr + 1, s.target) : ctr;
  return `<div class="step ${done ? 'done' : ''}" onclick="toggleStep('${s.id}')">
    <div class="step-circle">${CHECK_SVG}</div>
    <div class="step-body">
      <div class="step-text">${s.text.replace(/\n/g, '<br>')}</div>
      ${bulletsHtml(s)}
      ${cadenceHintHtml(s, ctr, done)}
      ${s.rows ? `
      <div class="row-counter" onclick="event.stopPropagation()">
        <span class="rc-label">${s.lbl}</span>
        <div class="rc-controls">
          <button class="rc-btn" onclick="changeCount('${s.id}',-1)">−</button>
          <span class="rc-val">${rcVal}</span>
          <span class="rc-target">/ ${s.target}</span>
          <button class="rc-btn" onclick="changeCount('${s.id}',1)">+</button>
        </div>
      </div>
      <div class="rc-mini-bar"><div class="rc-mini-fill" style="width:${pct}%"></div></div>` : ''}
    </div>
  </div>`;
}

function renderPhase() {
  const p = PHASES[cur];
  const totalSteps = p.steps.length;
  const doneSteps  = p.steps.filter(s => state[s.id]).length;
  const showCompleted = !p.hasChart && totalSteps > 0;
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
      ${(activePattern() && activePattern().notes) ? `<button class="phase-folder" onclick="openNotes()" aria-label="Pattern notes" title="Pattern notes">${NOTES_SVG}</button>` : ''}
    </div>
    <div class="phase-scroll collapsed" id="phase-tabs"></div>
  </div>`;

  let html = '';

  if (p.hasChart) {
    html += buildChartTracker(phaseHeaderHtml);
  } else {
    html += phaseHeaderHtml;
    if (showCompleted) html += `<div class="steps-row"><span class="steps-row-label">Steps</span><span class="steps-row-count"><span class="src-num">${doneSteps} / ${totalSteps}</span><span class="src-lbl">completed</span></span></div>`;
    if (p.steps.length) html += '<div class="steps">' + p.steps.map(stepHtml).join('') + '</div>';

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
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function render() {
  closeNotes(); // navigation/re-render dismisses the notes sheet
  closeFinishedScreen();
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
            <button class="proj-act" onclick="event.stopPropagation();renameProject('${proj.id}')">Rename</button>
            <button class="proj-act proj-del" onclick="event.stopPropagation();deleteProject('${proj.id}')">Delete</button>
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
    `<div class="picker-hint">Choose a pattern for your new project</div><div class="lib-list">${cards}</div>`;
}

// Build the header for the current view. Only rebuilds when the view/project
// actually changes — otherwise the dynamic bits (row count) are updated in
// place by renderGlobalRows(), so checking off a step doesn't tear down and
// relayout the header (which caused the content to jump).
function renderHeader() {
  const h = document.getElementById('header');
  if (!h) return;
  const key = view === 'project' ? 'proj:' + activeProjectId : view;
  if (h.dataset.key === key) return;
  h.dataset.key = key;
  if (view === 'home') {
    h.innerHTML = `<div class="header-top lib-brand">${LOGO_SVG}<h1><span>Pattern</span> library</h1></div>`;
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


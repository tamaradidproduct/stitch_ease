// ─────────────────────────────────────────────
// NAV & APP — navigation, SW, and bootstrap
// ─────────────────────────────────────────────
function openProject(id) {
  if (!activateProject(id)) return;
  view = 'project';
  window.scrollTo(0, 0);
  render();
}

function goHome() {
  save();
  flushNow('goHome');   // a natural pause — the knitter has put the project down
  view = 'home';
  phaseNavOpen = false;
  window.scrollTo(0, 0);
  render();
}

function startNewProject() {
  view = 'picker';
  window.scrollTo(0, 0);
  render();
}

function choosePattern(patternId) {
  const proj = createProject(patternId);
  if (proj) openProject(proj.id);
}

// Header/content/dock are plain flex items on the chart page (see
// body.chart-page CSS), so the content area's size is handled entirely by
// flexbox — no measuring or manual positioning needed. This just re-centres
// the current row, kept as its own function since layout-affecting events
// (header show/hide, resize) need to re-run the recenter after the browser
// has settled the new flex sizes.
function syncChartLayout() {
  if (!document.body.classList.contains('chart-page')) return;
  scrollChartToCurrent('auto');
}

function go(i) {
  cur = i; stampClock('cur'); phaseNavOpen = false;
  syncActiveChart(); // phases can have different charts — repoint before render
  save(); render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleStep(id) {
  const nowDone = !state[id];
  state[id] = nowDone;
  stampClock('s:' + id);
  save(); render();
}

// ── Converted sections (entries) ──
//
// The entry equivalents of toggleStep/changeCount. They write entryProg, which
// is local-only until the sync column lands: the entry keys are deliberately
// NOT clocked, since a clock for a field readLocalProgress() cannot see would
// read to the merge engine as an edit with no value. `global_rows` IS stamped,
// because that field is synced and does move.
function findEntry(id) {
  for (const ph of PHASES) {
    for (const e of (ph.entries || [])) if (e.id === id) return e;
  }
  return null;
}

function toggleEntry(id) {
  const e = findEntry(id);
  if (!e || e.kind === 'repeat') return;
  const key = e.kind === 'note' ? noteKey(id) : rowKey(id);
  entryProg[key] = !entryProg[key];
  save(); render();
}

function advanceEntry(id, delta) {
  const e = findEntry(id);
  if (!e || e.kind !== 'repeat') return;
  const prev = repeatPos(e, entryProg);
  const next = advanceRepeat(e, prev, delta);
  const moved = repeatRowsDone(e, next) - repeatRowsDone(e, prev);
  // A tap that hit either end moved nothing — same rule as changeCount():
  // stamping it would claim an edit this device never made.
  if (!moved) return;
  entryProg[repeatKey(id)] = next;
  save(); render(); renderGlobalRows();
}

// A step's bullets (when it also has a repeat counter) are individually
// checkable sub-steps: completing every bullet for the current pass advances
// the counter by one, instead of requiring a separate tap on the +/-
// counter. Every pass but the last resets the bullets for the next repeat;
// the last one is left checked (changeCount() marks the whole step done
// once the target is reached, so there's nothing left to reset for).
function toggleSubStep(stepId, idx) {
  const step = PHASES.flatMap(p => p.steps || []).find(s => s.id === stepId);
  if (!step || !step.bullets) return;
  const key = stepId + '__b' + idx;
  state[key] = !state[key];
  stampClock('s:' + key);
  const allDone = step.bullets.every((_, i) => state[stepId + '__b' + i]);
  if (allDone) {
    const isLastRepeat = (ctrs[stepId] || 0) + 1 >= step.target;
    if (!isLastRepeat) {
      step.bullets.forEach((_, i) => { state[stepId + '__b' + i] = false; stampClock('s:' + stepId + '__b' + i); });
    }
    changeCount(stepId, 1); // saves + renders
  } else {
    save(); render();
  }
}

function changeCount(id, delta) {
  const step = PHASES.flatMap(p => p.steps || []).find(s => s.id === id);
  const max  = step ? step.target : 999;
  const prev = ctrs[id] || 0;
  ctrs[id]   = Math.max(0, Math.min(max, prev + delta));
  // A tap that hit the min/max moved nothing — stamping it would claim an edit
  // this device never made, and lose a real one from the other device.
  if (ctrs[id] !== prev) {
    stampClock('c:' + id);
    // Repeat-unit steps (bullets + counter, see toggleSubStep()) have no
    // independent checkbox of their own — the counter reaching its target
    // IS "done", and backing off below it reopens the step, so state[id]
    // always mirrors the counter rather than being toggled separately.
    if (step && step.bullets) {
      const nowDone = ctrs[id] >= step.target;
      if (state[id] !== nowDone) { state[id] = nowDone; stampClock('s:' + id); }
    }
  }
  save(); render(); renderGlobalRows();
}

// ── The Rows tally, derived ──
//
// Both halves are computed from the project's actual progress. Nothing stores
// either number as a source of truth, so neither can drift: the old tally was
// a running sum of deltas that five mutators nudged, with no referent to
// reconstruct it from, and a reset or a missed clamp left it permanently
// wrong.
//
// activeDoc, not activePattern(): a frozen project must count the pattern it
// is actually knitting, not the one in the code.
function patternTotalRows() { return patternRowTotal(activeDoc); }

// The context every shape of progress lives in — converted entries, the
// chart's position, and the legacy buckets a frozen project still uses.
function progressCtx() {
  return { entries: entryProg, chartRows: chartRows, state: state, ctrs: ctrs };
}

function globalRowsNow() { return patternRowsDone(activeDoc, progressCtx()); }

// Global, project-wide row tally — read-only display, recomputed on every
// paint rather than remembered.
function renderGlobalRows() {
  const el = document.getElementById('prog-rows');
  if (el) el.textContent = globalRowsNow() + ' / ' + patternTotalRows();
}

// ── Service worker + update prompt ──
function showUpdateBanner(worker) {
  if (document.getElementById('update-banner')) return; // already shown
  const b = document.createElement('div');
  b.id = 'update-banner';
  b.innerHTML = '<span>Update available</span><button onclick="applyUpdate()">Update now</button>';
  bannerStack().appendChild(b);
  window._waitingSW = worker;
}

function applyUpdate() {
  const b = document.getElementById('update-banner');
  if (b) b.querySelector('button').textContent = 'Installing…';
  if (window._waitingSW) window._waitingSW.postMessage({ type: 'SKIP_WAITING' });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    // A new SW may already be waiting (e.g. user had tab open when update deployed)
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(reg.waiting);
    }
    // Or it installs fresh now
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(sw);
        }
      });
    });
  }).catch(() => {});

  // Once skipWaiting fires, the controller changes — reload to get fresh files
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Not while a magic-link code is being exchanged. The code is single-use,
    // so reloading here re-submits a spent one: sign-in fails silently, and
    // only when an SW update happened to be queued at that moment.
    if (typeof authCodeInFlight === 'function' && authCodeInFlight()) {
      console.info('[cloud] deferring SW reload — auth code in flight');
      return;
    }
    window.location.reload();
  });
}
// Re-fit the chart between the fixed bars when the viewport changes (rotation,
// toolbar show/hide, etc.).
function onViewportChange() {
  if (PHASES[cur] && PHASES[cur].hasChart) {
    requestAnimationFrame(() => requestAnimationFrame(syncChartLayout));
  }
}
window.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', onViewportChange);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportChange);

// Header auto-hide by scroll direction: hide on scroll down, reveal on scroll
// up. Non-chart pages only — the chart page's header/dock are always visible.
//
// `scrollAnchor` is the scroll position where the header last changed state,
// not just the previous frame's position — toggling only once net movement
// since that anchor clears the threshold. Diffing frame-to-frame instead
// would flip-flop on the small alternating deltas that momentum/inertial
// scroll settling produces (a real device effect, easily seen when driving
// scrollTop programmatically in tests).
let lastScrollY = window.scrollY;
let scrollAnchor = window.scrollY;
let scrollTicking = false;
const SCROLL_HIDE_THRESHOLD = 24; // net movement required before toggling
const SCROLL_HIDE_MIN_Y = 40;     // always show header near the top

function updatePhaseHeaderOffset() {
  const h = document.getElementById('header');
  if (!h) return;
  const hidden = h.classList.contains('header-hidden');
  document.documentElement.style.setProperty('--header-h', hidden ? '0px' : h.offsetHeight + 'px');
}

function updateHeaderScrollState() {
  scrollTicking = false;
  const h = document.getElementById('header');
  if (!h) return;
  // The chart page's header is always visible — never let it hide, even if a
  // stray scroll event fires during a phase-transition race.
  if (document.body.classList.contains('chart-page')) {
    h.classList.remove('header-hidden');
    updatePhaseHeaderOffset();
    return;
  }
  const y = window.scrollY;
  const delta = y - scrollAnchor;
  if (y <= SCROLL_HIDE_MIN_Y) {
    h.classList.remove('header-hidden');
    scrollAnchor = y;
  } else if (delta > SCROLL_HIDE_THRESHOLD) {
    h.classList.add('header-hidden');
    scrollAnchor = y;
  } else if (delta < -SCROLL_HIDE_THRESHOLD) {
    h.classList.remove('header-hidden');
    scrollAnchor = y;
  }
  lastScrollY = y;
  updatePhaseHeaderOffset();
}
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(() => updateHeaderScrollState());
  }
}, { passive: true });
window.addEventListener('resize', updatePhaseHeaderOffset);

// ─────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────
migrateLegacy();
migrateToProjects();
migrateAddClocks();
migrateAddPatternHash();
loadGlobal();
loadOutbox();
loadSyncStatus();
loadCursor();
loadConflicts();
loadProjects();
view = 'home';
render();

// A clash recorded before the app was last closed is still unanswered. Re-ask
// after the first paint, not before — it needs the projects loaded to name
// what disagreed, and nothing may delay the app appearing.
showConflictBanner();

// Cloud comes up AFTER the first paint, and nothing above it awaits. The app
// has to work with no network, no session, and no vendor file.
initCloud();

// ─────────────────────────────────────────────
// CLOUD CLIENT + SESSION
//
// Creates the Supabase client and keeps a synchronously-readable `session`.
// No sign-in UI yet, no reads, no writes — this file only establishes that the
// app can hold a session without any of its existing behaviour changing.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: cloud is additive. If supabase-js fails
// to load, or the project is unreachable, or the user never signs in, the app
// must behave exactly as it did before any of this existed. Every entry point
// below starts with a guard for that reason.
// ─────────────────────────────────────────────

const SUPABASE_URL = 'https://dozzilmrtjhinoactcve.supabase.co';

// Publishable key. This is MEANT to be public — it ships in the page and
// identifies the project, nothing more. Row-level security is what actually
// protects the data (see supabase/migrations/, and the proof recorded in
// docs/phase-3-supabase.md). If this key ever looks like a secret to someone,
// the answer is to re-read the RLS policies, not to hide the key.
const SUPABASE_KEY = 'sb_publishable_lkuwub01I9sQiQprT_3NuQ_rIOnE27E';

// The client, or null when supabase-js did not load. Null is a supported
// state, not an error state.
let sb = null;

// Read synchronously by everything else. NEVER call supabase.auth.getSession()
// on a render path — it is async, and render() must never await anything.
// This is populated by onAuthStateChange, which fires once on init with the
// restored session and again on every change.
let session = null;

// Distinguishes "signed out" from "signed in but the network is gone", which
// the account UI needs to word differently: the second is "will sync when
// you're back", not "signed out".
function cloudState() {
  if (!sb) return 'unavailable';               // vendor file missing / failed to parse
  if (!session) return 'signed-out';
  if (!navigator.onLine) return 'offline';
  return 'signed-in';
}

function currentUserId() { return (session && session.user && session.user.id) || null; }

// Called from the bootstrap AFTER render(), never before. Sync must never be
// on the render path: the app has to paint from localStorage whether or not
// the network, the vendor file, or the project exist.
function initCloud() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.info('[cloud] supabase-js not loaded — cloud features off, app unaffected');
    return;
  }
  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        // Keep the session under our own prefix, like every other key we own.
        storageKey: 'pt3_sb_auth',
        persistSession: true,
        autoRefreshToken: true,
        // Magic links and OAuth return with ?code=; this consumes it and
        // strips it from the URL via replaceState.
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  } catch (e) {
    console.error('[cloud] createClient failed — cloud features off', e);
    sb = null;
    return;
  }

  // Fires immediately with the restored session (or null), then on every
  // change. This is what keeps `session` readable synchronously everywhere
  // else, so no render path ever has to await.
  sb.auth.onAuthStateChange((event, s) => {
    const was = cloudState();
    session = s;
    console.info('[cloud] auth:', event, '→', cloudState());
    // The header carries the account button, so it has to rebuild when the
    // state behind it changes — including the first fire, which is what turns
    // a restored session into a signed-in button on load.
    if (cloudState() !== was || event === 'INITIAL_SESSION') {
      resetHeaderKey();
      render();
    }
  });

  // Coming back online doesn't fire an auth event, but it does change what the
  // button should say ("offline" → "signed in").
  window.addEventListener('online',  refreshAccountButton);
  window.addEventListener('offline', refreshAccountButton);
}

// ─────────────────────────────────────────────
// ACCOUNT SHEET
//
// The only sign-in surface. Four states, and the wording matters in each: a
// signed-in device with no network has NOT lost anything, so it must not be
// told it is signed out, and a device that never signed in must not be nagged
// — the app is fully usable without an account and always will be.
// ─────────────────────────────────────────────

// Small helper: initial for the avatar, from the email.
function acctInitial() {
  const e = session && session.user && session.user.email;
  return e ? e.trim()[0].toUpperCase() : '?';
}

// Header button. Its appearance IS the sync status — there is no separate
// indicator competing with the app title.
function accountButtonHtml() {
  const st = cloudState();
  if (st === 'unavailable') return '';       // nothing to offer; don't show a dead control
  const cls = st === 'signed-in' ? 'acct-btn in'
            : st === 'offline'   ? 'acct-btn off'
            : 'acct-btn';
  const label = st === 'signed-out' ? 'Sign in' : 'Account (' + st + ')';
  const face = st === 'signed-out'
    ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.7"/>
         <path d="M4.8 20c0-3.6 3.2-5.6 7.2-5.6s7.2 2 7.2 5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
       </svg>`
    : acctInitial();
  return `<button class="${cls}" onclick="openAccountSheet()" aria-label="${label}" title="${label}">${face}</button>`;
}

// Rebuild just the header when the account state changed without a navigation.
function refreshAccountButton() {
  if (typeof resetHeaderKey !== 'function') return;
  resetHeaderKey();
  renderHeader();
}

function openAccountSheet(msg) {
  const st = cloudState();
  let body;

  if (st === 'unavailable') {
    body = `<p class="sheet-msg">Sync isn’t available on this device.</p>
      <p class="acct-note">The app works normally — your projects are saved here as always.
      This usually means part of the app didn’t finish downloading; reopening it later should fix it.</p>`;
    openSheet('Account', body);
    return;
  }

  if (st === 'signed-out') {
    body = `<p class="sheet-msg">Sign in to keep your projects on all your devices.</p>
      <p class="acct-sub sheet-sub">We’ll email you a link — no password to remember.</p>
      <input class="sheet-input" id="acct-email" type="email" inputmode="email"
             autocomplete="email" placeholder="you@example.com" aria-label="Email address">
      <div class="sheet-actions">
        <button class="sheet-btn" onclick="dismissSheet()">Not now</button>
        <button class="sheet-btn primary" id="acct-send">Email me a link</button>
      </div>
      ${msg ? msgHtml(msg) : ''}
      <p class="acct-note">Your projects stay on this device either way. Signing in only adds a copy in the cloud.</p>`;
    openSheet('Account', body, {
      onOpen: el => {
        const input = el.querySelector('#acct-email');
        const send  = el.querySelector('#acct-send');
        const ok    = () => /\S+@\S+\.\S+/.test(input.value.trim());
        const sync  = () => { send.disabled = !ok(); };
        const go    = () => { if (ok()) sendMagicLink(input.value.trim()); };
        input.oninput = sync;
        input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
        send.onclick = go;
        sync();
        input.focus();
      }
    });
    return;
  }

  // signed-in / offline
  const email = (session.user && session.user.email) || 'Signed in';
  body = `<div class="acct-row">
      <div class="acct-avatar">${acctInitial()}</div>
      <div>
        <div class="acct-email">${escapeHtml(email)}</div>
        <div class="acct-status">${st === 'offline'
          ? 'Offline — your work will sync when you’re back'
          : 'Signed in'}</div>
      </div>
    </div>
    ${msg ? msgHtml(msg) : ''}
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Done</button>
      <button class="sheet-btn" id="acct-signout">Sign out</button>
    </div>
    <p class="acct-note">Signing out leaves your projects on this device. Nothing is deleted.</p>`;
  openSheet('Account', body, {
    onOpen: el => { el.querySelector('#acct-signout').onclick = signOut; }
  });
}

function msgHtml(m) {
  return `<p class="${m.ok ? 'acct-ok' : 'acct-err'}">${escapeHtml(m.text)}</p>`;
}

// ── Actions ──
//
// Both re-open the sheet with a result rather than closing it silently, so the
// user always sees what happened.

async function sendMagicLink(email) {
  if (!sb) return;
  const btn = document.getElementById('acct-send');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const { error } = await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: location.href.split('?')[0].split('#')[0] }
    });
    if (error) throw error;
    openAccountSheet({ ok: true, text: 'Check ' + email + ' for a sign-in link. You can close this and come back.' });
  } catch (e) {
    console.error('[cloud] magic link failed', e);
    openAccountSheet({ ok: false, text: authErrorText(e) });
  }
}

// Supabase's raw messages are aimed at developers. These are the cases a
// family member can actually hit and do something about.
function authErrorText(e) {
  const m = (e && e.message) || '';
  if (/not enabled|disabled|provider/i.test(m)) return 'Email sign-in isn’t switched on for this app yet.';
  if (/rate|too many|seconds/i.test(m))         return 'Too many attempts just now — wait a minute and try again.';
  if (/invalid|email/i.test(m))                 return 'That email address doesn’t look right.';
  if (/fetch|network|failed/i.test(m))          return 'Couldn’t reach the server. Check your connection and try again.';
  return 'Something went wrong signing in. ' + m;
}

async function signOut() {
  if (!sb) return;
  const btn = document.getElementById('acct-signout');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing out…'; }
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.error('[cloud] sign out failed', e);
  }
  // Local progress is deliberately untouched. Removing projects from a device
  // is a separate, explicit action — never a side effect of signing out.
  closeSheet();
  resetHeaderKey();
  render();
}

// ── The single-use code hazard ──
//
// A magic link returns to ?code=<one-time>. If a service worker happens to be
// waiting when that lands, controllerchange fires, app.js reloads the page,
// and the reload re-submits a code that has already been spent — sign-in fails
// with nothing on screen explaining why, and it is unreproducible because it
// depends on an SW update being queued at that moment.
//
// app.js consults this before reloading.
function authCodeInFlight() {
  return /[?&]code=/.test(location.search) || window.__authInFlight === true;
}

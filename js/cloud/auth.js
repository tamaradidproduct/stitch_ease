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
    if (session) { handleSignedIn(currentUserId()); syncOnSignedIn(); }
    else syncOnSignedOut();
  });

  // Coming back online doesn't fire an auth event, but it does change what the
  // button should say ("offline" → "signed in").
  window.addEventListener('online',  refreshAccountButton);
  window.addEventListener('offline', refreshAccountButton);
}

// ─────────────────────────────────────────────
// CLAIMING LOCAL DATA
//
// The app is usable for months before anyone signs in, so by the time a
// session appears there is usually already a pile of local progress. Someone
// has to decide whose it is, and the wrong answer is expensive in both
// directions: silently uploading it could hand one family member's projects to
// another on a shared iPad, and silently discarding it loses real knitting.
//
// `pt3_owner` records which account the data on THIS DEVICE belongs to. Four
// cases, and the only automatic ones are those where nothing can be lost:
//
//   no owner + no projects      adopt silently — there is nothing to decide
//   no owner + projects exist   ask: are these yours?
//   owner === signed-in user    normal; nothing to do
//   owner !== signed-in user    ask, and never destroy anything either way
//
// Nothing here uploads. Claiming marks the projects for the outbox; the push
// itself is Phase 6.
// ─────────────────────────────────────────────
const OWNER_KEY   = 'pt3_owner';
const DECLINE_KEY = 'pt3_claim_declined';   // uid that already said "not now"

function localOwner() { try { return localStorage.getItem(OWNER_KEY); } catch(e) { return null; } }
function setLocalOwner(uid) {
  try {
    localStorage.setItem(OWNER_KEY, uid);
    localStorage.removeItem(DECLINE_KEY);
  } catch(e) {}
}

function handleSignedIn(uid) {
  if (!uid) return;
  const owner = localOwner();
  if (owner === uid) return;                       // already ours, nothing to decide

  const mine = liveProjects();
  if (!owner) {
    if (!mine.length) { setLocalOwner(uid); return; }   // nothing at stake
    if (declinedBy(uid)) return;                        // asked already, they said no
    openClaimSheet(mine.length, 'unclaimed', uid);
    return;
  }
  // A different account's data is sitting here — a shared iPad, most likely.
  if (declinedBy(uid)) return;
  openClaimSheet(mine.length, 'other-owner', uid);
}

function declinedBy(uid) {
  try { return localStorage.getItem(DECLINE_KEY) === uid; } catch(e) { return false; }
}
function declineClaim(uid) {
  // Remember, so signing in again doesn't ask the same question every time.
  try { localStorage.setItem(DECLINE_KEY, uid); } catch(e) {}
  closeSheet();
}

// Mark every live project to be pushed under this account. No network here —
// the outbox is drained in Phase 6.
function claimLocalProjects(uid) {
  setLocalOwner(uid);
  liveProjects().forEach(p => {
    enqueue('project', p.id);
    enqueue('progress', p.id);
  });
  // Attached PDFs are keyed by PATTERN, so they are not reachable by walking
  // the projects above — and one may have been attached long before anyone
  // signed in, when there was no account to send it to.
  if (typeof enqueueUnsyncedPdfs === 'function') enqueueUnsyncedPdfs();
  closeSheet();
  refreshAccountButton();
  // canSync() was false until this moment — the projects were unclaimed, so
  // nothing would have been sent. Now they can go.
  kickSync('claimed');
}

function openClaimSheet(n, kind, uid) {
  const plural = n === 1 ? 'project' : 'projects';
  const body = kind === 'unclaimed'
    ? `<p class="sheet-msg">Add your ${n} ${plural} to this account?</p>
       <p class="acct-note" style="border:0;margin-top:8px;padding-top:0">They’ll be backed up and appear on your other devices. Nothing is removed from this one.</p>`
    : `<p class="sheet-msg">This device already has ${n} ${plural} from a different account.</p>
       <p class="acct-note" style="border:0;margin-top:8px;padding-top:0">Add them to your account, or leave them alone — either way nothing is deleted from this device.</p>`;

  openSheet(kind === 'unclaimed' ? 'Back up your projects' : 'Projects already here',
    body + `<div class="sheet-actions">
      <button class="sheet-btn" id="claim-no">Not now</button>
      <button class="sheet-btn primary" id="claim-yes">${kind === 'unclaimed' ? 'Add to my account' : 'They’re mine'}</button>
    </div>`,
    {
      // Dismissing is the same as "not now" — never a claim by accident.
      onDismiss: () => declineClaim(uid),
      onOpen: el => {
        el.querySelector('#claim-yes').onclick = () => claimLocalProjects(uid);
        el.querySelector('#claim-no').onclick  = () => declineClaim(uid);
      }
    });
}

// True when there is local work this account has not taken responsibility for.
// The account sheet says so rather than implying everything is safe.
function hasUnclaimedProjects() {
  return !!currentUserId() && localOwner() !== currentUserId() && liveProjects().length > 0;
}

// ─────────────────────────────────────────────
// ACCOUNT SHEET
//
// The only sign-in surface. Four states, and the wording matters in each: a
// signed-in device with no network has NOT lost anything, so it must not be
// told it is signed out, and a device that never signed in must not be nagged
// — the app is fully usable without an account and always will be.
// ─────────────────────────────────────────────

// Google's official four-colour G. Their brand guidelines require the mark be
// shown unmodified, so this is inlined rather than recoloured to match the app.
const GOOGLE_G_SVG = `<svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
</svg>`;

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
      <button class="sheet-btn google-btn" id="acct-google">${GOOGLE_G_SVG}Continue with Google</button>
      <div class="acct-or"><span>or</span></div>
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
        el.querySelector('#acct-google').onclick = signInWithGoogle;
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
    ${syncBlockHtml()}
    ${hasUnclaimedProjects() ? `<p class="acct-err">${liveProjects().length === 1
        ? 'A project on this device isn’t in your account yet.'
        : liveProjects().length + ' projects on this device aren’t in your account yet.'}
      </p>
      <div class="sheet-actions"><button class="sheet-btn primary" id="acct-claim">Add them to my account</button></div>` : ''}
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Done</button>
      <button class="sheet-btn" id="acct-signout">Sign out</button>
    </div>
    <p class="acct-note">Signing out leaves your projects on this device. Nothing is deleted.</p>`;
  openSheet('Account', body, {
    onOpen: el => {
      el.querySelector('#acct-signout').onclick = signOut;
      const sync = el.querySelector('#acct-sync');
      if (sync) sync.onclick = syncFromSheet;
      const claim = el.querySelector('#acct-claim');
      // A second chance after "not now" — the sheet is where someone goes
      // when they wonder whether their work is actually backed up.
      if (claim) claim.onclick = () => { claimLocalProjects(currentUserId()); openAccountSheet(); };
    }
  });
}

function msgHtml(m) {
  return `<p class="${m.ok ? 'acct-ok' : 'acct-err'}">${escapeHtml(m.text)}</p>`;
}

// When was this device last backed up, and is anything still waiting.
//
// Shown even when everything is fine. "Backed up 4 minutes ago" is the only
// thing that makes "backed up yesterday" mean something when it appears — a
// status that only shows up on failure is one nobody has learned to read.
//
// Suppressed while the projects here are unclaimed: sync genuinely isn't
// running yet, and the claim prompt directly below says why.
function syncBlockHtml() {
  if (!currentUserId() || hasUnclaimedProjects()) return '';
  const err = syncErrorText();
  const pending = pendingText();
  return `<div class="acct-sync">
      <div>
        <div class="acct-sync-when">${escapeHtml(syncStatusText())}</div>
        ${pending ? `<div class="acct-status">${escapeHtml(pending)}</div>` : ''}
      </div>
      <button class="sheet-btn slim" id="acct-sync">Sync now</button>
    </div>
    ${err ? `<p class="acct-err">${escapeHtml(err)}</p>` : ''}`;
}

// Manual sync. Deliberately awaits both halves and then re-opens the sheet, so
// the button reports what actually happened rather than just looking busy.
async function syncFromSheet() {
  const btn = document.getElementById('acct-sync');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  try {
    await pull('manual');
    await flush('manual');
  } catch (e) {
    logSync('error', 'manual sync failed', e);
  }
  openAccountSheet();
}

// ── Actions ──
//
// Both re-open the sheet with a result rather than closing it silently, so the
// user always sees what happened.

// Google sends no email of its own, so this is the only sign-in path that
// works for someone without a verified sending domain behind it.
//
// Unlike the magic link, this NAVIGATES AWAY — Google's consent screen replaces
// the page, then returns to `redirectTo` carrying ?code=. So there is nothing
// to report on success: if this call resolves without redirecting, something
// went wrong, and that is the only case worth surfacing.
async function signInWithGoogle() {
  if (!sb) return;
  const btn = document.getElementById('acct-google');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening Google…'; }
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.href.split('?')[0].split('#')[0] }
    });
    if (error) throw error;
  } catch (e) {
    console.error('[cloud] google sign-in failed', e);
    openAccountSheet({ ok: false, text: oauthErrorText(e) });
  }
}

// The failure modes here are configuration, not user error, so the wording
// points at something the reader can actually check or report.
function oauthErrorText(e) {
  const m = (e && e.message) || '';
  if (/provider is not enabled|not enabled/i.test(m)) return 'Google sign-in isn’t switched on for this app yet.';
  if (/redirect|url/i.test(m))                        return 'Google sign-in is misconfigured (redirect URL). This needs fixing in setup.';
  if (/fetch|network/i.test(m))                       return 'Couldn’t reach Google. Check your connection and try again.';
  return 'Couldn’t start Google sign-in. ' + m;
}

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

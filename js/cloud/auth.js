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
    session = s;
    console.info('[cloud] auth:', event, '→', cloudState());
  });
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

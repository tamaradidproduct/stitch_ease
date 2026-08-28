// ─────────────────────────────────────────────
// FAMILIES — who a pattern PDF is shared with
//
// A pattern's PDF belongs to the household, not to whoever happened to buy it
// on their own login. One person attaches Lenore once; everyone else opens it.
//
// ── What a family does and does NOT cover ──
//
// PDFs only. Projects and progress stay per-account, deliberately: two people
// knitting the same pattern are knitting two different garments and must not
// share a row counter. The document is the one thing that genuinely is the
// same object for both of them.
//
// ── Why not just share a login ──
//
// That was the original design, and it is why the conflict machinery talks
// about "a family sharing an account". It stopped being true the moment there
// were two real accounts. Sharing a login also means sharing progress, which
// is exactly the thing that must not be shared.
//
// ── Why an invite code and not "anyone signed in" ──
//
// Sign-up on this project is open, so "any authenticated user" means "anyone
// who cares to make an account". These are bought patterns; that is the same
// redistribution problem as committing them to the public Pages repo, with one
// extra click in front of it. A family is a closed set you are invited into.
//
// The whole authorisation model lives in Postgres (see
// supabase/migrations/20260817022512_families.sql). This file is only the
// client's cache of "which family am I in" plus the account-sheet UI — nothing
// here is a security boundary, and nothing here should ever become one.
// ─────────────────────────────────────────────

const FAMILY_KEY = 'pt3_family';

// { id, name, roster: [{user_id, email, role}], fetchedAt }
//
// Cached in localStorage because pdfsync needs the family id SYNCHRONOUSLY on
// every push and every index read, and the render paths must never await. It
// is a convenience copy of a server fact, so a stale one costs a failed push
// that retries, never wrong access — the server decides.
let familyState = null;

function loadFamily() {
  try { familyState = JSON.parse(localStorage.getItem(FAMILY_KEY) || 'null'); }
  catch (e) { familyState = null; }
}

function saveFamily() {
  try {
    if (familyState) localStorage.setItem(FAMILY_KEY, JSON.stringify(familyState));
    else localStorage.removeItem(FAMILY_KEY);
  } catch (e) {
    logSync('warn', 'could not persist family state', e);
  }
}

function currentFamilyId() { return (familyState && familyState.id) || null; }

// Signing out has to drop this. Leaving it would let the next account on a
// shared iPad push PDFs into the previous person's household — the same
// reasoning as pt3_owner guarding the projects.
function clearFamily() { familyState = null; saveFamily(); }

// Make sure this account has a family, and cache it. Called on sign-in, and
// again before any push that needs an id it hasn't got.
//
// `ensure_family()` is idempotent server-side, so calling it more than once is
// free and there is no "create" path for the client to get wrong.
async function ensureFamily() {
  if (typeof sb === 'undefined' || !sb || !currentUserId()) return null;
  const { data, error } = await sb.rpc('ensure_family');
  if (error) { logSync('warn', 'could not resolve family', error); return null; }
  if (!data) return null;
  if (!familyState || familyState.id !== data) familyState = { id: data, name: '', roster: [] };
  else familyState.id = data;
  saveFamily();
  return data;
}

async function refreshFamilyRoster() {
  if (!currentFamilyId()) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ensureFamily timeout')), 5000));
    try {
      await Promise.race([ensureFamily(), timeout]);
    } catch (e) {
      logSync('warn', 'could not resolve family for roster', e);
      return null;
    }
  }
  if (!currentFamilyId()) return null;
  const { data, error } = await sb.rpc('family_roster');
  if (error) { logSync('warn', 'could not read family roster', error); return null; }
  familyState.roster = data || [];
  familyState.fetchedAt = Date.now();
  saveFamily();
  return familyState.roster;
}

async function createFamilyInvite() {
  const { data, error } = await sb.rpc('create_family_invite');
  if (error) throw error;
  return data;
}

// Joining REPLACES this device's family (the server drops the old membership
// in the same transaction). A person belongs to one household, because "my
// family's copy of Lenore" has to name exactly one file.
//
// Any PDF this account had uploaded under its old family stays with that
// family. Nothing is deleted, and re-attaching in the new one is a normal
// upload — which is far less alarming than silently migrating someone's files
// between households on a code redemption.
async function redeemFamilyInvite(code) {
  const { data, error } = await sb.rpc('redeem_family_invite', { p_code: code });
  if (error) throw error;
  familyState = { id: data, name: '', roster: [] };
  saveFamily();
  // The local PDF index describes the OLD family's files. Their remote halves
  // are not ours any more, so the "there's a copy in your account" flags have
  // to go or the sheet would offer a download that RLS will refuse.
  if (typeof forgetRemotePdfs === 'function') {
    try { forgetRemotePdfs(); }
    catch (e) { logSync('warn', 'could not clear old family PDFs', e); }
  } else {
    logSync('warn', 'forgetRemotePdfs not available; old family PDFs not cleared');
  }
  await refreshFamilyRoster();
  if (typeof kickSync === 'function') kickSync('family-joined');
  return data;
}

// ─────────────────────────────────────────────
// THE ACCOUNT-SHEET BLOCK
// ─────────────────────────────────────────────

function familyBlockHtml() {
  if (!currentUserId()) return '';
  const roster = (familyState && familyState.roster) || [];
  const n = roster.length;
  const others = roster.filter(m => m.user_id !== currentUserId());

  const who = n <= 1
    ? 'Just you — pattern PDFs you add stay in your account'
    : n + ' people share pattern PDFs';

  const rows = others.map(m => `<div class="fam-row">
      <div class="fam-email">${escapeHtml(m.email || 'Member')}</div>
      <div class="fam-role">${escapeHtml(m.role === 'owner' ? 'started the family' : 'member')}</div>
    </div>`).join('');

  return `<div class="acct-family">
      <div class="acct-family-head">
        <span>Family</span>
        <span class="acct-family-count">${escapeHtml(who)}</span>
      </div>
      ${rows ? `<div class="fam-list">${rows}</div>` : ''}
      <div class="sheet-actions">
        <button class="sheet-btn slim" id="fam-invite">Invite someone</button>
        <button class="sheet-btn slim" id="fam-join">Join with a code</button>
      </div>
      <div id="fam-msg"></div>
      <p class="acct-note">Pattern PDFs are shared across your family. Projects and row counts stay yours alone.</p>
    </div>`;
}

function wireFamilyBlock(el) {
  const inv = el.querySelector('#fam-invite');
  if (inv) inv.onclick = async () => {
    inv.disabled = true; inv.textContent = 'Making a code…';
    try {
      const code = await createFamilyInvite();
      showFamilyCode(code);
    } catch (e) {
      familyMsg('Couldn’t create an invite code just now. Check your connection and try again.', false);
      inv.disabled = false; inv.textContent = 'Invite someone';
    }
  };
  const join = el.querySelector('#fam-join');
  if (join) join.onclick = () => openJoinFamilySheet();
}

function familyMsg(text, ok) {
  const box = document.getElementById('fam-msg');
  if (!box) return;
  box.innerHTML = `<p class="${ok ? 'acct-ok' : 'acct-err'}">${escapeHtml(text)}</p>`;
}

// The code is shown, not emailed. Sending mail would need an edge function and
// a sender domain to say one short string that gets read down the phone anyway.
function showFamilyCode(code) {
  openSheet('Invite to your family', `
    <p class="sheet-msg">Give them this code. It works once, and expires in 7 days.</p>
    <div class="fam-code" id="fam-code">${escapeHtml(code)}</div>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Done</button>
      <button class="sheet-btn primary" id="fam-copy">Copy code</button>
    </div>
    <p class="acct-note">They sign in on their own device, open Account, and tap “Join with a code”. They’ll see your pattern PDFs — not your projects or row counts.</p>`, {
    onOpen: el => {
      el.querySelector('#fam-copy').onclick = () => {
        const btn = el.querySelector('#fam-copy');
        // Clipboard access is refused in plenty of contexts (no permission, an
        // insecure origin, an embedded webview). The code is on screen either
        // way, so a failure says "select it yourself" rather than nothing.
        const done = ok => { btn.textContent = ok ? 'Copied' : 'Select it above'; btn.disabled = true; };
        try {
          navigator.clipboard.writeText(code).then(() => done(true), () => done(false));
        } catch (e) { done(false); }
      };
    }
  });
}

function openJoinFamilySheet() {
  openSheet('Join a family', `
    <p class="sheet-msg">Enter the code you were given.</p>
    <input class="sheet-input fam-input" id="fam-code-input" type="text"
           autocapitalize="characters" autocomplete="off" spellcheck="false"
           placeholder="ABCD2345" aria-label="Invite code">
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="dismissSheet()">Cancel</button>
      <button class="sheet-btn primary" id="fam-join-go">Join</button>
    </div>
    <div id="fam-join-msg"></div>
    <p class="acct-note">You’ll see their pattern PDFs. Your projects and row counts stay yours, and nothing of yours is shared back.</p>`, {
    onOpen: el => {
      const input = el.querySelector('#fam-code-input');
      const go = el.querySelector('#fam-join-go');
      const msg = el.querySelector('#fam-join-msg');
      const sync = () => { go.disabled = input.value.trim().length < 4; };
      const submit = async () => {
        const code = input.value.trim().toUpperCase();
        if (code.length < 4) return;
        go.disabled = true; go.textContent = 'Joining…';
        try {
          await redeemFamilyInvite(code);
          closeSheet();
          openAccountSheet({ ok: true, text: 'Joined. Their pattern PDFs will appear as you open each pattern.' });
        } catch (e) {
          // The server's own words are the useful ones here — "code expired"
          // and "code already used" need different actions from the reader.
          const m = (e && e.message) || '';
          msg.innerHTML = `<p class="acct-err">${escapeHtml(
            /expired/i.test(m)   ? 'That code has expired. Ask for a new one.' :
            /already used/i.test(m) ? 'That code has already been used. Ask for a new one.' :
            /invalid/i.test(m)   ? 'That code isn’t recognised. Check it and try again.' :
            'Couldn’t join just now. Check your connection and try again.')}</p>`;
          go.disabled = false; go.textContent = 'Join';
        }
      };
      input.oninput = () => { input.value = input.value.toUpperCase(); sync(); };
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
      go.onclick = submit;
      sync();
      input.focus();
    }
  });
}

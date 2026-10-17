// ─────────────────────────────────────────────
// ROW MARKERS — docs/superpowers/specs/2026-10-16-row-markers-design.md
//
// A marker is a label on one row of a step section: a lifeline (rip back to
// here) or a note, with an optional short text. It never moves progress.
//
// Stored in entryProg beside sc:/t:/rp: as `mk:<sectionId>:<n>`, where n is the
// flattened row number spRows() gives (each pass of a repeat has its own n), so
// the per-field clock and three-way merge in sync.js carry it with no special
// case. Value {t, x}; t '' is the tombstone for "removed" — the key is never
// deleted, because absence means "never seen" to the merge and the other device
// would put the marker back.
//
// Text can arrive from another device, so it is stored raw and ESCAPED AT RENDER.
// No DOM here; the only globals are entryProg, stampClock, save and the pattern.
// ─────────────────────────────────────────────

const MARKER_TEXT_MAX = 120;
const MARKER_TYPES = ['lifeline', 'note'];

function markerKey(sectionId, n) { return 'mk:' + sectionId + ':' + n; }

// Whatever is stored or received → a well-formed marker. Never throws: an
// unknown type or a non-object becomes the tombstone.
function normalizeMarker(v) {
  if (!v || typeof v !== 'object' || MARKER_TYPES.indexOf(v.t) === -1) return { t: '', x: '' };
  const x = v.x == null ? '' : String(v.x).trim().slice(0, MARKER_TEXT_MAX).trim();
  return { t: v.t, x: x };
}

function markerRowOk(section, n) {
  return Number.isInteger(n) && n >= 1 && n <= stepsRowCount(section, activeDoc);
}

// The live marker on a row, or null (none, removed, or a row the section no
// longer has — a pattern change can leave a marker pointing past the end).
function markerAt(section, n) {
  if (!section || !markerRowOk(section, n)) return null;
  const m = normalizeMarker(entryProg[markerKey(section.id, n)]);
  return m.t ? m : null;
}

function setMarker(section, n, type, text) {
  if (!section || !markerRowOk(section, n) || MARKER_TYPES.indexOf(type) === -1) return false;
  const k = markerKey(section.id, n);
  entryProg[k] = normalizeMarker({ t: type, x: text });
  stampClock(k);
  save();
  return true;
}

function clearMarker(section, n) {
  if (!markerAt(section, n)) return;
  const k = markerKey(section.id, n);
  entryProg[k] = { t: '', x: '' };
  stampClock(k);
  save();
}

// The marker a collapsed repeat line shows for its whole block: a lifeline if
// any row has one (it is the one you need when ripping back), else a note.
function blockMarker(rows) {
  const section = PHASES[cur];
  let note = null;
  for (let i = 0; i < rows.length; i++) {
    const m = markerAt(section, rows[i].n);
    if (m && m.t === 'lifeline') return m;
    if (m && !note) note = m;
  }
  return note;
}

// The keys of every live marker, for a reset to tombstone: a reset empties entryProg, and a marker that
// merely vanishes (no value, no new clock) is kept by the other device and pushed straight back.
function markerKeys() {
  return Object.keys(entryProg).filter(k => k.indexOf('mk:') === 0 && normalizeMarker(entryProg[k]).t);
}

function tombstoneMarkers(keys) {
  keys.forEach(k => { entryProg[k] = { t: '', x: '' }; stampClock(k); });
}

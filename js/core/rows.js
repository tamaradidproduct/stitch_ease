// ─────────────────────────────────────────────
// SECTIONS / ROWS / REPEATS — the model.
//
// docs/rows-sections-model.md. Every function here is pure: no DOM, no globals
// except the `pattern` handed in, no writes.
//
// The problem it solves: a repeat used to be a COUNT, not a POSITION.
// `{rows:true, target:12}` recorded how many times you did the thing, so
// "work rows 5–12 four times" had nowhere to put which of the eight rows you
// were on. Put the app down mid-repeat and it could not say where to resume.
//
// Three entry kinds replaced the one `step` shape:
//
//   {kind:'note',   id, text, bullets?}           not a row at all
//   {kind:'row',    id, text}                     exactly one row
//   {kind:'repeat', id, times, rows:[{id,text}]}  times × rows.length rows
//
// A note keeps `bullets` because plenty of them are genuinely informational
// (Peacock's marker-placement list) rather than a repeat in disguise.
//
// `cadence` and `countable` are gone, on purpose. "Increase every 2nd round ×
// 8" is a 2-row repeat worked 4 times, and a countable phase is a section
// whose entries all happen to be rows. Both collapsed into this model rather
// than surviving beside it.
// ─────────────────────────────────────────────

// Progress keys — the same namespace the sync clocks use. A repeat's position
// is ONE key holding both numbers: taking y from one device and z from another
// yields a position neither device was ever at.
function noteKey(id)   { return 'n:'  + id; }
function rowKey(id)    { return 'r:'  + id; }
function repeatKey(id) { return 'rp:' + id; }

// ── Repeat position ──
//
// A repeat carries {y, z}: y = full passes finished (0…times),
// z = which row of the current pass you are ON (1…R).
//
// {y:0, z:1} is the start: standing on row 1 with nothing done yet. That is
// why rows-done is y*R + z - 1 and not y*R + z — the row you are on is not a
// row you have finished. Both numbers are wanted by the UI, and confusing
// them is a silent off-by-one in the header tally.

function repeatLength(entry) { return ((entry && entry.rows) || []).length; }

function repeatRowCount(entry) {
  const R = repeatLength(entry), T = (entry && entry.times) | 0;
  return R < 1 || T < 1 ? 0 : R * T;
}

// Positions round-trip through a single scalar — "rows done in this block",
// 0…R*T. Doing the arithmetic in that one dimension is what makes ± exactly
// symmetric: a knitter who taps + once too often must be able to tap − once
// and land precisely where they were, including across a pass boundary.
function repeatPosFromRowsDone(entry, n) {
  const R = repeatLength(entry);
  if (R < 1) return { y: 0, z: 1 };
  const c = Math.max(0, Math.min(repeatRowCount(entry), n | 0));
  // At the very end this yields {y:times, z:1} on its own: floor(T*R/R) = T
  // and (T*R)%R + 1 = 1. The finished state is "pass T done, standing on
  // row 1 of a pass that does not exist" — pinned, not a real position.
  return { y: Math.floor(c / R), z: (c % R) + 1 };
}

// Read a stored position and put it back in range. Anything out of bounds —
// a hand-edited localStorage value, a position from a pattern whose repeat
// got shorter — is clamped rather than trusted.
function clampRepeatPos(entry, pos) {
  const R = repeatLength(entry), T = (entry && entry.times) | 0;
  if (R < 1 || T < 1) return { y: 0, z: 1 };
  const y = Math.max(0, Math.min(T, (pos && pos.y) | 0));
  const z = Math.max(1, Math.min(R, (pos && pos.z) || 1));
  return y === T ? { y, z: 1 } : { y, z };
}

function repeatPos(entry, progress) {
  return clampRepeatPos(entry, (progress || {})[repeatKey(entry.id)]);
}

function repeatRowsDone(entry, pos) {
  const p = clampRepeatPos(entry, pos);
  return repeatLength(entry) < 1 ? 0 : p.y * repeatLength(entry) + p.z - 1;
}

function repeatComplete(entry, pos) {
  const total = repeatRowCount(entry);
  return total > 0 && repeatRowsDone(entry, pos) >= total;
}

// Pure: returns a NEW position, never mutates the one passed in. Clamped at
// both ends — off the front of pass 0 stays at {0,1}, past the last row of
// the last pass stays complete.
function advanceRepeat(entry, pos, delta) {
  return repeatPosFromRowsDone(entry, repeatRowsDone(entry, pos) + (delta | 0));
}

// ── The chart, as an entry ──
//
// A chart section's rows are N rows worked once. That is a position like any
// other, so the model treats it as a fourth entry kind rather than as a branch
// in every function that counts rows.
//
// It is SYNTHESIZED rather than written in the pattern files, because a chart
// section already declares its rows — as a grid. Writing them out again as
// entries would be two sources for one fact.
//
// Its position still lives in `chartRows`, keyed by phase id, and still clocks
// as cr:<phaseId>. That is a storage fact this file deliberately does not
// care about: positionsOf() flattens both buckets into one map and everything
// below reads that.
function chartEntryFor(section, pattern) {
  if (!section || !section.hasChart) return null;
  const n = chartForPhaseOf(pattern, section).length;
  return n ? { kind: 'chart', id: section.id, rows: n } : null;
}

// A section's entries, chart included. One list, so nothing downstream has to
// ask whether this section happens to have a grid in it.
function sectionEntries(section, pattern) {
  if (!section) return [];
  const own = section.entries || [];
  const chart = chartEntryFor(section, pattern);
  return chart ? [chart].concat(own) : own;
}

// One flat position map out of however many buckets a project stores them in.
// The two buckets are a storage fact, not a model one — this is the single
// place the difference is spent.
function positionsOf(ctx) {
  const c = ctx || {};
  const m = Object.assign({}, c.entries || {});
  const cr = c.chartRows || {};
  Object.keys(cr).forEach(id => { m[chartRowKey(id)] = cr[id]; });
  return m;
}

// The row a chart is standing on, 1…N — the same "standing" number the repeat
// dock shows, and clamped the same way. A chart is a repeat with one pass and
// no inside, so advancing it is the same operation minus the pass arithmetic.
function chartRowOf(entry, progress) {
  const n = entry.rows | 0;
  const raw = (progress || {})[chartRowKey(entry.id)] || 1;
  return Math.max(1, Math.min(n, raw | 0));
}

function advanceChartRow(entry, row, delta) {
  return Math.max(1, Math.min(entry.rows | 0, (row | 0) + (delta | 0)));
}

// ── Entries ──

function entryRowCount(entry) {
  if (!entry) return 0;
  if (entry.kind === 'row')    return 1;
  if (entry.kind === 'chart')  return entry.rows | 0;
  if (entry.kind === 'repeat') return repeatRowCount(entry);
  return 0; // notes, and anything unrecognised
}

function entryRowsDone(entry, progress) {
  if (!entry) return 0;
  const pr = progress || {};
  if (entry.kind === 'row')    return pr[rowKey(entry.id)] ? 1 : 0;
  if (entry.kind === 'repeat') return repeatRowsDone(entry, pr[repeatKey(entry.id)]);
  // Standing on row 1 means nothing is finished — the same off-by-one a
  // repeat has, for the same reason.
  if (entry.kind === 'chart')  return chartRowOf(entry, pr) - 1;
  return 0;
}

// A note has no done-flag of its own in the row arithmetic, but it still has
// one for the UI — ticking "cast on 88 sts" must stick.
function entryDone(entry, progress) {
  if (!entry) return false;
  const pr = progress || {};
  if (entry.kind === 'note')   return !!pr[noteKey(entry.id)];
  if (entry.kind === 'row')    return !!pr[rowKey(entry.id)];
  if (entry.kind === 'repeat') return repeatComplete(entry, pr[repeatKey(entry.id)]);
  if (entry.kind === 'chart')  return (entry.rows | 0) > 0 && chartRowOf(entry, pr) >= (entry.rows | 0);
  return false;
}

// ── Sections ──

// Total rows in a section — chart included, since the chart is an entry.
function sectionRowCount(section, pattern) {
  return sectionEntries(section, pattern).reduce((n, e) => n + entryRowCount(e), 0);
}

// Rows finished in a section.
//
// Takes a CONTEXT rather than one map, because a project's positions are
// stored in two buckets — `entries` and `chartRows`. positionsOf() is where
// that stops mattering; from there down there is one kind of thing.
//
//   ctx = { entries, chartRows }   — both optional
function sectionRowsDone(section, ctx, pattern) {
  const pr = positionsOf(ctx);
  return sectionEntries(section, pattern).reduce((n, e) => n + entryRowsDone(e, pr), 0);
}

// Σ over the pattern. This is what the header's Rows tally IS, rather than a
// number every mutator has to remember to nudge — the old one was a sum of
// deltas with no referent, so nothing could reconstruct it and it could only
// drift away from the truth.
function patternRowsDone(pattern, ctx) {
  return ((pattern && pattern.phases) || [])
    .reduce((n, s) => n + sectionRowsDone(s, ctx, pattern), 0);
}

// A chart section is not complete until the chart itself has been worked to
// its last row, not merely because the confirm note underneath it was ticked.
function sectionComplete(section, ctx, pattern) {
  const list = sectionEntries(section, pattern);
  if (!list.length) return false;
  const pr = positionsOf(ctx);
  return list.every(e => entryDone(e, pr));
}

// Σ over the pattern. Named apart from the existing global patternTotalRows()
// in app.js on purpose: classic scripts share one scope, so redeclaring that
// name here would silently clobber the header tally.
function patternRowTotal(pattern) {
  return ((pattern && pattern.phases) || [])
    .reduce((n, s) => n + sectionRowCount(s, pattern), 0);
}

// ── Absolute position ──

// Rows in every preceding section, plus preceding entries in this one. Null
// when the section or entry cannot be found — loud, rather than an arithmetic
// result built on a wrong assumption.
function rowsBeforeEntry(pattern, sectionId, entryId) {
  const sections = (pattern && pattern.phases) || [];
  let before = 0;
  for (const s of sections) {
    if (s.id !== sectionId) { before += sectionRowCount(s, pattern); continue; }
    for (const e of (s.entries || [])) {
      if (e.id === entryId) return before;
      before += entryRowCount(e);
    }
    return null; // right section, no such entry
  }
  return null;   // no such section
}

// The 1-based pattern row a knitter is standing on — the "Pattern row 47" of
// the repeat dock. This is rows-done + 1 for the entry in question, which is
// why a repeat contributes y*R + z rather than y*R + z - 1.
function absoluteRow(pattern, sectionId, entryId, progress) {
  const before = rowsBeforeEntry(pattern, sectionId, entryId);
  if (before === null) return null;
  const section = ((pattern && pattern.phases) || []).find(s => s.id === sectionId);
  const entry = (section.entries || []).find(e => e.id === entryId);
  if (entry.kind === 'row') return before + 1;
  if (entry.kind === 'repeat') {
    const p = repeatPos(entry, progress);
    return before + p.y * repeatLength(entry) + p.z;
  }
  return null; // a note is not on a row
}

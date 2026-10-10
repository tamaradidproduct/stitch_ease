// ─────────────────────────────────────────────
// STEP SCREEN MODEL — docs/superpowers/specs/2026-10-05-step-screen-design.md
//
// A section is notes + an ordered list of STEPS, and its progress is ONE
// integer: the cursor, rows completed (0…N). Everything before it is done,
// everything after is not. Pass and row-in-pass are derived from it, never
// stored — that is what lets pass ± and Done be the same arithmetic.
//
// Coexists with rows.js behind isStepSection(): a section with no `steps`,
// `chartSteps` or `rowless` still goes down the old entries path, untouched.
// The pure half of this file has no DOM and no globals beyond the `pattern`
// handed in (and chartForPhaseOf, which only reads it). The persistence
// helpers at the bottom are the only part that touches state.
//
//   step = {kind:'row',    id, text?, before?, after?, chartRow?}
//        | {kind:'repeat', id, times, rows:[{id, text?, chartRow?, before?, after?}],
//                          chart?, before?, after?}
//        | {kind:'task',   id, text}                    rowless sections only
//
// Cursor keys live in entryProg beside n:/r:/rp: — `sc:<sectionId>` for the
// cursor, `t:<taskId>` for a task's done flag.
// ─────────────────────────────────────────────

function stepCursorKey(sectionId) { return 'sc:' + sectionId; }
function taskKey(id)              { return 't:'  + id; }

// `steps` alone is NOT the signal: pre-entries patterns (and any frozen or synced
// snapshot of one — see the `ph.steps && !ph.entries` check in sync.js) carry a
// legacy `steps` array of {id, text, rows?} with no `kind`. Those must keep
// going down the old path, so a steps array only counts when every step has one.
function isStepSection(section) {
  if (!section || section.entries) return false;
  if (section.chartSteps || section.rowless) return true;
  return Array.isArray(section.steps) && section.steps.every(s => s && s.kind);
}

// ── The step list ──

// A full-width chart section writes no rows out: one row step is generated per
// chart row, and `chartSteps` attaches extras by row number. A key past the
// chart's last row is ignored rather than rendered. Authored `steps` follow the
// chart, as the old entries did.
//
// Generated steps carry NO text of their own unless overridden — the written
// part is derived from the chart at render time (rowRecap reads the ACTIVE
// phase, which this pure function must not).
function sectionSteps(section, pattern) {
  if (!section) return [];
  const out = [];
  const cs = section.chartSteps;
  if (cs) {
    const n = (chartForPhaseOf(pattern, section) || []).length;
    for (let row = 1; row <= n; row++) {
      const step = { kind: 'row', id: section.id + '#' + row, chartRow: row };
      const text = typeof cs.text === 'function' ? cs.text(row) : (cs.text || {})[row];
      if (text) step.text = text;
      if ((cs.before || {})[row]) step.before = cs.before[row];
      if ((cs.after  || {})[row]) step.after  = cs.after[row];
      out.push(step);
    }
  }
  return out.concat(Array.isArray(section.steps) ? section.steps : []);
}

// A repeat with no rows or no passes counts zero rows, so the cursor skips it
// and nothing divides by zero.
function stepRowCount(step) {
  if (!step) return 0;
  if (step.kind === 'row') return 1;
  if (step.kind === 'repeat') {
    const R = (step.rows || []).length, T = step.times | 0;
    return R < 1 || T < 1 ? 0 : R * T;
  }
  return 0; // tasks, and anything unrecognised
}

function stepsRowCount(section, pattern) {
  return sectionSteps(section, pattern).reduce((n, s) => n + stepRowCount(s), 0);
}

// ── Cursor ↔ position ──

// Where a cursor stands. The cursor is clamped, never trusted — a hand-edited
// value or a pattern whose row count shrank must not throw. At `total` the
// section is complete and there is no current step (stepIndex = steps.length).
function locateCursor(section, pattern, cursor) {
  const steps = sectionSteps(section, pattern);
  const total = steps.reduce((n, s) => n + stepRowCount(s), 0);
  const c = Math.max(0, Math.min(total, cursor | 0));
  const base = { cursor: c, total, complete: false, stepIndex: steps.length, step: null,
                 pass: 1, passes: 1, rowInPass: 1, rowId: null };
  if (c >= total) return Object.assign(base, { complete: true });
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    const n = stepRowCount(steps[i]);
    if (!n || c >= acc + n) { acc += n; continue; }
    const s = steps[i], within = c - acc;
    if (s.kind === 'repeat') {
      const R = (s.rows || []).length;
      const rowInPass = within % R + 1;
      return Object.assign(base, { stepIndex: i, step: s, pass: Math.floor(within / R) + 1,
        passes: s.times | 0, rowInPass, rowId: s.rows[rowInPass - 1].id });
    }
    return Object.assign(base, { stepIndex: i, step: s, rowId: s.id });
  }
  return Object.assign(base, { complete: true }); // unreachable: c < total
}

// Rows completed before a step begins.
function cursorAtStep(section, pattern, stepIndex) {
  const steps = sectionSteps(section, pattern);
  let n = 0;
  for (let i = 0; i < Math.min(stepIndex | 0, steps.length); i++) n += stepRowCount(steps[i]);
  return n;
}

// Cursor for standing on (pass, rowInPass) of a step — both 1-based and
// clamped. For a row step they are ignored.
function cursorAtRow(section, pattern, stepIndex, pass, rowInPass) {
  const base = cursorAtStep(section, pattern, stepIndex);
  const s = sectionSteps(section, pattern)[stepIndex | 0];
  if (!s || s.kind !== 'repeat' || !stepRowCount(s)) return base;
  const R = (s.rows || []).length;
  const p = Math.max(1, Math.min(s.times | 0, pass | 0));
  const r = Math.max(1, Math.min(R, rowInPass | 0));
  return base + (p - 1) * R + (r - 1);
}

// ── Actions — pure, return new values, never mutate ──

// Done pressed on `viewedRow` (1-based). On the cursor row it completes it.
// On a row AHEAD it moves the cursor past it and asks first: the knitter is
// recording rows they skipped past. Behind the cursor, or at the end, nothing.
function doneAt(section, pattern, cursor, viewedRow) {
  const total = stepsRowCount(section, pattern);
  const c = Math.max(0, Math.min(total, cursor | 0));
  const v = viewedRow | 0;
  if (c >= total) return { cursor: total, confirm: null };
  if (v === c + 1) return { cursor: c + 1, confirm: null };
  if (v > c + 1 && v <= total) return { cursor: v, confirm: { from: c + 1, to: v } };
  return { cursor: c, confirm: null };
}

// Mark a completed row incomplete: the cursor moves back to it. Confirms when
// that un-completes more than one row.
function markIncompleteAt(cursor, viewedRow) {
  const c = Math.max(0, cursor | 0), v = viewedRow | 0;
  if (v < 1 || v > c) return { cursor: c, confirm: null };
  return { cursor: v - 1, confirm: c - (v - 1) > 1 ? { from: v, to: c } : null };
}

// The repeat the cursor is working in, or — when the section is complete and
// ends on a repeat — that last repeat standing at its final row.
function passContext(section, pattern, cursor) {
  const loc = locateCursor(section, pattern, cursor);
  if (!loc.complete) return loc.step && loc.step.kind === 'repeat' ? loc : null;
  const steps = sectionSteps(section, pattern);
  for (let i = steps.length - 1; i >= 0; i--) {
    if (!stepRowCount(steps[i])) continue;
    const s = steps[i];
    if (s.kind !== 'repeat') return null;
    return { step: s, stepIndex: i, pass: s.times | 0, passes: s.times | 0,
             rowInPass: (s.rows || []).length, ended: true };
  }
  return null;
}

// Pass +: finish the current pass. Using it IS the statement that the pass was
// knitted, so no confirm. On the last pass it completes the block.
function passPlus(section, pattern, cursor) {
  const loc = locateCursor(section, pattern, cursor);
  const ctx = passContext(section, pattern, cursor);
  if (!ctx || ctx.ended) return loc.cursor;
  return cursorAtStep(section, pattern, ctx.stepIndex) + ctx.pass * (ctx.step.rows || []).length;
}

// Pass −: at row 1 of pass P → row 1 of P−1; mid-pass (or a finished block) →
// row 1 of the current pass. Clamped at row 1 of pass 1.
function passMinus(section, pattern, cursor) {
  const loc = locateCursor(section, pattern, cursor);
  const ctx = passContext(section, pattern, cursor);
  if (!ctx) return loc.cursor;
  const atRowOne = !ctx.ended && ctx.rowInPass === 1;
  const pass = atRowOne ? Math.max(1, ctx.pass - 1) : ctx.pass;
  return cursorAtRow(section, pattern, ctx.stepIndex, pass, 1);
}

// before/after callouts for where the knitter is standing. Both are lists, since
// a repeat's block-level callout and one row's own can apply at once.
//   standalone row — its own, on that row (after is confirmed by its Done)
//   repeat block   — before: throughout the first pass; after: on the last row
//                    of the last pass, where the Done that finishes it confirms it
//   row in repeat  — that row's own, every pass
function calloutsFor(step, loc) {
  const out = { before: [], after: [] };
  if (!step) return out;
  if (step.kind === 'row') {
    if (step.before) out.before.push(step.before);
    if (step.after)  out.after.push(step.after);
    return out;
  }
  if (step.kind === 'repeat') {
    const l = loc || {};
    const row = (step.rows || [])[(l.rowInPass | 0) - 1];
    if (step.before && l.pass === 1) out.before.push(step.before);
    if (row && row.before) out.before.push(row.before);
    if (row && row.after)  out.after.push(row.after);
    if (step.after && l.pass === l.passes && l.rowInPass === (step.rows || []).length) out.after.push(step.after);
  }
  return out;
}

// ── Section progress, from a ctx — what rows.js dispatches to ──

function stepSectionCursor(section, ctx, pattern) {
  if (!section) return 0;
  const total = stepsRowCount(section, pattern);
  const raw = (positionsOf(ctx) || {})[stepCursorKey(section.id)];
  return Math.max(0, Math.min(total, raw | 0));
}

// Complete when every row is worked AND every task ticked, and there was
// something to do at all — an empty section is not "complete".
function stepSectionComplete(section, ctx, pattern) {
  const total = stepsRowCount(section, pattern);
  const tasks = sectionSteps(section, pattern).filter(s => s.kind === 'task');
  if (!total && !tasks.length) return false;
  const pr = positionsOf(ctx) || {};
  return stepSectionCursor(section, ctx, pattern) >= total && tasks.every(t => !!pr[taskKey(t.id)]);
}


// ── From the entries model (schema 3) to cursors (schema 4) — pure ──
//
// Same ids in the same order, so every old key still names something: a row's
// `r:<id>` flag, a repeat's `rp:<id>` position, the chart's `cr:<sectionId>`
// standing row, a note's `n:<id>` tick (which became a task for a rowless
// section). A section's cursor is how many of its rows were done — the number
// the header tally already counted, so converting cannot move the tally. (Rows
// ticked out of order land as that many rows done from the top: the cursor can
// only say "this many", not which.)
//
//   legacy = { entries, chartRows }  — the project's saved buckets
// Returns { values: {'sc:<id>': n, 't:<id>': bool}, sources: {key: [old keys]} }.
function cursorsFromLegacyProgress(pattern, legacy) {
  const pr = Object.assign({}, (legacy && legacy.entries) || {});
  const cr = (legacy && legacy.chartRows) || {};
  Object.keys(cr).forEach(id => { pr['cr:' + id] = cr[id]; });
  const values = {}, sources = {};
  ((pattern && pattern.phases) || []).forEach(sec => {
    if (!isStepSection(sec)) return;
    let rows = 0;
    const src = [];
    if (sec.chartSteps) {
      const n = (chartForPhaseOf(pattern, sec) || []).length;
      rows += Math.max(1, Math.min(n, (pr['cr:' + sec.id] | 0) || 1)) - 1;   // the old chart row is clamped to the chart first; standing on row 1 = nothing done
      src.push('cr:' + sec.id);
    }
    (sec.steps || []).forEach(st => {
      if (st.kind === 'row')         { rows += pr['r:' + st.id] ? 1 : 0; src.push('r:' + st.id); }
      else if (st.kind === 'repeat') { rows += repeatRowsDone(st, pr['rp:' + st.id]); src.push('rp:' + st.id); }
      else if (st.kind === 'task')   { values[taskKey(st.id)] = !!pr['n:' + st.id]; sources[taskKey(st.id)] = ['n:' + st.id]; }
    });
    const total = stepsRowCount(sec, pattern);
    if (total) { values[stepCursorKey(sec.id)] = Math.min(total, rows); sources[stepCursorKey(sec.id)] = src; }
  });
  return { values, sources };
}

// A migrated field's clock is the newest of the old fields it was derived from
// — "when did this last move" — so it neither looks older than the other
// device's edit nor invents a newer one. Zero (nothing ever touched) is left
// out: a field no one has changed has nothing to push.
function clocksForCursors(derived, clocks) {
  const out = {};
  Object.keys(derived.sources).forEach(k => {
    const t = derived.sources[k].reduce((m, o) => Math.max(m, (clocks && clocks[o]) | 0), 0);
    if (t) out[k] = t;
  });
  return out;
}

// ── Persistence — the only part of this file that touches state ──
//
// Synchronous on purpose: Done and pass ± inherit the 100-taps-under-50ms
// budget, so no await, no network and no pattern-doc stringify on this path.
// activeDoc, not activePattern(): a frozen project counts what it is knitting.

function stepCursor(section) {
  return stepSectionCursor(section, progressCtx(), activeDoc);
}

function setStepCursor(section, n) {
  const k = stepCursorKey(section.id);
  entryProg[k] = Math.max(0, Math.min(stepsRowCount(section, activeDoc), n | 0));
  stampClock(k);
  save();
  renderGlobalRows();
}

function taskDone(task) { return !!(task && entryProg[taskKey(task.id)]); }

function toggleTask(task) {
  if (!task) return;
  const k = taskKey(task.id);
  entryProg[k] = !entryProg[k];
  stampClock(k);
  save();
}

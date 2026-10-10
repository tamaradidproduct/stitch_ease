// ─────────────────────────────────────────────
// ENTRIES → STEPS — turns a pattern written in the old shape (phases of
// `entries`: note / row / repeat) into the step-screen shape (js/core/steps.js:
// section `notes` + `steps`, with `before` / `after` on rows).
//
// docs/superpowers/specs/2026-10-05-step-screen-design.md, "What happens to
// today's note entries": nothing informational gets a tick. A note becomes
//
//   section notes   context for the whole section (materials, rhythm, "from here on…")
//   before          a setup action, once, ahead of the next row or repeat
//   after           a checkpoint behind the row or repeat it follows ("39 sts", "check ≈ 22 cm")
//   a task          work that is not rows — only in a rowless section (finishing)
//
// The classification is by position and wording, so it is a first draft for a
// person to review, not a verdict: it is applied at load and printed by
// `describeStepConversion()`. Row and repeat entries are copied
// untouched (same ids), so the row count never changes.
//
// ALWAYS ON. The ?steps=1 / ?steps=0 opt-in flag (pt3_stepmodel) was removed; a project that
// already exists keeps the old shape through its frozen snapshot.
// ─────────────────────────────────────────────

// Kept as a function so the callers (and the selftests that branch on it) read the same.
function stepModelOn() { return true; }

function convNoteText(e) {
  const b = (e.bullets || []).map(x => '• ' + x);
  return b.length ? [e.text].concat(b).join('<br>') : e.text;
}

function convPlain(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

// A note that states a count, a measurement or "check …" is a checkpoint.
// (A needle size — "4 mm" — or "work 7 rounds" is an instruction, not a checkpoint.)
const CONV_CHECK = /(\b\d+\s*(sts?|stitches|cm)\b|\bshould (measure|have|be)\b|\bcheck\b|\bcount\b|≈|\bapprox)/i;
// A leading note that opens with an instruction is a setup action for the first row.
const CONV_ACTION = /^(cast|switch|change|place|pick|join|using|with|begin|start|rejoin|set up|put|transfer|divide|slip|turn)\b/i;
// A section with no rows whose notes are things to DO.
// Materials are things to gather, so they are a checklist too — never hidden away as section notes.
const CONV_TASKS = /finish|bind off|sew|weave|seam|block|assembl|material/i;

function convertWork(e) {
  const st = Object.assign({}, e);
  if (st.kind === 'repeat') st.rows = (e.rows || []).map(r => Object.assign({}, r));
  return st;
}

function convertPhase(ph, pattern) {
  if (!ph || !ph.entries) return ph;                 // already converted, or a legacy `steps` section
  const E = ph.entries;
  const isWork = e => e.kind === 'row' || e.kind === 'repeat';
  const out = Object.assign({}, ph);
  delete out.entries;

  if (ph.hasChart) {
    // WATL's two-sections-per-row chart (pairedRow) has no step equivalent yet —
    // left on the old renderer rather than losing its companion row text.
    if (ph.pairedRow || E.some(isWork)) return ph;
    const len = ((ph.chart || (pattern && pattern.chart) || [])).length;
    const notes = E.map(convNoteText);
    out.steps = [];
    out.chartSteps = notes.length && len ? { after: { [len]: notes.join('<br>') } } : {};
    return out;
  }

  const work = E.map(isWork);
  const first = work.indexOf(true), last = work.lastIndexOf(true);
  const notes = [], steps = [];

  if (first < 0) {                                   // nothing to knit: notes only, or a checklist
    out.rowless = true;
    if (CONV_TASKS.test(ph.id + ' ' + ph.name)) out.steps = E.map(e => ({ kind: 'task', id: e.id, text: convNoteText(e) }));
    else { out.steps = []; E.forEach(e => notes.push(convNoteText(e))); }
    if (notes.length) out.notes = notes;
    return out;
  }

  let pending = [];
  E.forEach((e, i) => {
    if (isWork(e)) {
      const st = convertWork(e);
      if (pending.length) { st.before = pending.join('<br>'); pending = []; }
      steps.push(st);
      return;
    }
    const t = convNoteText(e);
    const checkpoint = CONV_CHECK.test(convPlain(t)) && convPlain(t).length < 160 && steps.length;
    if (i < first) {
      if (i === first - 1 && CONV_ACTION.test(convPlain(t))) pending.push(t); else notes.push(t);
    } else if (i > last) {
      if (checkpoint) { const s = steps[steps.length - 1]; s.after = s.after ? s.after + '<br>' + t : t; } else notes.push(t);
    } else if (checkpoint) {
      const s = steps[steps.length - 1]; s.after = s.after ? s.after + '<br>' + t : t;
    } else {
      pending.push(t);
    }
  });
  out.steps = steps;
  if (notes.length) out.notes = notes;
  return out;
}

// A new pattern doc; the original is left alone.
function convertPattern(p) {
  const doc = Object.assign({}, p);
  if (p.phases) doc.phases = p.phases.map(ph => convertPhase(ph, p));
  if (p.buildPhases) doc.buildPhases = i => p.buildPhases(i).map(ph => convertPhase(ph, p));
  return doc;
}

// What the converter decided, per section — for review.
function describeStepConversion(p) {
  return (convertPattern(p).phases || []).filter(ph => !ph.entries).map(ph => ({
    section: ph.id,
    shape: ph.rowless ? 'rowless' : ph.chartSteps ? 'chart' : 'steps',
    notes: (ph.notes || []).map(convPlain),
    before: (ph.steps || []).filter(s => s.before).map(s => s.id + ': ' + convPlain(s.before)),
    after: (ph.steps || []).filter(s => s.after).map(s => s.id + ': ' + convPlain(s.after))
      .concat(ph.chartSteps && ph.chartSteps.after ? Object.keys(ph.chartSteps.after).map(k => 'chart row ' + k + ': ' + convPlain(ph.chartSteps.after[k])) : []),
    tasks: (ph.steps || []).filter(s => s.kind === 'task').map(s => convPlain(s.text)),
  }));
}

// In place, once, at load — the registry entries are what everything downstream
// (templates, freeze, sync, hashes) reads, so they must agree on one shape.
//
// The pre-conversion shape stays reachable (legacyPhases / legacyBuildPhases):
// the schema-4 migration needs to know whether a project's saved structure still
// matches the code, and that is a question about the OLD shape.
if (stepModelOn()) {
  PATTERNS.forEach(p => {
    if (p.buildPhases) { const orig = p.buildPhases; p.legacyBuildPhases = orig; p.buildPhases = i => orig(i).map(ph => convertPhase(ph, p)); }
    else if (p.phases) { p.legacyPhases = p.phases; p.phases = p.phases.map(ph => convertPhase(ph, p)); }
  });
}

// What livePatternFor(proj) returned BEFORE conversion; null if unknown.
function legacyPatternFor(proj) {
  const t = proj && patternById(proj.patternId);
  if (!t) return null;
  if (t.legacyBuildPhases) {
    const i = projectSize(proj);
    if (i === null || !t.sizes || !t.sizes[i]) return null;
    const doc = Object.assign({}, t, { phases: t.legacyBuildPhases(i), sizeIndex: i, badge: t.sizes[i].badge });
    delete doc.buildPhases; delete doc.legacyBuildPhases; delete doc.sizes;
    return doc;
  }
  return t.legacyPhases ? Object.assign({}, t, { phases: t.legacyPhases }) : null;
}

// A registry entry in its pre-conversion shape — for the older migrations, which
// read `entries` and must keep doing so whether or not the step model is on.
function legacyShape(p) {
  return p && p.legacyPhases ? Object.assign({}, p, { phases: p.legacyPhases }) : p;
}

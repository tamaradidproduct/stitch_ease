// ─────────────────────────────────────────────
// SELF-TEST for custom-pattern sync. Not shipped.
//
// Absent from index.html and the service-worker precache. From the console on
// a loaded page:
//
//   const s = document.createElement('script');
//   s.src = 'js/cloud/patternsync.selftest.js';
//   document.body.append(s);
//
// then call patternSyncTest(). Logs a table, returns {passed, failed}.
//
// Three "devices" share one mock server: the phone and the iPad (account A)
// and a family member's phone (account B), plus an outsider (account C, a
// different family). Each device's pt3_* keys are swapped in and out of
// localStorage, so the REAL import, push and pull code runs against each one.
// Every pt3_* key is snapshotted first and restored at the end, so it is safe
// to run on a device with real progress.
//
// The mock enforces what the migration does: PK (owner_id, pattern_id), writes
// only to your own row in your own family, reads only within your family, and
// the trigger that drops an update carrying an older clock.
// ─────────────────────────────────────────────
function makeCpatMockDb() {
  const db = { custom_patterns: [], families: { A: 'fam-1', B: 'fam-1', C: 'fam-2' }, uid: null };
  const clone = o => JSON.parse(JSON.stringify(o));
  const matches = (row, filters) => filters.every(f => {
    if (f[0] === 'eq') return row[f[1]] === f[2];
    if (f[0] === 'in') return f[2].indexOf(row[f[1]]) !== -1;
    throw new Error('mock: unsupported filter ' + f[0]);
  });
  async function run(st) {
    const myFam = db.families[db.uid];
    if (st.table !== 'custom_patterns') {
      // pull() also reads projects / progress / pattern_pdfs; nothing there.
      return { data: st.single ? null : [], error: null };
    }
    const rows = db.custom_patterns;
    if (st.op === 'select') {
      const hit = rows.filter(r => r.family_id === myFam && matches(r, st.filters)).map(clone);
      return { data: st.single ? (hit[0] || null) : hit, error: null };
    }
    if (st.op === 'upsert') {
      const row = clone(st.payload);
      if (row.owner_id !== db.uid || row.family_id !== myFam)
        return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
      const ex = rows.find(r => r.owner_id === row.owner_id && r.pattern_id === row.pattern_id);
      if (ex) {
        if (row.updated_ms < ex.updated_ms) return { data: null, error: null };   // the LWW trigger
        Object.assign(ex, row);
      } else rows.push(row);
      return { data: null, error: null };
    }
    throw new Error('mock: unsupported op ' + st.op);
  }
  db.client = {
    rpc(name) {
      if (name === 'ensure_family') return Promise.resolve({ data: db.families[db.uid], error: null });
      return Promise.resolve({ data: null, error: { message: 'mock: no rpc ' + name } });
    },
    from(table) {
      const st = { table, filters: [], op: null, payload: null, single: false };
      const api = {
        select() { if (!st.op) st.op = 'select'; return api; },
        eq(k, v) { st.filters.push(['eq', k, v]); return api; },
        gt() { return api; }, gte() { return api; },
        in(k, vs) { st.filters.push(['in', k, vs]); return api; },
        maybeSingle() { st.single = true; return run(st); },
        upsert(row) { st.op = 'upsert'; st.payload = row; return run(st); },
        then(res, rej) { return run(st).then(res, rej); }
      };
      return api;
    }
  };
  return db;
}

async function patternSyncTest() {
  const results = [];
  const check = (name, actual, expected) => {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  };

  const snapshot = {};
  const pt3Keys = () => Object.keys(localStorage).filter(k => k.indexOf('pt3_') === 0);
  pt3Keys().forEach(k => { snapshot[k] = localStorage.getItem(k); });
  const saved = { sb: sb, session: session, activeProjectId: activeProjectId, view: view };
  const builtins = PATTERNS.filter(p => !p.custom);

  // ── Device switching: each device is its own set of pt3_* keys ──
  const devices = {};
  let current = null;
  function reloadGlobals() {
    PATTERNS.length = 0; builtins.forEach(p => PATTERNS.push(p));
    loadCustomPatterns();
    loadProjects(); loadOutbox(); loadFamily();
    loadCustomPatternIndex();
  }
  function use(name, uid, db) {
    if (current) { devices[current] = {}; pt3Keys().forEach(k => { devices[current][k] = localStorage.getItem(k); }); }
    pt3Keys().forEach(k => localStorage.removeItem(k));
    const st = devices[name] || { pt3_owner: uid };
    Object.keys(st).forEach(k => localStorage.setItem(k, st[k]));
    current = name;
    sb = db.client; db.uid = uid;
    session = { user: { id: uid, email: uid + '@example.com' } };
    activeProjectId = null; view = 'home';
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    reloadGlobals();
  }
  const has = id => !!PATTERNS.find(p => p.id === id && p.custom);
  const pat = id => PATTERNS.find(p => p.id === id);
  const cpatOps = () => Object.keys(outbox).filter(k => k.indexOf('cpat:') === 0);

  const CSV = v => 'pattern_id,pattern_name,phase_id,phase_name,kind,entry_id,text\n' +
    `test-shawl,Test Shawl & Co,cast,Cast on,note,c1,Cast on 80 sts (${v})\n` +
    'test-shawl,,cast,,row,c2,Knit 1 row\n';

  try {
    const db = makeCpatMockDb();

    // ── 1. Import on the phone, push ──
    use('phone', 'A', db);
    importPatternCsvText(CSV('v1'));
    check('import queues a cpat op', cpatOps(), ['cpat:test-shawl']);
    await flush('test');
    const row = db.custom_patterns[0];
    check('push → one row, own owner + family, doc carried',
      row && { o: row.owner_id, f: row.family_id, id: row.pattern_id, name: row.name,
               phases: row.pattern_doc.phases.length, custom: 'custom' in row.pattern_doc, del: row.deleted_ms },
      { o: 'A', f: 'fam-1', id: 'test-shawl', name: 'Test Shawl & Co', phases: 1, custom: false, del: null });
    check('push → outbox drained, index synced', [cpatOps().length, cpatEntry('test-shawl').remoteMs === cpatEntry('test-shawl').localMs], [0, true]);

    // ── 2. The iPad pulls it ──
    use('ipad', 'A', db);
    check('iPad has nothing before pull', has('test-shawl'), false);
    await pull('test');
    check('iPad pull → pattern in library', has('test-shawl'), true);
    check('iPad pull → text survives the round trip unchanged',
      pat('test-shawl').phases[0].entries[0].text, 'Cast on 80 sts (v1)');
    check('iPad pull → name not double-escaped', pat('test-shawl').name, 'Test Shawl &amp; Co');
    check('iPad pull → nothing queued back up', cpatOps(), []);
    const ipadProj = createProject('test-shawl');
    check('iPad can start a project from it', !!(ipadProj && activateProject(ipadProj.id)), true);
    activeProjectId = null; view = 'home';

    // ── 3. The family member pulls it ──
    use('member', 'B', db);
    await pullCustomPatterns();
    check('family member pull → pattern in library', has('test-shawl'), true);

    // ── 4. An outsider does not ──
    use('outsider', 'C', db);
    await pullCustomPatterns();
    check('other family → not visible', has('test-shawl'), false);

    // ── 5. Chart import (colours + swatch symbols) travels ──
    use('phone', 'A', db);
    const draft = parseStitchChart(JSON.stringify({ v: 3, name: 'Tiny Chart', palette: ['knit', 'purl'],
      stitches: [[0, 0, 0], [1, 0, 1], [0, 1, 1], [1, 1, 0]],
      colors: [[0, 0, '#d3f3d0'], [1, 1, '#e4d4fb']] }));
    addCustomPattern(buildChartPattern(draft, {}), false);
    await flush('test');
    use('member', 'B', db);
    await pullCustomPatterns();
    const chartPat = pat('sc-tiny-chart');
    check('chart pattern arrives with its chart and colour grid',
      chartPat && [chartPat.phases[0].chart.length, chartPat.phases[0].chartColors[0][0]], [2, '#d3f3d0']);
    check('chart pattern keeps its generated swatch symbols',
      chartPat && chartPat.notes.filter(n => n.symbol).length, 2);

    // ── 6. Re-import on the iPad supersedes the phone's ──
    use('ipad', 'A', db);
    importPatternCsvText(CSV('v2'), { replace: true });
    await flush('test');
    use('phone', 'A', db);
    await pull('test');
    check('re-import elsewhere → newest doc wins', pat('test-shawl').phases[0].entries[0].text, 'Cast on 80 sts (v2)');

    // ── 7. A stale queued push takes the newer copy instead of overwriting ──
    use('member', 'B', db);
    cpatIndex['test-shawl'] = { localMs: 5, deletedMs: 0, remoteMs: 0 };
    enqueue('cpat', 'test-shawl');
    await flush('test');
    check('stale push → no row written for B', db.custom_patterns.filter(r => r.owner_id === 'B' && r.pattern_id === 'test-shawl').length, 0);
    check('stale push → newer doc applied locally', pat('test-shawl').phases[0].entries[0].text, 'Cast on 80 sts (v2)');

    // ── 8. Remove on the phone → tombstone ──
    use('phone', 'A', db);
    removeCustomPattern('test-shawl');
    await flush('test');
    const tomb = db.custom_patterns.find(r => r.owner_id === 'A' && r.pattern_id === 'test-shawl');
    check('remove → tombstone row, doc cleared', [!!tomb.deleted_ms, tomb.pattern_doc], [true, null]);
    use('member', 'B', db);
    await pullCustomPatterns();
    check('tombstone → removed from an unused library', has('test-shawl'), false);
    check('tombstone → not pushed back', cpatOps(), []);
    use('ipad', 'A', db);
    await pullCustomPatterns();
    check('tombstone → kept where a live project uses it', has('test-shawl'), true);
    check('tombstone kept locally → not pushed back', cpatOps(), []);
    check('tombstone kept locally → project still opens', activateProject(ipadProj.id), true);
    activeProjectId = null; view = 'home';

    // ── 9. A doc from another account is sanitised ──
    use('member', 'B', db);
    db.custom_patterns.push({ owner_id: 'B', family_id: 'fam-1', pattern_id: 'evil', name: 'x', deleted_ms: null,
      updated_ms: syncNow() + 1000, pattern_doc: { id: 'evil', name: '<img src=x onerror=alert(1)>',
        notes: [{ term: 'T & U', def: 'd', symbol: '<svg onload="alert(1)"></svg>' }],
        phases: [{ id: 'p', name: 'P', desc: '', entries: [{ kind: 'note', id: 'n1', text: 'a <b>b</b> &amp; c' }] }] } });
    db.custom_patterns.push({ owner_id: 'B', family_id: 'fam-1', pattern_id: 'evil2', name: 'x', deleted_ms: null,
      updated_ms: syncNow() + 1000, pattern_doc: { id: 'evil2', name: 'n',
        phases: [{ id: 'p', name: 'P', desc: '', entries: [{ kind: 'note', id: "n');alert(1);('", text: 't' }] }] } });
    db.custom_patterns.push({ owner_id: 'B', family_id: 'fam-1', pattern_id: 'peacock-tee', name: 'x', deleted_ms: null,
      updated_ms: syncNow() + 1000, pattern_doc: { id: 'peacock-tee', name: 'Hijack', phases: [{ id: 'p', entries: [] }] } });
    use('phone', 'A', db);
    await pullCustomPatterns();
    const evil = pat('evil');
    check('sanitise → markup in text escaped, entities not doubled',
      evil && [evil.name, evil.phases[0].entries[0].text],
      ['&lt;img src=x onerror=alert(1)&gt;', 'a &lt;b&gt;b&lt;/b&gt; &amp; c']);
    check('sanitise → raw note term left for render-time escaping', evil && evil.notes[0].term, 'T & U');
    check('sanitise → foreign SVG symbol dropped', evil && ('symbol' in evil.notes[0]), false);
    check('sanitise → unsafe id refuses the whole doc', has('evil2'), false);
    check('built-in id → never replaced', [pat('peacock-tee').name !== 'Hijack', !pat('peacock-tee').custom], [true, true]);

    // ── 10. A project that arrives before its pattern gets its snapshot ──
    use('ipad2', 'A', db);
    const chartDoc = JSON.parse(JSON.stringify(db.custom_patterns.find(r => r.pattern_id === 'sc-tiny-chart').pattern_doc));
    chartDoc.custom = true;
    applyRemoteProject({ id: 'proj-early', name: 'Early', pattern_id: 'sc-tiny-chart', created_ms: 1, updated_ms: 1,
                         deleted_ms: null, pattern_struct_hash: structHash(chartDoc), pattern_doc: null });
    check('project before pattern → no snapshot yet', !!frozenPattern('proj-early'), false);
    await pullCustomPatterns();
    check('pattern arrives → snapshot backfilled', !!frozenPattern('proj-early'), true);
    check('pattern arrives → project opens', activateProject('proj-early'), true);
    activeProjectId = null; view = 'home';

    // ── 11. Send order: a pattern goes up before the project that uses it ──
    outbox = {};
    enqueue('project', 'proj-early'); enqueue('cpat', 'sc-tiny-chart');
    check('pendingOps → cpat first', pendingOps().map(o => o.k), ['cpat', 'project']);
    outbox = {};
  } catch (e) {
    results.push({ case: 'threw', ok: false, got: String(e && e.stack || e), want: '' });
  } finally {
    pt3Keys().forEach(k => localStorage.removeItem(k));
    Object.keys(snapshot).forEach(k => localStorage.setItem(k, snapshot[k]));
    sb = saved.sb; session = saved.session; activeProjectId = saved.activeProjectId; view = saved.view;
    reloadGlobals(); loadCursor();
    render();
  }

  console.table(results.map(r => ({ case: r.case, ok: r.ok ? '✓' : '✗', got: r.ok ? '' : r.got, want: r.ok ? '' : r.want })));
  const failed = results.filter(r => !r.ok).length;
  return { passed: results.length - failed, failed };
}

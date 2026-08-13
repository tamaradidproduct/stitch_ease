// ─────────────────────────────────────────────
// SELF-TEST for the push/pull engine. Not shipped.
//
// Absent from index.html and from the service-worker precache. To run it, from
// the console on a loaded page:
//
//   const s = document.createElement('script');
//   s.src = 'js/cloud/sync.pushpull.selftest.js';
//   document.body.append(s);
//
// then call syncPushPullTest(). It logs a table and returns {passed, failed}.
//
// WHY A MOCK SERVER RATHER THAN THE REAL ONE
//
// The bug this code exists to prevent — one device's whole-row upsert wiping
// out rows the other device knitted — cannot be reproduced against the live
// project on demand. It needs two devices writing between one device's read
// and its write, which is a race you have to *construct*. The mock below lets
// a test say "now another device writes" at exactly that instant.
//
// The mock implements only what the push/pull path actually calls, but it
// implements the parts that matter faithfully: a primary key that rejects
// duplicate inserts (23505), a foreign key from progress to projects (23503),
// and a server_rev sequence bumped on every write — which is the token the
// guarded update depends on. If the mock were loose about server_rev, the test
// suite would pass an implementation that loses data.
// ─────────────────────────────────────────────
function makeMockDb() {
  const db = {
    projects: [],
    project_progress: [],
    rev: 0,
    ticks: 0,
    calls: [],                  // every request, for asserting on request shape
    beforeWrite: null           // hook: fires between a select and its write
  };
  // projects has no rev sequence, only server_updated_at. Monotonic ISO
  // strings, so the >= cursor is exercised the way Postgres would serve it.
  db.stamp = () => new Date(Date.UTC(2026, 0, 1) + (++db.ticks) * 1000).toISOString();

  const pk = t => (t === 'projects' ? 'id' : 'project_id');
  const clone = o => JSON.parse(JSON.stringify(o));
  // Filters carry an operator, because the pull cursor depends on `>` for
  // server_rev and `>=` for the projects timestamp behaving differently — a
  // mock that treated them both as equality would let a broken cursor pass.
  const matches = (row, filters) => filters.every(f => {
    const v = row[f[1]];
    if (f[0] === 'eq') return v === f[2];
    if (f[0] === 'gt') return v > f[2];
    if (f[0] === 'gte') return v >= f[2];
    throw new Error('mock: unsupported filter ' + f[0]);
  });

  async function run(st) {
    db.calls.push({ table: st.table, op: st.op, filters: st.filters.slice() });
    const rows = db[st.table];

    if (st.op === 'select') {
      const hit = rows.filter(r => matches(r, st.filters)).map(clone);
      return { data: st.single ? (hit[0] || null) : hit, error: null };
    }

    // The interleave hook: another device writes in the window between this
    // op's read and its write. Fires once, then disarms.
    if (db.beforeWrite) { const fn = db.beforeWrite; db.beforeWrite = null; fn(db); }

    if (st.op === 'insert' || st.op === 'upsert') {
      const row = clone(st.payload);
      const existing = rows.find(r => r[pk(st.table)] === row[pk(st.table)]);
      if (existing && st.op === 'insert') {
        return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      }
      if (st.table === 'project_progress' && !db.projects.find(p => p.id === row.project_id)) {
        return { data: null, error: { code: '23503', message: 'foreign key violation' } };
      }
      if (st.table === 'project_progress') row.server_rev = ++db.rev;
      else row.server_updated_at = db.stamp();
      if (existing) Object.assign(existing, row); else rows.push(row);
      return { data: st.returning ? [clone(row)] : null, error: null };
    }

    if (st.op === 'update') {
      const hit = rows.filter(r => matches(r, st.filters));
      hit.forEach(r => {
        Object.assign(r, clone(st.payload));
        if (st.table === 'project_progress') r.server_rev = ++db.rev;
        else r.server_updated_at = db.stamp();
      });
      return { data: st.returning ? hit.map(clone) : null, error: null };
    }
    throw new Error('mock: unsupported op ' + st.op);
  }

  db.client = {
    from(table) {
      const st = { table, filters: [], op: null, payload: null, single: false, returning: false };
      const api = {
        select(cols) { if (st.op) st.returning = true; else st.op = 'select'; return api; },
        eq(k, v) { st.filters.push(['eq', k, v]); return api; },
        gt(k, v) { st.filters.push(['gt', k, v]); return api; },
        gte(k, v) { st.filters.push(['gte', k, v]); return api; },
        maybeSingle() { st.single = true; return run(st); },
        upsert(row) { st.op = 'upsert'; st.payload = row; return run(st); },
        insert(row) { st.op = 'insert'; st.payload = row; return run(st); },
        update(row) { st.op = 'update'; st.payload = row; return api; },
        then(res, rej) { return run(st).then(res, rej); }
      };
      return api;
    }
  };
  return db;
}

async function syncPushPullTest() {
  const results = [];
  // Object key order is an artefact of which bucket a field was read out of —
  // asserting on it would fail whenever readLocalProgress changed the order it
  // walks the buckets, which is not a behaviour anything depends on. Array
  // order IS meaningful (send order, row order) and is left alone.
  function canon(v) {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') {
      const out = {};
      Object.keys(v).sort().forEach(k => { out[k] = canon(v[k]); });
      return out;
    }
    return v;
  }
  function check(name, actual, expected) {
    const a = JSON.stringify(canon(actual)), e = JSON.stringify(canon(expected));
    results.push({ case: name, ok: a === e, got: a, want: e });
  }

  // ── Harness: stand up a fake signed-in device over a mock server ──
  //
  // This test drives the REAL push path, which means it calls the real
  // saveProjects() / saveOutbox() / writeLocalProgress() — all of which write
  // to the same localStorage the app's actual knitting progress lives in.
  // Restoring the in-memory globals afterwards is not enough: the junk left on
  // disk would come back the next time anything called loadProjects().
  //
  // So the snapshot is total. Every pt3_* key is captured up front, every
  // pt3_* key is removed at the end, and the snapshot is written back verbatim
  // — then re-read into memory, so RAM and disk agree again. Anyone can run
  // this on a device with real projects on it and get their app back.
  const UID = 'user-1';
  const snapshot = {};
  Object.keys(localStorage).filter(k => k.indexOf('pt3_') === 0)
    .forEach(k => { snapshot[k] = localStorage.getItem(k); });
  const saved = { sb: sb, session: session, activeProjectId: activeProjectId, view: view };

  function seedProject(id, name) {
    const proj = { id: id, patternId: 'peacock-tee', name: name, created: 1000, updatedAt: 1000 };
    projects.push(proj);
    return proj;
  }
  function seedProgress(id, values, clocks, base) {
    writeLocalProgress(id, values, clocks, base);
  }

  function device(db) {
    sb = db.client;
    session = { user: { id: UID, email: 'test@example.com' } };
    projects = [];
    outbox = {};
    activeProjectId = null;
    view = 'home';
    syncCursor = { uid: null, rev: 0, projTs: null };
    pendingConflicts = [];
    hideConflictBanner();
    localStorage.setItem('pt3_owner', UID);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  }

  // Put a project + its progress in the cloud, as another device would have.
  function cloudProject(db, id, name, extra) {
    db.projects.push(Object.assign({
      id: id, owner_id: UID, name: name, pattern_id: 'peacock-tee',
      created_ms: 1000, updated_ms: 1000, deleted_ms: null, server_updated_at: db.stamp()
    }, extra || {}));
  }
  function cloudProgress(db, id, values, clocks) {
    const f = splitFields(values);
    db.project_progress.push({
      project_id: id, owner_id: UID, steps: f.steps, counters: f.counters, cur: f.cur,
      chart_rows: f.chart_rows, global_rows: f.global_rows, clocks: clocks,
      server_rev: ++db.rev
    });
  }

  try {
    // ── 1. First push: nothing in the cloud yet ──
    let db = makeMockDb();
    device(db);
    seedProject('p1', 'Peacock Tee');
    seedProgress('p1', { 's:a': true, 'c:b': 3, 'cr:chart': 10, cur: 1, global_rows: 13 },
                       { 's:a': 100, 'c:b': 100, 'cr:chart': 100, cur: 100, global_rows: 100 }, {});
    enqueue('project', 'p1'); enqueue('progress', 'p1');
    await flush('test');

    check('first push → project row created',
      db.projects.map(p => ({ id: p.id, owner: p.owner_id, name: p.name, del: p.deleted_ms })),
      [{ id: 'p1', owner: UID, name: 'Peacock Tee', del: null }]);
    check('first push → progress row created with the right columns',
      (() => { const r = db.project_progress[0];
        return { steps: r.steps, counters: r.counters, cur: r.cur,
                 chart_rows: r.chart_rows, global_rows: r.global_rows, owner: r.owner_id }; })(),
      { steps: { a: true }, counters: { b: 3 }, cur: 1,
        chart_rows: { chart: 10 }, global_rows: 13, owner: UID });
    check('first push → outbox drained', Object.keys(outbox).length, 0);
    check('first push → base advanced to the pushed clocks',
      readBase('p1'), { 's:a': 100, 'c:b': 100, 'cr:chart': 100, cur: 100, global_rows: 100 });

    // ── 2. THE ONE THAT MATTERS ──
    // Another device has already pushed a chart row this device has never seen.
    // A whole-row upsert would erase it and nobody would ever be told.
    db = makeMockDb();
    device(db);
    seedProject('p2', 'Shared');
    // Cloud: the iPad moved the chart to row 31.
    db.projects.push({ id: 'p2', owner_id: UID, name: 'Shared', pattern_id: 'peacock-tee',
                       created_ms: 1000, updated_ms: 1000, deleted_ms: null });
    db.project_progress.push({ project_id: 'p2', owner_id: UID,
      steps: {}, counters: {}, cur: 0, chart_rows: { chart: 31 }, global_rows: 31,
      clocks: { 'cr:chart': 300, global_rows: 300 }, server_rev: ++db.rev });
    // This device ticked a step instead, and last agreed with the cloud at t=100.
    seedProgress('p2', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 400 },
                       { 's:a': 100 });
    enqueue('progress', 'p2');
    await flush('test');

    check('push merges instead of clobbering → cloud keeps BOTH changes',
      (() => { const r = db.project_progress[0];
        return { steps: r.steps, chart_rows: r.chart_rows, global_rows: r.global_rows }; })(),
      { steps: { a: true }, chart_rows: { chart: 31 }, global_rows: 31 });
    check('push merges instead of clobbering → local picks up the remote row too',
      readLocalProgress('p2').values,
      { 's:a': true, 'cr:chart': 31, cur: 0, global_rows: 31 });

    // ── 3. The race the server_rev guard exists for ──
    // Another device writes in the window between this device's select and its
    // update. The guarded update must miss, and the retry must merge again.
    db = makeMockDb();
    device(db);
    seedProject('p3', 'Racy');
    db.projects.push({ id: 'p3', owner_id: UID, name: 'Racy', pattern_id: 'peacock-tee',
                       created_ms: 1000, updated_ms: 1000, deleted_ms: null });
    db.project_progress.push({ project_id: 'p3', owner_id: UID,
      steps: {}, counters: {}, cur: 0, chart_rows: {}, global_rows: 0,
      clocks: {}, server_rev: ++db.rev });
    db.beforeWrite = d => {                 // the other device slips in here
      const row = d.project_progress[0];
      row.counters = { b: 9 };
      row.clocks = Object.assign({}, row.clocks, { 'c:b': 500 });
      row.server_rev = ++d.rev;
    };
    seedProgress('p3', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 400 }, {});
    enqueue('progress', 'p3');
    await flush('test');

    check('server_rev guard → the interleaved write survives',
      (() => { const r = db.project_progress[0];
        return { steps: r.steps, counters: r.counters }; })(),
      { steps: { a: true }, counters: { b: 9 } });
    check('server_rev guard → outbox drained after the retry',
      Object.keys(outbox).length, 0);

    // ── 4. A stale queued rename must not undo a newer cloud rename ──
    db = makeMockDb();
    device(db);
    const p4 = seedProject('p4', 'Old name');
    p4.updatedAt = 2000;
    db.projects.push({ id: 'p4', owner_id: UID, name: 'Newer name', pattern_id: 'peacock-tee',
                       created_ms: 1000, updated_ms: 5000, deleted_ms: null });
    enqueue('project', 'p4');
    await flush('test');

    check('newer cloud project wins → cloud name untouched',
      db.projects[0].name, 'Newer name');
    check('newer cloud project wins → local adopts it',
      projects.find(p => p.id === 'p4').name, 'Newer name');

    // ── 5. Progress for a project the cloud has never seen ──
    // Migrated progress can be queued with no project op behind it; the insert
    // hits a foreign key and the push has to create the project itself.
    db = makeMockDb();
    device(db);
    seedProject('p5', 'Orphan');
    seedProgress('p5', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 400 }, {});
    enqueue('progress', 'p5');            // deliberately NOT enqueueing the project
    await flush('test');

    check('orphan progress → project row created on the fly',
      db.projects.map(p => p.id), ['p5']);
    check('orphan progress → progress landed',
      db.project_progress[0].steps, { a: true });

    // ── 6. Signed out: nothing leaves the device ──
    db = makeMockDb();
    device(db);
    session = null;
    seedProject('p6', 'Private');
    enqueue('project', 'p6');
    await flush('test');
    check('signed out → nothing pushed, nothing dequeued',
      { rows: db.projects.length, queued: Object.keys(outbox).length }, { rows: 0, queued: 1 });

    // ── 7. Signed in, but this device's data belongs to someone else ──
    db = makeMockDb();
    device(db);
    localStorage.setItem('pt3_owner', 'someone-else');
    seedProject('p7', 'Not mine');
    enqueue('project', 'p7');
    await flush('test');
    check('unclaimed data → not uploaded under the wrong account',
      { rows: db.projects.length, queued: Object.keys(outbox).length }, { rows: 0, queued: 1 });

    // ── 8. A failed push leaves the op queued ──
    db = makeMockDb();
    device(db);
    seedProject('p8', 'Fails');
    const realFrom = db.client.from;
    db.client.from = () => { throw new Error('network: failed to fetch'); };
    enqueue('project', 'p8');
    await flush('test');
    db.client.from = realFrom;
    check('push error → op stays queued, nothing marked synced',
      { queued: Object.keys(outbox).length, hasError: !!lastSyncError }, { queued: 1, hasError: true });

    // ─────────────────────────────────────────
    // PULL
    // ─────────────────────────────────────────

    // ── 9. A fresh device signing in gets the library ──
    db = makeMockDb();
    device(db);
    cloudProject(db, 'q1', 'From the cloud');
    cloudProgress(db, 'q1', { 's:a': true, 'cr:chart': 12, cur: 2, global_rows: 12 },
                            { 's:a': 700, 'cr:chart': 700, cur: 700, global_rows: 700 });
    await pull('test');

    check('fresh device pull → project appears',
      projects.map(p => ({ id: p.id, name: p.name })), [{ id: 'q1', name: 'From the cloud' }]);
    check('fresh device pull → progress lands',
      readLocalProgress('q1').values,
      { 's:a': true, 'cr:chart': 12, cur: 2, global_rows: 12 });
    check('fresh device pull → base records agreement, so nothing is re-pushed',
      { base: readBase('q1'), queued: Object.keys(outbox).length },
      { base: { 's:a': 700, 'cr:chart': 700, cur: 700, global_rows: 700 }, queued: 0 });

    // ── 10. THE HEADLINE CASE ──
    // Phone ticks Materials steps; iPad sits on chart row 31. Different fields,
    // so both survive and the knitter is asked nothing.
    db = makeMockDb();
    device(db);
    seedProject('q2', 'Both');
    cloudProject(db, 'q2', 'Both');
    cloudProgress(db, 'q2', { 'cr:chart': 31, cur: 0, global_rows: 31 },
                            { 'cr:chart': 800, global_rows: 800 });
    seedProgress('q2', { 's:a': true, 's:b': true, cur: 0, global_rows: 0 },
                       { 's:a': 900, 's:b': 900 }, {});
    await pull('test');

    check('disjoint edits merge silently → both sides survive',
      readLocalProgress('q2').values,
      { 's:a': true, 's:b': true, 'cr:chart': 31, cur: 0, global_rows: 31 });
    check('disjoint edits merge silently → no conflicts raised', pendingConflicts.length, 0);
    check('disjoint edits merge silently → local-only edits queued to push back',
      Object.keys(outbox), ['progress:q2']);

    // ── 11. A real clash ──
    // Both devices moved the chart row while offline. Phase 6 keeps what is on
    // screen and gives it a fresh clock so it settles rather than ping-ponging.
    db = makeMockDb();
    device(db);
    seedProject('q3', 'Clash');
    cloudProject(db, 'q3', 'Clash');
    cloudProgress(db, 'q3', { 'cr:chart': 23, cur: 0, global_rows: 23 }, { 'cr:chart': 800 });
    seedProgress('q3', { 'cr:chart': 31, cur: 0, global_rows: 0 }, { 'cr:chart': 900 },
                       { 'cr:chart': 100 });
    const beforeClash = Date.now();
    await pull('test');

    check('conflict → this device keeps its value',
      readLocalProgress('q3').values['cr:chart'], 31);
    check('conflict → reported, and the kept value gets a decisive fresh clock',
      { n: pendingConflicts.length, key: pendingConflicts[0] && pendingConflicts[0].k,
        fresh: (lsGetJson('q3', 'clk', {})['cr:chart'] || 0) >= beforeClash },
      { n: 1, key: 'cr:chart', fresh: true });
    check('conflict → queued to push, since the server does not have it yet',
      Object.keys(outbox), ['progress:q3']);

    // ── 12. A delete made on another device ──
    db = makeMockDb();
    device(db);
    seedProject('q4', 'Doomed');
    seedProgress('q4', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 100 }, {});
    activeProjectId = 'q4'; view = 'project';
    cloudProject(db, 'q4', 'Doomed', { updated_ms: 9000, deleted_ms: 9000 });
    await pull('test');

    check('remote delete → tombstoned locally, not just hidden',
      { deleted: !!projects.find(p => p.id === 'q4').deletedAt, live: liveProjects().length },
      { deleted: true, live: 0 });
    check('remote delete → progress keys purged',
      localStorage.getItem('pt3_proj_q4_state'), null);
    check('remote delete → the open project is closed',
      { activeProjectId: activeProjectId, view: view }, { activeProjectId: null, view: 'home' });

    // ── 13. A delete made HERE must not be undone by the pull that follows ──
    db = makeMockDb();
    device(db);
    projects.push({ id: 'q5', patternId: 'peacock-tee', name: 'Gone', created: 1000,
                    updatedAt: 9000, deletedAt: 9000 });
    cloudProject(db, 'q5', 'Gone');                       // cloud still has it live
    cloudProgress(db, 'q5', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 800 });
    await pull('test');

    check('local tombstone survives a stale cloud copy',
      { live: liveProjects().length, state: localStorage.getItem('pt3_proj_q5_state') },
      { live: 0, state: null });

    // ── 14. The cursor ──
    db = makeMockDb();
    device(db);
    cloudProject(db, 'q6', 'Cursor');
    cloudProgress(db, 'q6', { 's:a': true, cur: 0, global_rows: 0 }, { 's:a': 700 });
    await pull('test');
    const afterFirst = { rev: syncCursor.rev, projTs: syncCursor.projTs, uid: syncCursor.uid };
    db.calls.length = 0;
    await pull('test');
    const secondPullSawRows = db.calls.filter(c => c.table === 'project_progress').length;

    check('cursor advances past what was pulled',
      { advanced: afterFirst.rev > 0 && !!afterFirst.projTs, uid: afterFirst.uid },
      { advanced: true, uid: UID });
    check('a second pull with nothing new changes nothing',
      { queued: Object.keys(outbox).length, queries: secondPullSawRows },
      { queued: 0, queries: 1 });

    // ── 15. A different account on the same device ──
    // Carrying one person's cursor into another's first pull would hand them an
    // empty library with their data sitting right there in the cloud.
    session = { user: { id: 'user-2', email: 'other@example.com' } };
    localStorage.setItem('pt3_owner', 'user-2');
    db.projects.forEach(p => { p.owner_id = 'user-2'; });
    db.project_progress.forEach(p => { p.owner_id = 'user-2'; });
    projects = [];
    await pull('test');
    check('a different account resets the cursor and pulls everything',
      { names: projects.map(p => p.name), uid: syncCursor.uid },
      { names: ['Cursor'], uid: 'user-2' });

    // ─────────────────────────────────────────
    // CLOCK CORRECTION
    // ─────────────────────────────────────────

    // ── 16. Correcting a fast clock must not move stamps backwards ──
    //
    // The failure it prevents is the worst kind here: a new edit stamped
    // earlier than an older one never exceeds its base, so it reads as
    // unchanged and is never pushed. The knitter counts rows all evening and
    // none of them leave the phone, with nothing on screen to say so.
    const savedSkew = serverSkew, savedFloor = stampFloor;
    serverSkew = 0; stampFloor = 0;
    const ahead = Date.now() + 3600000;
    noteExistingClocks({ x: ahead });          // a clock already on disk, an hour ahead
    serverSkew = -86400000;                    // "this device is a day fast"
    const s1 = syncNow(), s2 = syncNow();
    check('clock correction never stamps at or below what is already on disk',
      { aboveExisting: s1 > ahead, strictlyIncreasing: s2 > s1 },
      { aboveExisting: true, strictlyIncreasing: true });

    // ── 17. And an absurd skew is capped rather than trusted ──
    stampFloor = 0; serverSkew = 10 * 3600000;
    const capped = syncNow() - Date.now();
    check('skew clamped to ±1h', capped <= 3600000 + 1000, true);
    serverSkew = savedSkew; stampFloor = savedFloor;

    // ── 18. The interval never runs while the page is hidden ──
    // This app sits open for weeks. A timer that kept firing while buried
    // would be a request a minute, forever, for someone who isn't knitting.
    const realVis = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    startSyncPolling();
    const hiddenTimer = pullTimer;
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    startSyncPolling();
    const visibleTimer = pullTimer;
    stopSyncPolling();
    delete document.visibilityState;
    if (realVis) Object.defineProperty(Document.prototype, 'visibilityState', realVis);
    check('polling starts only while visible',
      { hidden: hiddenTimer, visible: !!visibleTimer, stopped: pullTimer },
      { hidden: null, visible: true, stopped: null });

    // ─────────────────────────────────────────
    // CONFLICT RESOLUTION
    // ─────────────────────────────────────────

    // A project on a real pattern, so the labels have something to name.
    const setupClash = async () => {
      db = makeMockDb();
      device(db);
      const chartPhase = PATTERNS[0].phases.find(ph => ph.hasChart);
      projects.push({ id: 'c1', patternId: 'peacock-tee', name: 'Clashing Tee',
                      created: 1000, updatedAt: 1000 });
      cloudProject(db, 'c1', 'Clashing Tee');
      cloudProgress(db, 'c1', { ['cr:' + chartPhase.id]: 23, cur: 0, global_rows: 23 },
                              { ['cr:' + chartPhase.id]: 800 });
      seedProgress('c1', { ['cr:' + chartPhase.id]: 31, cur: 0, global_rows: 0 },
                         { ['cr:' + chartPhase.id]: 900 }, { ['cr:' + chartPhase.id]: 100 });
      await pull('test');
      return 'cr:' + chartPhase.id;
    };

    // ── 19. The other device's value is kept, or the choice isn't reversible ──
    let key = await setupClash();
    check('conflict recorded with BOTH values, so the choice can be undone',
      pendingConflicts.map(c => ({ p: c.p, k: c.k, mine: c.mine, theirs: c.theirs })),
      [{ p: 'c1', k: key, mine: 31, theirs: 23 }]);

    // ── 20. It survives a reload — a conflict can land while the phone is away ──
    const persisted = JSON.parse(localStorage.getItem('pt3_conflicts') || '[]');
    pendingConflicts = [];
    loadConflicts();
    check('conflicts persist across a reload',
      { onDisk: persisted.length, reloaded: pendingConflicts.length }, { onDisk: 1, reloaded: 1 });

    // ── 21. The label is read from the pattern, not the field key ──
    check('the row names the chart and formats the values',
      (() => { const L = conflictLabel(pendingConflicts[0]);
               return { field: L.field, mine: L.fmt(31) }; })(),
      { field: 'Yoke chart — chart row', mine: '31' });

    // ── 22. Choosing the other device ──
    //
    // The outbox is drained first, deliberately. The pull that produced the
    // clash already queued this project, so leaving it would make "queued"
    // true no matter what resolveConflict did — the assertion would pass an
    // implementation that never tells the other device the answer.
    outbox = {}; saveOutbox();
    resolveConflict('c1', key, true);
    check('use the other → their value is written, queued, and the question is gone',
      { value: readLocalProgress('c1').values[key],
        queued: Object.keys(outbox).indexOf('progress:c1') >= 0,
        left: pendingConflicts.length },
      { value: 23, queued: true, left: 0 });

    // ── 23. Choosing this device keeps what is on screen ──
    key = await setupClash();
    const clockBefore = lsGetJson('c1', 'clk', {})[key];
    outbox = {}; saveOutbox();
    resolveConflict('c1', key, false);
    check('keep this device → value stands, with a fresh clock so it wins next time',
      { value: readLocalProgress('c1').values[key],
        clockMoved: lsGetJson('c1', 'clk', {})[key] > clockBefore,
        queued: Object.keys(outbox).indexOf('progress:c1') >= 0,
        left: pendingConflicts.length },
      { value: 31, clockMoved: true, queued: true, left: 0 });

    // ── 23b. The banner count follows the answers ──
    // It kept saying "3 things" after two had been settled, which is worse
    // than no banner: it advertises questions that no longer exist.
    key = await setupClash();
    pendingConflicts.push({ p: 'c1', k: 'global_rows', mine: 5, theirs: 9, at: Date.now() });
    saveConflicts();
    showConflictBanner();
    const bannerText = () => { const b = document.getElementById('conflict-banner');
                               return b ? b.textContent.replace('Review', '').trim() : null; };
    const two = bannerText();
    resolveConflict('c1', 'global_rows', false);
    const one = bannerText();
    resolveConflict('c1', key, false);
    check('the banner counts down as questions are answered, then goes away',
      { two: two, one: one, none: bannerText() },
      { two: '2 things were changed in two places',
        one: 'One thing was changed in two places',
        none: null });

    // ── 24. Dismissing the sheet is an answer, not a deferral ──
    key = await setupClash();
    resolveAll(false);
    check('dismiss → this device wins and nothing is left to nag about',
      { value: readLocalProgress('c1').values[key], left: liveConflicts().length },
      { value: 31, left: 0 });

    // ── 25. Questions that answered themselves are dropped ──
    key = await setupClash();
    projects.find(p => p.id === 'c1').deletedAt = 9000;
    check('a conflict on a deleted project is not asked about', liveConflicts().length, 0);

    key = await setupClash();
    // A later sync settled on the other device's value anyway.
    (() => { const l = readLocalProgress('c1'); const v = Object.assign({}, l.values);
             v[key] = 23; writeLocalProgress('c1', v, l.clocks, readBase('c1')); })();
    check('a conflict the two devices have since agreed on is dropped',
      liveConflicts().length, 0);

    // ── 26. Nothing may load after app.js ──
    //
    // app.js ends with the bootstrap, so everything it calls must already
    // exist. bannerStack() used to live in a trailing inline <script>, which
    // meant the boot-time conflict banner threw a ReferenceError and took the
    // rest of the bootstrap with it — initCloud() included. A device with an
    // unanswered conflict came up with sync silently dead, and nothing on
    // screen said so. This asserts the ordering that makes that impossible.
    check('js/core/app.js is the last script the page loads',
      (() => {
        const real = Array.from(document.scripts)
          .filter(s => !(s.src || '').includes('selftest'));
        const last = real[real.length - 1];
        return last && last.src ? last.src.split('/').slice(-3).join('/') : 'INLINE SCRIPT';
      })(),
      'js/core/app.js');

    // ─────────────────────────────────────────
    // PATTERN VERSIONS
    // ─────────────────────────────────────────

    // ── 27. The hash ignores prose and catches structure ──
    //
    // Both halves matter and they pull in opposite directions. Too sensitive
    // and every typo fix freezes every project in the family; too blunt and a
    // renamed step silently moves someone's ticks onto the wrong rows.
    const REF = PATTERNS[0];
    const refHash = structHash(REF);
    const variant = fn => { const c = JSON.parse(JSON.stringify(REF)); fn(c); return structHash(c); };
    const steps = c => c.phases.reduce((a, ph) => a.concat(ph.steps), []);

    check('prose edits do not move the hash',
      {
        stepText:    variant(c => { c.phases[0].steps[0].text = 'rewritten entirely'; }) === refHash,
        phaseName:   variant(c => { c.phases[0].name = 'Renamed'; }) === refHash,
        patternName: variant(c => { c.name = 'New'; c.desc = 'New'; }) === refHash,
        bulletText:  variant(c => { const s = steps(c).find(x => x.bullets); if (s) s.bullets[0] = 'reworded'; }) === refHash,
        deepCopy:    structHash(JSON.parse(JSON.stringify(REF))) === refHash
      },
      { stepText: true, phaseName: true, patternName: true, bulletText: true, deepCopy: true });

    check('structural edits always move the hash',
      {
        addStep:    variant(c => c.phases[0].steps.push({ id: 'new', text: 'x' })) !== refHash,
        removeStep: variant(c => c.phases[0].steps.pop()) !== refHash,
        renameId:   variant(c => { c.phases[0].steps[0].id = 'renamed'; }) !== refHash,
        reorder:    variant(c => { const a = c.phases[0].steps; a.unshift(a.pop()); }) !== refHash,
        movePhase:  variant(c => { c.phases.unshift(c.phases.pop()); }) !== refHash,
        target:     variant(c => { const s = steps(c).find(x => x.rows); s.target += 2; }) !== refHash,
        chartLen:   variant(c => { c.chart.push(c.chart[0].slice()); }) !== refHash,
        hasChart:   variant(c => { c.phases[0].hasChart = true; }) !== refHash
      },
      { addStep: true, removeStep: true, renameId: true, reorder: true,
        movePhase: true, target: true, chartLen: true, hasChart: true });

    check('the shipped patterns all hash differently',
      new Set(PATTERNS.map(structHash)).size, PATTERNS.length);

    // ── 28. Freeze, then adopt ──
    //
    // Stages a real structural "deploy" against the live registry entry: one
    // step dropped, one added, one phase inserted at the front. The inserted
    // phase is the interesting part — it shifts every later index, so `cur`
    // has to move to stay on the same section.
    db = makeMockDb();
    device(db);
    const patBackup = JSON.parse(JSON.stringify(REF));
    const patIndex = PATTERNS.findIndex(p => p.id === REF.id);
    try {
      const proj = createProject(REF.id);
      activateProject(proj.id);
      const doomed = PHASES[0].steps[2].id;
      const keptA = PHASES[0].steps[0].id, keptB = PHASES[0].steps[1].id;
      state[keptA] = state[keptB] = state[doomed] = true;
      cur = 2;
      const sectionBefore = PHASES[2].id;
      save();

      const frozenHash = storedHash(proj.id);
      const live = PATTERNS[patIndex];
      live.phases[0].steps = live.phases[0].steps.filter(s => s.id !== doomed);
      live.phases[0].steps.push({ id: 'newly-added', text: 'did not exist before' });
      live.phases.unshift({ id: 'inserted-phase', name: 'Inserted', steps: [{ id: 'ins-1', text: 'new' }] });

      activateProject(proj.id);
      check('a structural change freezes the project on the version it started on',
        { changed: patternChanged, frozen: patternFrozen,
          firstPhase: PHASES[0].id, stillOnSection: PHASES[cur].id },
        { changed: true, frozen: true, firstPhase: 'mat', stillOnSection: sectionBefore });

      check('the summary counts what actually changed',
        patternChangeSummary(proj.id), { added: 2, removed: 1, ticks: 3, kept: 2 });

      // Until adopted, nothing about the project moves.
      check('the frozen hash is not quietly re-stamped',
        storedHash(proj.id), frozenHash);

      outbox = {}; saveOutbox();
      adoptPattern(proj.id);
      activateProject(proj.id);
      const st = lsGetJson(proj.id, 'state', {});
      check('adopting takes the new structure and keeps the knitter in place',
        { changed: patternChanged, frozen: patternFrozen,
          firstPhase: PHASES[0].id, stillOnSection: PHASES[cur].id,
          hashRealigned: storedHash(proj.id) === structHash(PATTERNS[patIndex]),
          queued: Object.keys(outbox).sort() },
        { changed: false, frozen: false,
          firstPhase: 'inserted-phase', stillOnSection: sectionBefore,
          hashRealigned: true,
          queued: ['progress:' + proj.id, 'project:' + proj.id] });

      // Nothing is destroyed. The orphaned tick costs a few bytes and comes
      // back if the step ever does — and deleting it would fight sync, since
      // the other device has not adopted yet and would push it straight back.
      check('a tick for a step that no longer exists is kept, not deleted',
        { orphan: st[doomed], kept: [st[keptA], st[keptB]] },
        { orphan: true, kept: [true, true] });

      // ── 29. The pattern columns that go up ──
      //
      // The doc is 10-40KB, so sending it with every rename would cost more
      // than a day's knitting. It is only irreplaceable once the code has
      // moved on — which is exactly when it starts being sent.
      const proj2 = createProject(REF.id);
      check('an up-to-date project sends its hash but no doc',
        (() => { const c = patternColumns(proj2.id);
                 return { hash: !!c.pattern_struct_hash, doc: c.pattern_doc }; })(),
        { hash: true, doc: null });

      const frozenProj = createProject(REF.id);
      PATTERNS[patIndex].phases[0].steps.push({ id: 'another-new', text: 'x' });
      check('a diverged project sends the doc, because nothing else has it',
        (() => { const c = patternColumns(frozenProj.id);
                 return { hash: !!c.pattern_struct_hash, docPhases: !!(c.pattern_doc && c.pattern_doc.phases.length) }; })(),
        { hash: true, docPhases: true });

      // ── 30. A frozen project opening on a device that has never seen it ──
      const arriving = { id: 'remote-frozen', name: 'From elsewhere', pattern_id: REF.id,
                         created_ms: 1000, updated_ms: 1000, deleted_ms: null,
                         pattern_struct_hash: 'deadbeefdeadbeef',
                         pattern_doc: JSON.parse(JSON.stringify(patBackup)) };
      applyRemoteProject(arriving);
      check('a pulled project brings the structure its ticks belong to',
        { hash: storedHash('remote-frozen'),
          snapshotPhases: (frozenPattern('remote-frozen') || {}).phases.length },
        { hash: 'deadbeefdeadbeef', snapshotPhases: patBackup.phases.length });

      // A local snapshot is a decision made here; a round trip through the
      // server must not overwrite it.
      //
      // Called directly rather than through applyRemoteProject(), which
      // early-returns on a row that isn't newer — routing through it would
      // mean the guard below was never reached and the assertion passed for
      // the wrong reason.
      applyRemotePattern(Object.assign({}, arriving, { pattern_struct_hash: 'ffffffffffffffff' }));
      check('a remote row never overwrites a snapshot this device already has',
        storedHash('remote-frozen'), 'deadbeefdeadbeef');

    } finally {
      PATTERNS[patIndex] = patBackup;   // undo the simulated deploy
    }

  } finally {
    // Put the device back exactly as it was found — disk first, then memory
    // from disk, so the two cannot disagree.
    cancelScheduledFlush();
    Object.keys(localStorage).filter(k => k.indexOf('pt3_') === 0)
      .forEach(k => localStorage.removeItem(k));
    Object.keys(snapshot).forEach(k => localStorage.setItem(k, snapshot[k]));

    sb = saved.sb; session = saved.session;
    activeProjectId = saved.activeProjectId; view = saved.view;
    lastSyncError = null; pendingConflicts = [];
    delete navigator.onLine;          // reveal the real getter again
    syncCursor = { uid: null, rev: 0, projTs: null };
    loadProjects(); loadOutbox(); loadSyncStatus(); loadCursor(); loadConflicts();
    hideConflictBanner();
    if (activeProjectId) loadProjectState();
    resetHeaderKey(); render();
  }

  const failed = results.filter(r => !r.ok);
  console.table(results.map(r => ({ case: r.case, ok: r.ok })));
  failed.forEach(f => console.error('FAIL ' + f.case + '\n  got  ' + f.got + '\n  want ' + f.want));
  console.info('[push/pull selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

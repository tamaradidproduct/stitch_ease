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
    check('disjoint edits merge silently → no conflicts raised', lastConflicts.length, 0);
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
      { n: lastConflicts.length, key: lastConflicts[0] && lastConflicts[0].key,
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

  } finally {
    // Put the device back exactly as it was found — disk first, then memory
    // from disk, so the two cannot disagree.
    cancelScheduledFlush();
    Object.keys(localStorage).filter(k => k.indexOf('pt3_') === 0)
      .forEach(k => localStorage.removeItem(k));
    Object.keys(snapshot).forEach(k => localStorage.setItem(k, snapshot[k]));

    sb = saved.sb; session = saved.session;
    activeProjectId = saved.activeProjectId; view = saved.view;
    lastSyncError = null; lastConflicts = [];
    delete navigator.onLine;          // reveal the real getter again
    syncCursor = { uid: null, rev: 0, projTs: null };
    loadProjects(); loadOutbox(); loadSyncStatus(); loadCursor();
    if (activeProjectId) loadProjectState();
    resetHeaderKey(); render();
  }

  const failed = results.filter(r => !r.ok);
  console.table(results.map(r => ({ case: r.case, ok: r.ok })));
  failed.forEach(f => console.error('FAIL ' + f.case + '\n  got  ' + f.got + '\n  want ' + f.want));
  console.info('[push/pull selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

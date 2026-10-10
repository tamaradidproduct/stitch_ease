// ─────────────────────────────────────────────
// SELF-TEST for sized CSV imports (the `sizes` column and {a|b|c} placeholders
// in js/core/patternImport.js). Not shipped.
//
// Deliberately absent from index.html and from the service worker precache. To
// run it, from the console on a loaded page:
//
//   const s = document.createElement('script');
//   s.src = 'js/core/patternImport.sizes.selftest.js';
//   document.body.append(s);
//
// then call importSizesSelfTest(). It builds patterns in memory only — nothing
// is written to PATTERNS or localStorage. Returns {passed, failed}.
// ─────────────────────────────────────────────
function importSizesSelfTest() {
  const results = [];
  const check = (name, actual, expected) => {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  };
  const throwsWith = (name, fn, needle) => {
    let msg = '';
    try { fn(); } catch (e) { msg = e.message || String(e); }
    results.push({ case: name, ok: msg.indexOf(needle) !== -1, got: msg || '(no error)', want: needle });
  };

  const HEAD = 'pattern_id,pattern_name,pattern_badge,pattern_desc,phase_id,phase_name,phase_desc,kind,entry_id,text,bullets,repeat_times,sub_row_id,sub_row_text,sizes\n';
  const csv = body => HEAD + body;
  const build = body => buildPatternFromRows(parseCsv(csv(body)));
  const textsFor = (pat, i) => pat.buildPhases(i)[0].entries.map(e => e.text);

  // ── two sizes ──
  const two = build(
    'p,Mitts,Knit,desc,cuff,Cuff,,row,co,"CO {30|34} sts",,,,,XS/S|M/L\n' +
    'p,,,,cuff,,,row,rib,Rib 2.5 cm,,,,,\n');
  check('sized template has sizes', two.sizes.map(s => s.name), ['XS/S', 'M/L']);
  check('sized template has no flat phases', two.phases, undefined);
  check('size 0 picks first value', textsFor(two, 0), ['CO 30 sts', 'Rib 2.5 cm']);
  check('size 1 picks second value', textsFor(two, 1), ['CO 34 sts', 'Rib 2.5 cm']);
  check('template raw text keeps placeholder', two.sizedPhases[0].entries[0].text, 'CO {30|34} sts');
  check('resolving never mutates the template', (two.buildPhases(1), two.sizedPhases[0].entries[0].text), 'CO {30|34} sts');
  check('ids are untouched', two.buildPhases(1)[0].entries.map(e => e.id), ['co', 'rib']);

  // ── nine sizes ──
  const nine = build(
    'p,Sweater,,,a,A,,row,r1,"Cast on {120|128|136|144|152|160|168|176|184}",,,,,32|34|36|38|40|42|44|46|48\n');
  check('nine sizes parsed', nine.sizes.length, 9);
  check('size 8 picks ninth value', textsFor(nine, 8), ['Cast on 184']);
  check('size 4 picks fifth value', textsFor(nine, 4), ['Cast on 152']);

  // ── placeholders in every text field ──
  const all = build(
    'p,P,,,a,Phase {X|Y},"Needles {3|4} mm",note,n1,Note {1|2},"Bullet {a|b}|Plain",,,,S|L\n' +
    'p,,,,a,,,repeat,rp,Rep,,2,s1,"Sub {7|9}",\n');
  const phA = all.buildPhases(1)[0];
  check('phase name', phA.name, 'Phase Y');
  check('phase desc', phA.desc, 'Needles 4 mm');
  check('note text', phA.entries[0].text, 'Note 2');
  check('bullets split outside braces only', phA.entries[0].bullets, ['Bullet b', 'Plain']);
  check('repeat sub-row text', phA.entries[1].rows[0].text, 'Sub 9');

  // ── sizedPattern turns the template into an ordinary doc ──
  const savedPatterns = PATTERNS.slice();
  all.id = 'selftest-sized-' + Math.random().toString(36).slice(2, 7);
  PATTERNS.push(all);
  const doc = sizedPattern(all, 1);
  check('sizedPattern: concrete phases', doc.phases[0].entries[0].text, 'Note 2');
  check('sizedPattern: sizeIndex', doc.sizeIndex, 1);
  check('sizedPattern: no template keys left', [doc.sizes, doc.sizedPhases, doc.buildPhases], [undefined, undefined, undefined]);
  check('struct hash differs by nothing but prose', structHash(sizedPattern(all, 0)) === structHash(sizedPattern(all, 1)), true);
  dropSizedCache(all.id);
  check('dropSizedCache clears memo', Object.keys(sizedCache).filter(k => k.indexOf(all.id + ':') === 0), []);
  PATTERNS.length = 0; savedPatterns.forEach(p => PATTERNS.push(p));

  // ── save → load round trip ──
  const revived = attachSizeBuilder(JSON.parse(JSON.stringify(two)));
  check('round trip: builder rebuilt', textsFor(revived, 1), ['CO 34 sts', 'Rib 2.5 cm']);

  // ── sync sanitiser ──
  const synced = JSON.parse(JSON.stringify(two));
  const clean = sanitizeSyncedPattern(synced, synced.id);
  check('sanitised sized doc keeps sizes', clean.sizes.map(s => s.name), ['XS/S', 'M/L']);
  check('sanitised sized doc resolves', textsFor(attachSizeBuilder(clean), 0), ['CO 30 sts', 'Rib 2.5 cm']);
  throwsWith('sanitiser: sizes need >= 2', () => { const d = JSON.parse(JSON.stringify(two)); d.sizes = [d.sizes[0]]; sanitizeSyncedPattern(d, d.id); }, 'malformed sizes');
  throwsWith('sanitiser: unsafe id inside sizedPhases', () => { const d = JSON.parse(JSON.stringify(two)); d.sizedPhases[0].id = "a'b"; sanitizeSyncedPattern(d, d.id); }, 'unsafe id');

  // ── import errors ──
  throwsWith('wrong value count names the row', () =>
    build('p,P,,,a,A,,row,r1,"CO {30|34|38}",,,,,S|L\n'), 'Row 2: {30|34|38} has 3 values, expected 2');
  throwsWith('empty value rejected', () =>
    build('p,P,,,a,A,,row,r1,"CO {30||38}",,,,,S|M|L\n'), 'empty value');
  throwsWith('one size is not a sized pattern', () =>
    build('p,P,,,a,A,,row,r1,CO 30,,,,,S\n'), 'at least two sizes');
  throwsWith('duplicate size names', () =>
    build('p,P,,,a,A,,row,r1,CO 30,,,,,S|s\n'), 'twice');
  throwsWith('empty size name', () =>
    build('p,P,,,a,A,,row,r1,CO 30,,,,,S||L\n'), 'empty size name');

  // ── steps that exist for some sizes only (for_sizes) ──
  const HEAD2 = HEAD.replace(',sizes', ',sizes,for_sizes');
  const build2 = body => buildPatternFromRows(parseCsv(HEAD2 + body));
  const ids = (pat, i) => pat.buildPhases(i).map(ph => ph.id + ':' + ph.entries.map(e => e.id).join(','));
  const fs3 = build2(
    'p,P,,,a,A,,row,r1,Always,,,,,S|M|L,\n' +
    'p,,,,a,,,row,only-l,Extra for L,,,,,,L\n' +
    'p,,,,a,,,row,sm-a,Version for S and M,,,,,,S|M\n' +
    'p,,,,b,B,,row,b1,"Only for M, L",,,,,,m|L\n');
  check('for_sizes: S gets always + sm-a, no phase b', ids(fs3, 0), ['a:r1,sm-a']);
  check('for_sizes: M gets sm-a and phase b (case-insensitive name)', ids(fs3, 1), ['a:r1,sm-a', 'b:b1']);
  check('for_sizes: L gets only-l and phase b', ids(fs3, 2), ['a:r1,only-l', 'b:b1']);
  check('for_sizes: `only` never leaks into the built phases', JSON.stringify(fs3.buildPhases(2)).indexOf('only"'), -1);

  const rep = build2(
    'p,P,,,a,A,,repeat,rp,Rep,,{6|7},s1,Always,S|M,\n' +
    'p,,,,a,,,repeat,rp,,,{6|7},s2,Medium only,,M\n');
  check('repeat times placeholder resolves to a number', [rep.buildPhases(0)[0].entries[0].times, rep.buildPhases(1)[0].entries[0].times], [6, 7]);
  check('repeat sub-row filtered per size', [rep.buildPhases(0)[0].entries[0].rows.length, rep.buildPhases(1)[0].entries[0].rows.length], [1, 2]);
  const emptyRep = build2(
    'p,P,,,a,A,,row,r1,Always,,,,,S|M,\n' +
    'p,,,,a,,,repeat,rp,Rep,,2,s1,Medium only,,M\n');
  check('repeat with no sub-rows left is dropped', ids(emptyRep, 0), ['a:r1']);
  const HEAD3 = 'pattern_id,pattern_name,pattern_badge,pattern_desc,phase_id,phase_name,phase_desc,kind,entry_id,text,bullets,sub_row_id,sub_row_text,sizes\n';
  const build3 = body => buildPatternFromRows(parseCsv(HEAD3 + body));
  const missingRepeatTimes = build3('p,P,,,a,A,,repeat,rp,Rep,,,s1,Always,S|M\n');
  check('repeat without repeat_times defaults to 1', missingRepeatTimes.buildPhases(0)[0].entries[0].times, 1);

  throwsWith('for_sizes: unknown size name', () =>
    build2('p,P,,,a,A,,row,r1,x,,,,,S|M,XL\n'), 'not in sizes');
  throwsWith('for_sizes without a sizes cell', () =>
    buildPatternFromRows(parseCsv(HEAD2 + 'p,P,,,a,A,,row,r1,x,,,,,,S\n')), 'needs a sizes cell');
  throwsWith('a size left with no steps', () =>
    build2('p,P,,,a,A,,row,r1,x,,,,,S|M,S\n'), 'has no steps');
  throwsWith('two steps with one id in the same size', () =>
    build2('p,P,,,a,A,,row,r1,for S,,,,,S|M,S\np,,,,a,,,row,r1,for S too,,,,,,S|M\n'), 'two steps with entry_id "r1"');
  check('same id for different sizes is fine', ids(build2('p,P,,,a,A,,row,r1,for S,,,,,S|M,S\np,,,,a,,,row,r1,for M,,,,,,M\n'), 1), ['a:r1']);

  // ── backward compatibility ──
  const plain = buildPatternFromRows(parseCsv(HEAD.replace(',sizes', '') +
    'p,P,,,a,A,,row,r1,"Keep {braces|literal}",,,,\n'));
  check('no sizes column: unsized pattern', [plain.sizes, plain.buildPhases, plain.phases.length], [undefined, undefined, 1]);
  check('no sizes column: braces stay literal', plain.phases[0].entries[0].text, 'Keep {braces|literal}');
  const emptyCell = build('p,P,,,a,A,,row,r1,"Keep {x|y}",,,,,\n');
  check('empty sizes cell: unsized', [emptyCell.sizes, emptyCell.phases.length], [undefined, 1]);

  const failed = results.filter(r => !r.ok);
  console.table(results);
  console.log(failed.length ? failed.length + ' FAILED' : 'all ' + results.length + ' passed');
  return { passed: results.length - failed.length, failed: failed.length };
}

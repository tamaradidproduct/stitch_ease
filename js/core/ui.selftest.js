// ─────────────────────────────────────────────
// SELF-TEST for the generic UI components (js/core/ui.js). Not shipped.
// Load it from the console on a loaded page, then call uiSelfTest().
// Returns {passed, failed, failures}.
// ─────────────────────────────────────────────
function uiSelfTest() {
  const results = [];
  function check(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ case: name, ok: a === e, got: a, want: e });
  }
  const has = (s, t) => String(s).indexOf(t) !== -1;

  check('uiFacts with nothing renders nothing', uiFacts({}), '');
  check('uiFacts with null count and null check renders nothing', uiFacts({ count: null, check: null }), '');
  check('uiFacts count only: figure, no check',
    [has(uiFacts({ count: 90 }), '<b>90</b> sts'), has(uiFacts({ count: 90 }), 'CHECK')], [true, false]);
  check('uiFacts check only: no count',
    [has(uiFacts({ check: 'Row 2 cm' }), 'CHECK'), has(uiFacts({ check: 'Row 2 cm' }), ' sts')], [true, false]);
  check('uiFacts renders the check as given (pattern text is pre-sanitised)', has(uiFacts({ check: 'a <i>x</i>' }), 'a <i>x</i>'), true);
  check('uiFacts zero is a count', has(uiFacts({ count: 0 }), '<b>0</b> sts'), true);

  check('uiFacts takes a count label', has(uiFacts({ count: 70, countLabel: 'sts at end of pass 3' }), 'sts at end of pass 3'), true);

  const closed = uiToggleSection({ label: 'SETUP', open: false, onclick: 'tog()', html: 'BODY' });
  const opened = uiToggleSection({ label: 'SETUP', open: true, onclick: 'tog()', html: 'BODY' });
  check('toggle closed: arrow ▸, no body', [has(closed, '▸'), has(closed, 'BODY')], [true, false]);
  check('toggle open: arrow ▾, body shown, handler wired', [has(opened, '▾'), has(opened, 'BODY'), has(opened, 'onclick="tog()"')], [true, true, true]);

  const long = 'A very long section name that goes on and on';
  const bar = uiTopBar({ project: 'Peacock Tee', title: long, tally: '3 / 24 rows', onBack: 'goHome()', onTitle: 'togglePhaseNav()', actions: '<i id="act"></i>' });
  check('top bar: title class, tally, actions and back handler',
    [has(bar, 'class="ui-top-title"'), has(bar, '3 / 24 rows'), has(bar, '<i id="act"></i>'), has(bar, 'onclick="goHome()"')], [true, true, true, true]);
  check('top bar without a tally has no tally element', has(uiTopBar({ project: 'P', title: 'T', onBack: 'b()', onTitle: 't()' }), 'ui-top-tally'), false);
  check('top bar escapes project and title', has(uiTopBar({ project: '<x>', title: '<y>', onBack: 'b()', onTitle: 't()' }), '&lt;x&gt;'), true);

  check('dock: solid by default', has(uiDock({ label: 'Mark row 4 done', onclick: 'd()' }), 'ui-dock-main--outline'), false);
  check('dock: outline variant', has(uiDock({ label: 'x', onclick: 'd()', variant: 'outline' }), 'ui-dock-main--outline'), true);
  check('dock: label and both nav buttons',
    [has(uiDock({ label: 'Mark row 4 done', onclick: 'd()' }), 'Mark row 4 done'), has(uiDock({ label: 'x', onclick: 'd()' }), 'spBrowse(-1)'), has(uiDock({ label: 'x', onclick: 'd()' }), 'spBrowse(1)')], [true, true, true]);
  check('dock: chip renders above the buttons', uiDock({ label: 'x', onclick: 'd()', chip: '<i>CHIP</i>' }).indexOf('CHIP') < uiDock({ label: 'x', onclick: 'd()', chip: '<i>CHIP</i>' }).indexOf('ui-dock-main'), true);

  check('icon button carries aria-label and dot flag',
    [has(uiIconButton({ icon: '<svg/>', label: 'Glossary', onclick: 'g()' }), 'aria-label="Glossary"'), has(uiIconButton({ icon: '<svg/>', label: 'x', onclick: 'g()', dot: true }), 'has-dot')], [true, true]);
  check('caps label escapes', uiCapsLabel('a<b'), '<span class="ui-caps">a&lt;b</span>');
  check('card keeps html raw and takes a class', [has(uiCard({ cls: 'x', html: '<p>hi</p>' }), '<p>hi</p>'), has(uiCard({ cls: 'x', html: '' }), 'ui-card x')], [true, true]);

  const failed = results.filter(r => !r.ok);
  console.log('[ui selftest] ' + (results.length - failed.length) + '/' + results.length + ' passed');
  failed.forEach(f => console.log('FAIL', f.case, '\n  got ', f.got, '\n  want', f.want));
  return { passed: results.length - failed.length, failed: failed.length, failures: failed };
}

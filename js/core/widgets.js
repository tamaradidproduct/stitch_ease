// Shared UI builders. Each returns an HTML string, so they work from the inline
// onclick-and-innerHTML style the rest of the app uses. Function declarations
// only — nothing here runs at load, so order against other scripts is free.

// A button. `.btn` is the one component. Hand-written markup elsewhere uses the
// same classes directly (class="btn btn--primary"); this is for new code.
//
//   label       plain text — escaped here
//   labelHtml   trusted markup (an inline SVG, say) — NOT escaped; use instead of label
//   variant     'primary' | 'accent' | 'danger', or an array with 'slim' | 'lg' | 'block'
//   onclick     developer-authored JS, trusted; only the quote character is escaped
//   id, href    href turns it into a real <a> (the PDF "Open" needs one — see pdf.js)
//   disabled    boolean
//   cls         extra classes, e.g. 'size-opt'
//   attrs       extra raw attributes, e.g. 'data-reset="3"' — trusted
function btnHtml(o) {
  const variants = [].concat(o.variant || []).filter(Boolean);
  const cls = ['btn'].concat(variants.map(v => 'btn--' + v), o.cls || []).join(' ');
  const attr =
    (o.id ? ` id="${escapeHtml(o.id)}"` : '') +
    (o.onclick ? ` onclick="${String(o.onclick).replace(/"/g, '&quot;')}"` : '') +
    (o.disabled ? ' disabled' : '') +
    (o.attrs ? ' ' + o.attrs : '');
  const inner = o.labelHtml != null ? o.labelHtml : escapeHtml(o.label == null ? '' : o.label);
  if (o.href) {
    return `<a class="${cls}" href="${escapeHtml(o.href)}" target="_blank" rel="noopener"${attr}>${inner}</a>`;
  }
  return `<button class="${cls}"${attr}>${inner}</button>`;
}

// An inline message: a boxed error or confirmation, or a muted footnote.
//
//   kind    'error' | 'ok' | 'note'
//   text    plain text — escaped here
//   html    trusted markup — NOT escaped; use instead of text
//   plain   note only: no rule above it, tucked under the line before it
//   id      optional element id
function msgHtml(o) {
  const cls = 'msg msg--' + o.kind + (o.plain ? ' msg--plain' : '');
  const id = o.id ? ` id="${escapeHtml(o.id)}"` : '';
  const inner = o.html != null ? o.html : escapeHtml(o.text == null ? '' : o.text);
  return `<p class="${cls}"${id}>${inner}</p>`;
}

// A row of buttons: pass btnHtml() strings.
function sheetActionsHtml(buttons) {
  return `<div class="sheet-actions">${buttons.join('')}</div>`;
}

// The content stack most sheets share, in the order they all read:
//   message → detail → body → error → actions → note
//
//   message / messageHtml   the question or statement, escaped / trusted
//   messageId               id on the message paragraph
//   detail  / detailHtml    one muted line under it, escaped / trusted
//   body                    trusted markup between detail and the rest (an input, a list)
//   error                   plain text, shown as a boxed error
//   actions                 array of btnHtml() strings
//   note    / noteHtml      footnote under the actions, escaped / trusted
//
// A sheet whose order differs (a note above its buttons, two button rows)
// composes msgHtml() and sheetActionsHtml() directly instead.
function sheetBodyHtml(o) {
  const part = (plain, trusted) => trusted != null ? trusted : (plain != null ? escapeHtml(plain) : null);
  const message = part(o.message, o.messageHtml);
  const detail = part(o.detail, o.detailHtml);
  const note = part(o.note, o.noteHtml);
  return [
    message != null ? `<p class="sheet-msg"${o.messageId ? ` id="${escapeHtml(o.messageId)}"` : ''}>${message}</p>` : '',
    detail != null ? `<p class="sheet-sub">${detail}</p>` : '',
    o.body || '',
    o.error != null ? msgHtml({ kind: 'error', text: o.error }) : '',
    o.actions && o.actions.length ? sheetActionsHtml(o.actions) : '',
    note != null ? msgHtml({ kind: 'note', html: note }) : '',
  ].filter(Boolean).join('\n    ');
}

// A horizontal row: something leading, the main content, something trailing.
// Every slot is TRUSTED markup — the caller escapes whatever it interpolates.
//
//   lead / main / trail   markup for each slot; an empty slot is left out
//   variant               'sm' | 'baseline' | 'divided', string or array
//   cls, id               extra classes / element id
function rowHtml(o) {
  const cls = ['row'].concat([].concat(o.variant || []).filter(Boolean).map(v => 'row--' + v), o.cls || []).join(' ');
  const slot = (name, html) => html != null && html !== '' ? `<div class="row-${name}">${html}</div>` : '';
  return `<div class="${cls}"${o.id ? ` id="${escapeHtml(o.id)}"` : ''}>${slot('lead', o.lead)}${slot('main', o.main)}${slot('trail', o.trail)}</div>`;
}

// A round ± button.
//   dir      'minus' | 'plus'
//   size     'sm' (quiet, inline beside a label) | 'lg' (the chart dock's, coloured by dir)
//   onclick  developer-authored JS, trusted
//   label    plain-text aria-label — escaped here
function stepperBtnHtml(o) {
  const size = o.size || 'sm';
  const cls = 'stepper-btn stepper-btn--' + size + (size === 'lg' ? ' stepper-btn--' + o.dir : '');
  return `<button class="${cls}" onclick="${String(o.onclick).replace(/"/g, '&quot;')}" aria-label="${escapeHtml(o.label == null ? '' : o.label)}">${o.dir === 'plus' ? '+' : '\u2212'}</button>`;
}

// The tick box itself. Ticked-ness is drawn from the ancestor's .done class,
// so this carries no state of its own. Pass `sm` for the one inside repeat rows.
// With `onclick` it is its own control and gets the checkbox role and keyboard
// access; without, the element around it is the control (see checkboxAttrs).
//   done / label   for the aria state and name; only used with onclick
function checkHtml(o) {
  o = o || {};
  const cls = 'check' + (o.sm ? ' check--sm' : '');
  if (!o.onclick) return `<div class="${cls}">${CHECK_SVG}</div>`;
  return `<div class="${cls}"${checkboxAttrs(o.done)}${o.label ? ` aria-label="${escapeHtml(o.label)}"` : ''} onclick="${String(o.onclick).replace(/"/g, '&quot;')}">${CHECK_SVG}</div>`;
}

// Attributes that make a clickable element an operable checkbox: role, state,
// and a tab stop. Spread into a tag: `<div${checkboxAttrs(done)} onclick=...>`.
function checkboxAttrs(checked) {
  return ` role="checkbox" aria-checked="${checked ? 'true' : 'false'}" tabindex="0"`;
}

// Enter and Space press whatever checkbox has focus. The elements are divs and
// list items with inline onclick, so the browser does not do this on its own.
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (t && t.getAttribute && t.getAttribute('role') === 'checkbox') { e.preventDefault(); t.click(); }
});

// A colour sample.
//   color   a CSS colour value — a hex or var(--yarn-0); escaped into the style attribute
//   size    'xs' (10) | 'sm' (12) | default 14
//   round   a dot instead of a rounded square
//   cls     extra classes
function swatchHtml(o) {
  const cls = ['swatch'].concat(o.size ? 'swatch--' + o.size : [], o.round ? 'swatch--round' : [], o.cls || []).join(' ');
  return `<span class="${cls}" style="background:${escapeHtml(o.color == null ? '' : o.color)}"></span>`;
}

// An outlined pill label. `html` is trusted markup (it often holds a swatch or
// a <b> count); `lead` trims the padding on the side a swatch or icon sits.
function chipHtml(o) {
  return `<span class="chip${o.lead ? ' chip--lead' : ''}">${o.html == null ? '' : o.html}</span>`;
}

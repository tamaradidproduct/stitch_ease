// Shared UI builders. Each returns an HTML string, so they work from the inline
// onclick-and-innerHTML style the rest of the app uses. Function declarations
// only — nothing here runs at load, so order against other scripts is free.

// A button. `.btn` is the one component; .sheet-btn / .nav-btn / .finished-btn /
// .picker-import-btn are aliases in index.html until every call site has moved.
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

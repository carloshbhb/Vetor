import { JSDOM } from 'jsdom';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'figure', 'figcaption', 'hr',
  'code', 'pre', 'sub', 'sup', 'mark',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  div: new Set(['class', 'style']),
  span: new Set(['class', 'style']),
  p: new Set(['class', 'style']),
  h1: new Set(['class']),
  h2: new Set(['class']),
  h3: new Set(['class']),
  blockquote: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
  mark: new Set(['class']),
};

function sanitizeNode(node: ChildNode, doc: Document): void {
  const el = node as Element;
  if (!el.tagName) return;

  const tag = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    el.replaceWith(...Array.from(el.childNodes));
    return;
  }

  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    const allowed = ALLOWED_ATTRS[tag];
    if (!allowed || !allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'href' || name === 'src') {
      const val = attr.value.toLowerCase().trim();
      if (val.startsWith('javascript:') || val.startsWith('data:')) {
        el.removeAttribute(attr.name);
      }
    }
    if (name === 'style') {
      const dangerous = /expression\(|url\(|@import|behavior\s*:/i;
      if (dangerous.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  Array.from(el.childNodes).forEach((child) => sanitizeNode(child, doc));
}

export function sanitizeHtml(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  const body = dom.window.document.body;
  Array.from(body.childNodes).forEach((child) => sanitizeNode(child, dom.window.document));
  return body.innerHTML;
}

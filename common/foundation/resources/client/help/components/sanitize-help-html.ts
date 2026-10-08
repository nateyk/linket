const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

const GLOBAL_ATTRIBUTES = new Set(['class', 'id', 'title']);

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('/') ||
    normalized.startsWith('#')
  );
}

export function sanitizeHelpHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    const allowed = new Set([
      ...GLOBAL_ATTRIBUTES,
      ...(ALLOWED_ATTRIBUTES[tag] ?? []),
    ]);

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || !allowed.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === 'href' || name === 'src') &&
        !isSafeUrl(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }

    if (tag === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}

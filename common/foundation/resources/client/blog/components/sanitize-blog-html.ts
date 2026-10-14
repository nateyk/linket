/**
 * Client-side mirror of the server's SanitizeBlogHtml (HTMLPurifier) allowlist.
 *
 * The server already purifies bodies on save, but this runs again before
 * rendering as defense in depth — a client-only allowlist is not a security
 * boundary, it just narrows what an XSS payload could reach if stored content
 * were ever tampered with.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'sub',
  'sup',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'code',
  'pre',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  th: new Set(['colspan', 'rowspan']),
  td: new Set(['colspan', 'rowspan']),
  p: new Set(['style']),
};

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('/')
  );
}

function isSafeStyle(value: string): boolean {
  // Only allow color declarations from the editor; drop anything that could
  // execute or load external resources.
  return /^(color:\s*#[0-9a-f]{3,8};?\s*)+$/i.test(value.trim());
}

export function sanitizeBlogHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (!allowed.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === 'href' || name === 'src') &&
        !isSafeUrl(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
      if (name === 'style' && !isSafeStyle(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }

    if (tag === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}

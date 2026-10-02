/**
 * Minimal markdown renderer for creator About text.
 *
 * `about_html` is contracted as sanitized HTML (see
 * `App\Biolinks\Actions\SanitizeCreatorAbout`), but creators paste raw
 * markdown into the field and the sanitizer passes tag-free text through
 * unchanged — which then renders as literal `###` / `*` / `**` / `---`.
 * These helpers detect that case and render it; genuine HTML keeps the
 * existing `dangerouslySetInnerHTML` path untouched, so HTML authors never
 * have their literal `*` / `#` characters reinterpreted.
 *
 * Security model: the input is HTML-escaped FIRST and the parser only ever
 * emits an allowlisted tag set (`h2`-`h4`, `p`, `ul`, `ol`, `li`, `strong`,
 * `em`, `code`, `hr`, `br`, `a[href|target|rel]`). Raw HTML in the source
 * can never reach the output, and links are restricted to `https?` — the
 * same scheme rule the server sanitizer enforces.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtmlText(value: string): string {
  return value.replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

const MARKDOWN_MARKERS =
  /(^|\n)#{1,4} +|(\*\*[^*\n]+\*\*)|(^|\n)\s*([-*]|\d+\.) +|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<]+|(^|\n)-{3,}\s*($|\n)/;

/**
 * True when the value carries no HTML tags at all but does carry markdown
 * markers — i.e. plain text that was authored as markdown.
 */
export function looksLikeMarkdown(source: string): boolean {
  const text = source.trim();
  if (!text) return false;
  if (/<[a-zA-Z][^>]*>/.test(text)) return false;
  return MARKDOWN_MARKERS.test(text);
}

const HEADING_PATTERN = /^(#{1,4})\s+(.*)$/;
const HR_PATTERN = /^-{3,}\s*$/;
const UL_MARKER_PATTERN = /^\s*[-*]\s+(.*)$/;
const OL_MARKER_PATTERN = /^\s*\d+\.\s+(.*)$/;
const CODE_TOKEN = '\u0000';
const LINK_OR_URL_PATTERN =
  /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<]+)/g;

function renderInlineText(text: string): string {
  // Code spans are extracted first so URLs / emphasis inside them survive
  // untouched; \0 placeholders carry no markdown-significant characters.
  const codes: string[] = [];
  let out = escapeHtmlText(text).replace(
    /`([^`\n]+)`/g,
    (_, code: string) => {
      codes.push(`<code>${code}</code>`);
      return `${CODE_TOKEN}${codes.length - 1}${CODE_TOKEN}`;
    },
  );
  out = out
    .replace(
      LINK_OR_URL_PATTERN,
      (match: string, label?: string, href?: string, bare?: string) => {
        if (bare) {
          // Trailing punctuation belongs to the sentence, not the URL.
          const trail = bare.match(/[.,;:!?]+$/)?.[0] ?? '';
          const url = trail ? bare.slice(0, -trail.length) : bare;
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trail}`;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      },
    )
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>');
  // Restore code spans without a regex: the placeholder is a lone control
  // character, which `no-control-regex` (rightly) forbids matching against.
  // Splitting on it alternates text and span indexes by construction.
  return out
    .split(CODE_TOKEN)
    .map((part, position) =>
      position % 2 === 1 ? codes[Number(part)] : part,
    )
    .join('');
}

interface OpenList {
  ordered: boolean;
  items: string[];
}

/**
 * Render markdown-flavoured plain text to an HTML string. Heading levels are
 * capped at `h2` so embedded content can never outrank the page's own `h1`.
 */
export function renderMarkdownToHtml(source: string): string {
  // Strip carriage returns with plain string ops: a control-character class
  // in a regex trips the `no-control-regex` lint, and lone CR endings are
  // extinct in practice.
  const lines = source.split('\r').join('').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: OpenList | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.map(renderInlineText).join('<br>')}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list) {
      const tag = list.ordered ? 'ol' : 'ul';
      blocks.push(
        `<${tag}>${list.items.map(item => `<li>${renderInlineText(item)}</li>`).join('')}</${tag}>`,
      );
      list = null;
    }
  };

  const pushListItem = (ordered: boolean, item: string) => {
    if (!list || list.ordered !== ordered) {
      flushParagraph();
      flushList();
      list = {ordered, items: []};
    }
    list.items.push(item);
  };

  for (const line of lines) {
    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 1, 4);
      blocks.push(
        `<h${level}>${renderInlineText(heading[2].trim())}</h${level}>`,
      );
      continue;
    }
    if (HR_PATTERN.test(line)) {
      flushParagraph();
      flushList();
      blocks.push('<hr>');
      continue;
    }
    const ulMarker = UL_MARKER_PATTERN.exec(line);
    if (ulMarker) {
      pushListItem(false, ulMarker[1]);
      continue;
    }
    const olMarker = OL_MARKER_PATTERN.exec(line);
    if (olMarker) {
      pushListItem(true, olMarker[1]);
      continue;
    }
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }
    // A non-marker line ends an open list and continues paragraph text.
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks.join('');
}

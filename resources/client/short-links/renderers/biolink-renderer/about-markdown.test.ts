import {describe, expect, test} from 'vitest';
import {
  looksLikeMarkdown,
  normalizeHybridAboutHtml,
  renderAboutHtml,
  renderMarkdownToHtml,
} from './about-markdown';

describe('looksLikeMarkdown', () => {
  test('detects headings, lists, bold, rules and links', () => {
    expect(looksLikeMarkdown('### Seller Dashboard')).toBe(true);
    expect(looksLikeMarkdown('* Full Deals Management: easy.')).toBe(true);
    expect(looksLikeMarkdown('1. First step')).toBe(true);
    expect(looksLikeMarkdown('Pay **now** please')).toBe(true);
    expect(looksLikeMarkdown('See [docs](https://example.com/x)')).toBe(true);
    expect(looksLikeMarkdown('Visit https://example.com/x today')).toBe(true);
    expect(looksLikeMarkdown('above\n---\nbelow')).toBe(true);
  });

  test('rejects empty text and real HTML', () => {
    expect(looksLikeMarkdown('')).toBe(false);
    expect(looksLikeMarkdown('   ')).toBe(false);
    expect(looksLikeMarkdown('<p>5 * 3 = 15</p>')).toBe(false);
    expect(looksLikeMarkdown('I rate it #1 seller')).toBe(false);
    expect(looksLikeMarkdown('plain prose, nothing special.')).toBe(false);
  });
});

describe('renderMarkdownToHtml', () => {
  test('caps headings at h2 so embedded content keeps the page outline', () => {
    expect(renderMarkdownToHtml('# Title')).toBe('<h2>Title</h2>');
    expect(renderMarkdownToHtml('## Section')).toBe('<h3>Section</h3>');
    expect(renderMarkdownToHtml('### Key Functionality')).toBe(
      '<h4>Key Functionality</h4>',
    );
    expect(renderMarkdownToHtml('#### Deep')).toBe('<h4>Deep</h4>');
  });

  test('renders lists, rules, paragraphs and line breaks', () => {
    expect(renderMarkdownToHtml('* one\n* two')).toBe(
      '<ul><li>one</li><li>two</li></ul>',
    );
    expect(renderMarkdownToHtml('1. one\n2. two')).toBe(
      '<ol><li>one</li><li>two</li></ol>',
    );
    expect(renderMarkdownToHtml('above\n---\nbelow')).toBe(
      '<p>above</p><hr><p>below</p>',
    );
    expect(renderMarkdownToHtml('line one\nline two')).toBe(
      '<p>line one<br>line two</p>',
    );
  });

  test('renders inline bold, italic, code and links', () => {
    expect(renderMarkdownToHtml('Pay **now** please')).toBe(
      '<p>Pay <strong>now</strong> please</p>',
    );
    expect(renderMarkdownToHtml('a *real* deal')).toBe(
      '<p>a <em>real</em> deal</p>',
    );
    expect(renderMarkdownToHtml('run `npm run build` first')).toBe(
      '<p>run <code>npm run build</code> first</p>',
    );
    expect(renderMarkdownToHtml('See [docs](https://example.com/x)')).toBe(
      '<p>See <a href="https://example.com/x" target="_blank" rel="noopener noreferrer">docs</a></p>',
    );
    expect(renderMarkdownToHtml('go to https://example.com/x.')).toBe(
      '<p>go to <a href="https://example.com/x" target="_blank" rel="noopener noreferrer">https://example.com/x</a>.</p>',
    );
  });

  test('never emits raw HTML or dangerous links', () => {
    expect(renderMarkdownToHtml('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
    expect(renderMarkdownToHtml('[x](javascript:alert(1))')).toBe(
      '<p>[x](javascript:alert(1))</p>',
    );
    expect(renderMarkdownToHtml('`**not code')).toBe(
      '<p>`**not code</p>',
    );
  });

  test('renders the reported About content end to end', () => {
    const out = renderMarkdownToHtml(
      '### 🛒 Seller Dashboard\n* **Full Deals Management:** easy.\n---\nPlain close.',
    );
    expect(out).toContain('<h4>🛒 Seller Dashboard</h4>');
    expect(out).toContain(
      '<ul><li><strong>Full Deals Management:</strong> easy.</li></ul>',
    );
    expect(out).toContain('<hr>');
    expect(out).toContain('<p>Plain close.</p>');
  });
});

describe('normalizeHybridAboutHtml', () => {
  test('converts p-wrapped markers to rules, headings and grouped lists', () => {
    expect(normalizeHybridAboutHtml('<p>---</p>')).toBe('<hr>');
    expect(normalizeHybridAboutHtml('<p>### Seller Dashboard</p>')).toBe(
      '<h4>Seller Dashboard</h4>',
    );
    expect(normalizeHybridAboutHtml('<p># Top</p>')).toBe('<h2>Top</h2>');
    expect(
      normalizeHybridAboutHtml('<p>* one</p><p>* two</p><p>after</p>'),
    ).toBe('<ul><li>one</li><li>two</li></ul><p>after</p>');
    expect(normalizeHybridAboutHtml('<p>1. one</p><p>2. two</p>')).toBe(
      '<ol><li>one</li><li>two</li></ol>',
    );
  });

  test('keeps inner tags and drops empty paragraphs', () => {
    expect(
      normalizeHybridAboutHtml(
        '<p>* <strong>Full Deals Management:</strong> easy.</p>',
      ),
    ).toBe(
      '<ul><li><strong>Full Deals Management:</strong> easy.</li></ul>',
    );
    expect(normalizeHybridAboutHtml('<p>plain</p><p></p>')).toBe(
      '<p>plain</p>',
    );
  });

  test('passes genuine structure and mangled copy through byte-identical', () => {
    expect(
      normalizeHybridAboutHtml('<h2>Real head</h2><ul><li>x</li></ul>'),
    ).toBe('<h2>Real head</h2><ul><li>x</li></ul>');
    const mangled =
      '<p>See <strong>[name](</strong><a href="https://example.com/a?b&#61;1)**">https://example.com/a</a> here:</p>';
    expect(normalizeHybridAboutHtml(mangled)).toBe(mangled);
  });

  test('renders the stored noval excerpt with no marker remnants', () => {
    const stored =
      '<p>---</p><p>### 🏪 Seller Dashboard</p>' +
      '<p>* <strong>Full Deals Management:</strong> Create with ease.</p>' +
      '<p>* <strong>Deal Analytics:</strong> View stats.</p><p></p>';
    const out = normalizeHybridAboutHtml(stored);
    expect(out).toBe(
      '<hr><h4>🏪 Seller Dashboard</h4>' +
        '<ul><li><strong>Full Deals Management:</strong> Create with ease.</li>' +
        '<li><strong>Deal Analytics:</strong> View stats.</li></ul>',
    );
    expect(out).not.toContain('###');
    expect(out).not.toContain('<p>* ');
  });
});

describe('renderAboutHtml', () => {
  test('routes plain markdown text and hybrid HTML correctly', () => {
    expect(renderAboutHtml('### Title\n* item')).toBe(
      '<h4>Title</h4><ul><li>item</li></ul>',
    );
    expect(renderAboutHtml('<p>### Title</p><p>* item</p>')).toBe(
      '<h4>Title</h4><ul><li>item</li></ul>',
    );
    expect(renderAboutHtml('<p>Just <strong>rich</strong> text.</p>')).toBe(
      '<p>Just <strong>rich</strong> text.</p>',
    );
  });
});

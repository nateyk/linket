import {describe, expect, test} from 'vitest';
import {
  looksLikeMarkdown,
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

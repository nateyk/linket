import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {productDeck} from './product-description';

describe('product deck', () => {
  test('renders nothing for missing, blank or markup-only descriptions', () => {
    expect(productDeck()).toBeNull();
    expect(productDeck(null)).toBeNull();
    expect(productDeck('')).toBeNull();
    expect(productDeck('    ')).toBeNull();
    expect(productDeck('<p> </p>')).toBeNull();
  });

  test('passes a short description through verbatim', () => {
    expect(productDeck('A compact Figma course.')).toBe(
      'A compact Figma course.',
    );
  });

  test('keeps a second sentence when both fit the cap', () => {
    expect(productDeck('Learn Figma fast. Build three real projects.')).toBe(
      'Learn Figma fast. Build three real projects.',
    );
  });

  test('keeps only the first sentence when two sentences exceed the cap', () => {
    const first = `${'First sentence words here '.repeat(6).trim()}.`;
    const second = `${'Second sentence words here '.repeat(6).trim()}.`;
    expect(`${first} ${second}`.length).toBeGreaterThan(240);
    expect(productDeck(`${first} ${second}`)).toBe(first);
  });

  test('truncates a run-on description on a word boundary with an ellipsis', () => {
    const runOn = 'word '.repeat(80).trim();
    const deck = productDeck(runOn);
    expect(deck).not.toBeNull();
    expect(deck!.endsWith('…')).toBe(true);
    expect(deck!.length).toBeLessThanOrEqual(241);
    // no partial word at the cut point
    expect(deck!.slice(0, -1).endsWith('word')).toBe(true);
  });

  test('strips markup and collapses whitespace', () => {
    expect(productDeck('<p>Rich  <strong>text</strong>\n here.</p>')).toBe(
      'Rich text here.',
    );
  });
});

describe('product page mounting', () => {
  const read = (file: string) =>
    fs.readFileSync(
      path.resolve(
        `resources/client/digital-products/public/product-page/${file}`,
      ),
      'utf8',
    );

  test('overview renders the FAQ block', () => {
    expect(read('product-overview.tsx')).toContain(
      '<ProductFaq product={product} />',
    );
  });

  test('summary renders the deck between the heading and the meta row', () => {
    const source = read('product-summary.tsx');
    expect(source).toContain('productDeck(product.description)');
    expect(source.indexOf('</h1>')).toBeLessThan(source.indexOf('{deck && ('));
    expect(source.indexOf('{deck && (')).toBeLessThan(
      source.indexOf('<CreatorIdentity'),
    );
  });

  test('FAQ copy never promises refunds or guarantees', () => {
    const source = read('product-faq.tsx');
    const messages = [...source.matchAll(/message="([^"]+)"/g)].map(
      match => match[1],
    );
    expect(messages.length).toBeGreaterThan(0);
    expect(
      messages.filter(message =>
        /refund|money.back|guarantee/i.test(message),
      ),
    ).toEqual([]);
  });
});

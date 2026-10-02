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

  test('renders nothing for short descriptions — the Overview shows them in full', () => {
    // A deck that fits the cap would repeat the Overview lead verbatim, so
    // short descriptions earn no deck at all.
    expect(productDeck('A compact Figma course.')).toBeNull();
  });

  test('renders nothing when two sentences already fit the cap', () => {
    expect(
      productDeck('Learn Figma fast. Build three real projects.'),
    ).toBeNull();
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
    // Short after stripping → no deck (Overview carries it in full).
    expect(productDeck('<p>Rich  <strong>text</strong>\n here.</p>')).toBeNull();
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

  test('FAQ states the single factual refund stance — never a guarantee', () => {
    const source = read('product-faq.tsx');
    const messages = [...source.matchAll(/message="([^"]+)"/g)].map(
      match => match[1],
    );
    expect(messages.length).toBeGreaterThan(0);
    // The one allowed stance: instant delivery, refunds at creator discretion.
    expect(messages).toContain(
      "Digital delivery is instant; refunds are at the creator's discretion. Contact the creator through their store if something is wrong with your purchase.",
    );
    // No money-back promise, guarantee, or refund window exists to offer.
    expect(
      messages.filter(message =>
        /money.back|guarantee|refund window/i.test(message),
      ),
    ).toEqual([]);
  });
});

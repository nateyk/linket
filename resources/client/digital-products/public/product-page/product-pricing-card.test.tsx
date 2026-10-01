import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const readSource = () =>
  fs.readFileSync(
    path.resolve(
      'resources/client/digital-products/public/product-page/product-pricing-card.tsx',
    ),
    'utf8',
  );

describe('product pricing card', () => {
  test('scopes both checkout alerts to the painted panel tokens', () => {
    const source = readSource();

    // shadcn/alert.tsx forces the app-level foreground on descriptions at
    // higher specificity, so the trailing `!` is load-bearing — without it
    // checkout rescue copy vanishes on a dark-painted store.
    expect(source).toContain(
      'border-[var(--biolink-border,var(--color-border))]!',
    );
    expect(source).toContain(
      'text-[var(--biolink-muted-text,var(--color-muted-foreground))]!',
    );
    // Both alerts, not just the first.
    expect(
      source.match(
        /text-\[var\(--biolink-muted-text,var\(--color-muted-foreground\)\)\]!/g,
      ),
    ).toHaveLength(4);
  });

  test('keeps the risk reversal to facts this repo can prove', () => {
    const source = readSource();

    // Receipt + download links, same string the payment dialog ships.
    expect(source).toContain(
      'We email your receipt and protected download links as soon as payment is confirmed.',
    );
    expect(source).toContain('One-time payment, no subscription');
    // No refund window, money-back guarantee or support promise exists here.
    expect(source).not.toMatch(/refund|money-back|money back|guarantee/i);
  });

  test('sentences sit at 14px; 12px is reserved for the badge label', () => {
    const source = readSource();

    // The trust note is prose, not metadata.
    expect(source).toContain(
      'p-3 text-sm text-[var(--biolink-muted-text)]',
    );
    expect(source).not.toContain('p-3 text-xs');
    // "One-time purchase" stays a 12px uppercase badge label.
    expect(source).toContain('text-xs font-medium tracking-wide');
  });
});

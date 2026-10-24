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

    // Compressed facts for the scannable card list; the checkout dialog
    // still carries the full "as soon as payment is confirmed" sentence.
    expect(source).toContain('Receipt and download links by email');
    expect(source).toContain('One-time payment, no subscription');
    // No refund window, money-back guarantee or support promise exists here.
    expect(source).not.toMatch(/refund|money-back|money back|guarantee/i);
  });

  test('the price stands alone and the trust note stays prose', () => {
    const source = readSource();

    // The trust note is prose, not metadata.
    expect(source).toContain('p-3 text-base text-[var(--biolink-muted-text)]');
    expect(source).not.toContain('p-3 text-xs');
    // The one-time fact lives in the includes list. An uppercase label
    // above the price would be a second copy of the same sentence.
    expect(source).not.toContain('text-xs font-medium tracking-wide');
    expect(source).not.toContain('uppercase');
    expect(source).toContain('One-time payment, no subscription');
  });

  test('checkout rescue Try again buttons follow Appearance Buttons tokens', () => {
    const source = readSource();

    expect(source).toContain('resolveBiolinkButtonAppearance');
    expect(
      source.match(
        /className=\{cn\('mt-3 w-fit', buttonAppearance\.className\)\}/g,
      ),
    ).toHaveLength(2);
    expect(source).not.toMatch(
      /Try again[\s\S]{0,80}?variant="outline"|variant="outline"[\s\S]{0,120}?Try again/,
    );
  });
});

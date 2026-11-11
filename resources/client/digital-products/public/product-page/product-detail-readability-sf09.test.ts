import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(
    path.resolve('resources/client/digital-products/public/product-page', relative),
    'utf8',
  );

describe('SF-09 product detail reading hierarchy', () => {
  test('wraps long titles, descriptions and multilingual learning outcomes', () => {
    const summary = read('product-summary.tsx');
    const overview = read('product-overview.tsx');
    const faq = read('product-faq.tsx');
    expect(summary).toContain('text-balance break-words [overflow-wrap:anywhere]');
    expect(summary).toContain('leading-6 text-[var(--biolink-muted-text)] break-words');
    expect(overview).toContain('whitespace-pre-line text-[var(--biolink-muted-text)] break-words');
    expect(overview).toContain('min-w-0 text-[var(--biolink-muted-text)] break-words');
    expect(faq).toContain('[overflow-wrap:anywhere]');
  });

  test('presents course metrics in one lightweight divider group instead of nested cards', () => {
    const summary = read('product-summary.tsx');
    expect(summary).toContain('border-t border-[var(--biolink-border)]');
    expect(summary).toContain('stats.length > 2');
    expect(summary).toContain('tabular-nums');
    expect(summary).not.toContain('biolinkSurfaceEdgeClassName');
  });

  test('keeps free FAQ conditional and paid refund policy visible for relevant purchases', () => {
    const faq = read('product-faq.tsx');
    expect(faq).toContain("product.payment_mode === 'free'");
    expect(faq).toContain('Complete the free checkout');
    expect(faq).toContain('if (!isFree)');
    expect(faq).toContain('What is the refund policy?');
    expect(faq).toContain('href="/my-portal"');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (filename: string) =>
  fs.readFileSync(path.resolve('resources/client/digital-products/public', filename), 'utf8');

describe('SF-09 product and course detail content contract', () => {
  test('product names, creator description and learning outcomes wrap long multilingual text', () => {
    const summary = read('product-page/product-summary.tsx');
    const overview = read('product-page/product-overview.tsx');
    expect(summary).toContain('[overflow-wrap:anywhere]');
    expect(overview).toContain('[overflow-wrap:anywhere]');
    // Keep meaningful creator-authored content visible, not hidden in one-line truncation.
    expect(summary).not.toContain('truncate text-3xl');
  });

  test('course chapter and lesson names remain readable at narrow widths', () => {
    const page = read('digital-product-public-pages.tsx');
    expect(page).not.toContain('truncate text-sm font-medium text-[var(--biolink-text)]');
    expect(page).not.toContain('min-w-0 flex-1 truncate text-[var(--biolink-text)]');
    expect(page).toContain('break-words [overflow-wrap:anywhere]');
  });

  test('the free buyer flow never describes its own payment mode as unavailable or paid', () => {
    const page = read('digital-product-public-pages.tsx');
    const pricing = read('product-page/product-pricing-card.tsx');
    const faq = read('product-page/product-faq.tsx');
    expect(page).toContain("product.payment_mode === 'free'");
    expect(page).toContain('No payment details are needed for this free product.');
    expect(page).toContain('Continue for free');
    expect(page).toContain("data.product.payment_mode === 'free'");
    expect(pricing).toContain("product.payment_mode === 'free'");
    expect(faq).toContain("product.payment_mode === 'free'");
    expect(faq).toContain('free checkout');
  });

  test('product detail tabs, syllabus, payment and secure access boundaries stay intact', () => {
    const page = read('digital-product-public-pages.tsx');
    expect(page).toContain('<ProductTabs');
    expect(page).toContain('<CourseCurriculum');
    expect(page).toContain('payment_mode === \'direct\'');
    expect(page).toContain("payment_mode === 'unavailable'");
    expect(page).toContain('onSubmit={() => void beginCheckout()}');
    expect(page).toContain('<MotionConfig reducedMotion="user">');
  });
});

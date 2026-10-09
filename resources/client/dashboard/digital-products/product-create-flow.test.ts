import {describe, expect, test} from 'vitest';
import {
  buildCreateUrl,
  canContinue,
  hasNextStep,
  initialPriceFromParam,
  nextStep,
  parseEtbToCents,
  parseWizardPrefill,
  prevStep,
  visibleSteps,
} from './product-create-flow';

describe('parseEtbToCents', () => {
  test('converts decimals to integer cents', () => {
    expect(parseEtbToCents('19.99')).toBe(1999);
  });
  test('trims whitespace', () => {
    expect(parseEtbToCents('  10 ')).toBe(1000);
  });
  test('rejects empty, negative, and non-numeric input', () => {
    expect(parseEtbToCents('')).toBeNull();
    expect(parseEtbToCents('   ')).toBeNull();
    expect(parseEtbToCents('-5')).toBeNull();
    expect(parseEtbToCents('abc')).toBeNull();
  });
  test('accepts zero (free)', () => {
    expect(parseEtbToCents('0')).toBe(0);
  });
});

describe('wizard steps', () => {
  test('free skips the price step', () => {
    expect(nextStep('type', null)).toBe('billing');
    expect(nextStep('billing', 'free')).toBeNull();
    expect(nextStep('billing', 'paid')).toBe('price');
    expect(nextStep('price', 'paid')).toBeNull();
    expect(prevStep('billing')).toBe('type');
    expect(prevStep('price')).toBe('billing');
    expect(prevStep('type')).toBeNull();
  });
  test('price dot only appears for paid', () => {
    expect(visibleSteps(null)).toEqual(['type', 'billing']);
    expect(visibleSteps('free')).toEqual(['type', 'billing']);
    expect(visibleSteps('paid')).toEqual(['type', 'billing', 'price']);
  });
  test('gates each step', () => {
    expect(
      canContinue('type', {type: null, billing: null, price: ''}),
    ).toBe(false);
    expect(
      canContinue('type', {type: 'ebook', billing: null, price: ''}),
    ).toBe(true);
    expect(
      canContinue('billing', {type: 'ebook', billing: null, price: ''}),
    ).toBe(false);
    expect(
      canContinue('billing', {type: 'ebook', billing: 'free', price: ''}),
    ).toBe(true);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: ''}),
    ).toBe(false);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: '0'}),
    ).toBe(false);
    expect(
      canContinue('price', {type: 'ebook', billing: 'paid', price: '19.99'}),
    ).toBe(true);
  });
});

describe('hasNextStep', () => {
  test('knows when a next step exists', () => {
    expect(hasNextStep('type', null)).toBe(true);
    expect(hasNextStep('billing', 'free')).toBe(false);
    expect(hasNextStep('billing', 'paid')).toBe(true);
    expect(hasNextStep('price', 'paid')).toBe(false);
  });
});

describe('initialPriceFromParam', () => {
  test('passes valid cents through as ETB text, ignores the rest', () => {
    expect(initialPriceFromParam('1999')).toBe('19.99');
    expect(initialPriceFromParam(null)).toBeNull();
    expect(initialPriceFromParam('')).toBeNull();
    expect(initialPriceFromParam('0')).toBeNull();
    expect(initialPriceFromParam('-5')).toBeNull();
    expect(initialPriceFromParam('abc')).toBeNull();
  });
});

describe('buildCreateUrl', () => {
  test('routes courses to the course page with price only when paid', () => {
    expect(
      buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
    ).toBe('/dashboard/items/new/course?billing=paid&price_cents=1999');
    expect(
      buildCreateUrl({type: 'course', billing: 'free', price: ''}),
    ).toBe('/dashboard/items/new/course?billing=free');
  });
  test('routes other types to details with type and paid price', () => {
    expect(
      buildCreateUrl({type: 'ebook', billing: 'paid', price: '10'}),
    ).toBe('/dashboard/items/new/details?type=ebook&billing=paid&price_cents=1000');
    expect(
      buildCreateUrl({type: 'audio', billing: 'free', price: ''}),
    ).toBe('/dashboard/items/new/details?type=audio&billing=free');
  });
  test('returns null while incomplete', () => {
    expect(buildCreateUrl({type: null, billing: null, price: ''})).toBeNull();
    expect(
      buildCreateUrl({type: 'digital', billing: 'paid', price: ''}),
    ).toBeNull();
  });
});

describe('wizard prefill transport', () => {
  test('details urls carry the billing mode', () => {
    expect(
      buildCreateUrl({type: 'ebook', billing: 'paid', price: '10'}),
    ).toBe(
      '/dashboard/items/new/details?type=ebook&billing=paid&price_cents=1000',
    );
    expect(
      buildCreateUrl({type: 'audio', billing: 'free', price: ''}),
    ).toBe('/dashboard/items/new/details?type=audio&billing=free');
  });
  test('course urls carry the billing mode', () => {
    expect(
      buildCreateUrl({type: 'course', billing: 'paid', price: '19.99'}),
    ).toBe('/dashboard/items/new/course?billing=paid&price_cents=1999');
    expect(
      buildCreateUrl({type: 'course', billing: 'free', price: ''}),
    ).toBe('/dashboard/items/new/course?billing=free');
  });
  test('parseWizardPrefill validates type, billing, and price', () => {
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=ebook&billing=paid&price_cents=1000'),
      ),
    ).toEqual({type: 'ebook', billing: 'paid', price: '10'});
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=bogus&billing=paid&price_cents=1000'),
      ).type,
    ).toBeNull();
    expect(
      parseWizardPrefill(
        new URLSearchParams('type=ebook&billing=bogus&price_cents=1000'),
      ).billing,
    ).toBeNull();
    expect(
      parseWizardPrefill(new URLSearchParams('type=audio&billing=free')).price,
    ).toBeNull();
  });
});

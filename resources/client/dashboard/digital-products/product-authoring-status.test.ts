import {describe, expect, test} from 'vitest';
import {missingProductRequirements, resolveProductReviewState} from './product-authoring-status';

describe('creator product review state', () => {
  test('approved product with pending-update flag is not relabeled draft', () => {
    expect(resolveProductReviewState('approved', true)).toBe('approved_update_review');
    expect(resolveProductReviewState('approved', false)).toBe('approved');
  });
  test('initial review, rejected and other server statuses retain their meaning', () => {
    expect(resolveProductReviewState('pending_approval')).toBe('pending_approval');
    expect(resolveProductReviewState('rejected', true)).toBe('rejected');
    expect(resolveProductReviewState('archived')).toBe('archived');
    expect(resolveProductReviewState('unknown')).toBe('draft');
  });
});

describe('creator submission prerequisites', () => {
  const base = {
    title: 'Photography guide',
    filesCount: 1,
    billing: 'paid' as const,
    price: '25.00',
    type: 'digital' as const,
  };

  test('requires title, private files and a valid selling decision', () => {
    expect(missingProductRequirements({
      ...base, title: ' ', filesCount: 0, billing: null, price: '',
    })).toEqual(['title', 'files', 'pricing']);
    expect(missingProductRequirements({...base})).toEqual([]);
  });

  test('supports Free access and refuses zero or invalid Paid prices', () => {
    expect(missingProductRequirements({...base, billing: 'free', price: '0'})).toEqual([]);
    expect(missingProductRequirements({...base, price: '0'})).toEqual(['pricing']);
    expect(missingProductRequirements({...base, price: 'abc'})).toEqual(['pricing']);
  });

  test('does not impose optional storefronts, samples, or course file requirements', () => {
    expect(missingProductRequirements({...base, type: 'audio', filesCount: 0})).toEqual(['files']);
    expect(missingProductRequirements({...base, type: 'course', filesCount: 0})).toEqual([]);
  });
});

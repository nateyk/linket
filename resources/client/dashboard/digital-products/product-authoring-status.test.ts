import {describe, expect, test} from 'vitest';
import {resolveProductReviewState} from './product-authoring-status';

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

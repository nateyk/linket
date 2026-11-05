import {describe, expect, it} from 'vitest';
import {isSuccessfulFreeCheckoutResponse} from './free-checkout-response';

describe('zero-price storefront checkout response', () => {
  it('recognizes an accepted free order even if a legacy status field is stale', () => {
    expect(
      isSuccessfulFreeCheckoutResponse('free', {
        order_id: 'order-uuid-1',
        status: 'pending_payment',
        access_token: 'private-value',
        reference_endpoint: '/api/v1/public/direct-orders/order-uuid-1/reference',
      }),
    ).toBe(true);
  });

  it('never treats a paid order as free even if a gateway reference is present', () => {
    expect(
      isSuccessfulFreeCheckoutResponse('direct', {
        order_id: 'order-uuid-2',
        access_token: 'private-value',
        reference_endpoint: '/api/v1/public/direct-orders/order-uuid-2/reference',
      }),
    ).toBe(false);
  });

  it('rejects empty or malformed response bodies rather than showing false success', () => {
    for (const payload of [null, undefined, {}, {order_id: ''}, {order_id: 123}]) {
      expect(isSuccessfulFreeCheckoutResponse('free', payload)).toBe(false);
    }
  });
});

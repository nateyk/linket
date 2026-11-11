import {describe, expect, it} from 'vitest';
import {isSuccessfulFreeCheckoutResponse} from './free-checkout-response';

describe('SF-09 secure free-order response classification', () => {
  it('recognizes an accepted free order despite stale legacy payment status and token fields', () => {
    expect(
      isSuccessfulFreeCheckoutResponse('free', {
        order_id: 'd3de35d0-8a8a-4db4-9463-7c58a42c8189',
        status: 'pending_payment',
        reference_endpoint: '/api/v1/public/direct-orders/id/reference',
        access_token: 'test-token-not-to-be-displayed',
      }),
    ).toBe(true);
  });

  it('recognizes a completed free checkout without any Verify.et fields', () => {
    expect(
      isSuccessfulFreeCheckoutResponse('free', {
        order_id: 'e7518de6-b907-4d88-95cd-257ca31c22f7',
        status: 'paid',
        checkout_url: '/find-my-purchase/orders?highlight=uuid',
      }),
    ).toBe(true);
  });

  it('never treats paid or unavailable products as free even with a free-looking payload', () => {
    const payload = {
      order_id: 'd3de35d0-8a8a-4db4-9463-7c58a42c8189',
      status: 'paid',
      access_token: 'private',
    };
    expect(isSuccessfulFreeCheckoutResponse('direct', payload)).toBe(false);
    expect(isSuccessfulFreeCheckoutResponse('unavailable', payload)).toBe(false);
    expect(isSuccessfulFreeCheckoutResponse(undefined, payload)).toBe(false);
  });

  it('rejects empty and malformed response bodies instead of claiming success', () => {
    for (const payload of [
      null,
      undefined,
      {},
      {order_id: ''},
      {order_id: '  '},
      {order_id: 17},
      {order_id: null},
      [],
      'd3de35d0-8a8a-4db4-9463-7c58a42c8189',
    ]) {
      expect(isSuccessfulFreeCheckoutResponse('free', payload)).toBe(false);
    }
  });
});

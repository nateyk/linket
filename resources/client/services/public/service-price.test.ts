import {describe, expect, test} from 'vitest';
import {serviceStartingPrice} from './service-price';

describe('serviceStartingPrice', () => {
  test('formats the lowest package price', () => {
    expect(
      serviceStartingPrice({
        starting_price_cents: 29900,
        currency: 'ETB',
      }),
    ).toContain('299');
  });

  test('returns null when every package is quote-only', () => {
    expect(
      serviceStartingPrice({
        starting_price_cents: null,
        currency: 'ETB',
      }),
    ).toBeNull();
  });
});

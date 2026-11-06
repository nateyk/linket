/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import {ProductFaq} from './product-faq';

const product: PublicDigitalProduct = {
  id: 8,
  title: 'Creator guide',
  currency: 'ETB',
  price_cents: 0,
  payment_mode: 'free',
};

describe('SF-09 FAQ follows the actual product payment mode', () => {
  it('explains free checkout without claiming payment confirmation or a refund', () => {
    render(<ProductFaq product={product} />);
    expect(
      screen.getByText(/Complete the free checkout, then use your email/i),
    ).toBeTruthy();
    expect(screen.queryByText('What is the refund policy?')).toBeNull();
    expect(screen.queryByText(/payment is confirmed/i)).toBeNull();
  });

  it('retains receipt, access and refund information for paid products', () => {
    render(
      <ProductFaq
        product={{...product, price_cents: 24000, payment_mode: 'direct'}}
      />,
    );
    expect(screen.getByText('What is the refund policy?')).toBeTruthy();
    expect(screen.getByText(/payment is confirmed/i)).toBeTruthy();
    expect(screen.getByRole('link', {name: 'My Portal'})).toBeTruthy();
  });
});

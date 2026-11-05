/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import {ProductPricingCard} from './product-pricing-card';

const baseProduct: PublicDigitalProduct = {
  id: 17,
  title: 'Amharic design course',
  currency: 'ETB',
  price_cents: 0,
  payment_mode: 'free',
  can_buy: true,
  is_course: true,
  lessons_count: 5,
  chapters_count: 2,
};

function renderPricingCard(
  product: PublicDigitalProduct = baseProduct,
  onBuy = vi.fn(),
) {
  render(
    <ProductPricingCard
      product={product}
      appearance={null}
      checkoutCancelled={false}
      checkoutFailed={false}
      submitting={false}
      onBuy={onBuy}
    />,
  );
  return onBuy;
}

describe('SF-09 — product pricing and truthful free-access state', () => {
  it('makes free access actionable without describing it as a payment', async () => {
    const onBuy = renderPricingCard();
    expect(screen.getByRole('button', {name: 'Get for free'})).toBeTruthy();
    expect(screen.getByText('Free access, no payment required')).toBeTruthy();
    expect(screen.queryByText('One-time payment, no subscription')).toBeNull();
    expect(
      screen.queryByText(
        'Secure payment with protected access after confirmation.',
      ),
    ).toBeNull();
    await userEvent.click(screen.getByRole('button', {name: 'Get for free'}));
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it('preserves paid checkout labels, fulfillment notes and the existing action', () => {
    renderPricingCard({
      ...baseProduct,
      price_cents: 45000,
      payment_mode: 'direct',
    });
    expect(screen.getByRole('button', {name: 'Buy now'})).toBeTruthy();
    expect(screen.getByText('One-time payment, no subscription')).toBeTruthy();
    expect(
      screen.getByText(
        'Secure payment with protected access after confirmation.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Get for free')).toBeNull();
  });

  it('does not infer free checkout from the numerical price without a free payment mode', () => {
    renderPricingCard({...baseProduct, price_cents: 0, payment_mode: 'direct'});
    expect(screen.getByRole('button', {name: 'Buy now'})).toBeTruthy();
    expect(screen.queryByText('Free access, no payment required')).toBeNull();
  });

  it('still disables the action when the creator cannot sell', () => {
    renderPricingCard({...baseProduct, can_buy: false});
    expect(
      screen.getByRole('button', {name: 'Temporarily unavailable'}),
    ).toHaveProperty('disabled', true);
  });

  it('prevents duplicate free claims after the first successful checkout', async () => {
    const onBuy = vi.fn();
    render(
      <ProductPricingCard
        product={baseProduct}
        appearance={null}
        checkoutCancelled={false}
        checkoutFailed={false}
        submitting={false}
        completed
        onBuy={onBuy}
      />,
    );

    const action = screen.getByRole('button', {name: 'Free order complete'});
    expect(action).toHaveProperty('disabled', true);
    await userEvent.click(action);
    expect(onBuy).not.toHaveBeenCalled();
  });
});

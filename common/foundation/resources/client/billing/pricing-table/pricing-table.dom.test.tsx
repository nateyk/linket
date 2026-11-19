/**
 * @vitest-environment jsdom
 */
import {Product} from '@app/gen/schemas/product';
import {render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {PricingTable} from './pricing-table';
import {findBestPrice} from './find-best-price';
import {UpsellLabel} from './upsell-label';

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({isLoggedIn: false, isSubscribed: false}),
}));
vi.mock('react-router', () => ({useNavigate: () => vi.fn()}));

const makePlan = (overrides: Partial<Product>): Product => ({
  id: 1,
  name: 'Free',
  description: null,
  uuid: 'free',
  feature_list: [],
  position: 0,
  recommended: false,
  free: true,
  is_default: true,
  active: true,
  hidden: false,
  trial_period_days: 0,
  storefront_benefits: {free_verified_sales: 15},
  pricing_features: [],
  created_at: null,
  ...overrides,
});

test('public pricing displays the Chapa checkout summary without obsolete verification quotas', () => {
  render(
    <PricingTable
      selectedCycle="monthly"
      products={[
        makePlan({}),
        makePlan({
          id: 2,
          name: 'Pro',
          uuid: 'pro',
          free: false,
          is_default: false,
          storefront_benefits: {free_verified_sales: 0},
          prices: [{
            id: 9,
            amount: 700,
            currency: 'ETB',
            interval: 'month',
            interval_count: 1,
            subscriptions_count: null,
            stripe_id: null,
            paypal_id: null,
          }],
        }),
      ]}
    />,
  );

  expect(screen.getAllByText('Secure digital product payments via Chapa.')).toHaveLength(2);
  expect(screen.queryByText(/lifetime verified sales/i)).toBeNull();
});

test('plan cards retain features and highlight only the recommended plan', () => {
  render(
    <PricingTable
      selectedCycle="monthly"
      products={[
        makePlan({feature_list: ['5 free products']}),
        makePlan({
          id: 2,
          name: 'Pro',
          uuid: 'pro',
          free: false,
          recommended: true,
          feature_list: ['Unlimited products'],
          prices: [{
            id: 9,
            amount: 700,
            currency: 'ETB',
            interval: 'month',
            interval_count: 1,
            subscriptions_count: null,
            stripe_id: null,
            paypal_id: null,
          }],
        }),
      ]}
    />,
  );

  expect(screen.getByText('Most popular')).toBeTruthy();
  expect(screen.getByText('5 free products')).toBeTruthy();
  expect(screen.getByText('Unlimited products')).toBeTruthy();
  expect(screen.getAllByRole('button', {name: 'Get started'})).toHaveLength(2);
});

test('annual savings compares equivalent monthly costs', () => {
  render(
    <UpsellLabel
      products={[
        makePlan({
          id: 2,
          name: 'Pro',
          uuid: 'pro',
          free: false,
          prices: [
            {
              id: 8,
              amount: 700,
              currency: 'ETB',
              interval: 'month',
              interval_count: 1,
              subscriptions_count: null,
              stripe_id: null,
              paypal_id: null,
            },
            {
              id: 9,
              amount: 7000,
              currency: 'ETB',
              interval: 'year',
              interval_count: 1,
              subscriptions_count: null,
              stripe_id: null,
              paypal_id: null,
            },
          ],
        }),
      ]}
    />,
  );

  expect(screen.getByText('Save up to 17%')).toBeTruthy();
});

test('monthly pricing prefers a one-month price even if annual comes first', () => {
  const plans: NonNullable<Product['prices']> = [
    {
      id: 9, amount: 6000, currency: 'ETB',
      interval: 'month', interval_count: 12,
      subscriptions_count: null, stripe_id: null, paypal_id: null,
    },
    {
      id: 8, amount: 700, currency: 'ETB',
      interval: 'month', interval_count: 1,
      subscriptions_count: null, stripe_id: null, paypal_id: null,
    },
  ];

  expect(findBestPrice('monthly', plans)?.id).toBe(8);
  expect(findBestPrice('yearly', plans)?.id).toBe(9);
});

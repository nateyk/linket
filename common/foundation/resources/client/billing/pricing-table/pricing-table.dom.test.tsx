/**
 * @vitest-environment jsdom
 */
import {Product} from '@app/gen/schemas/product';
import {render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {PricingTable} from './pricing-table';

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

test('public pricing displays the saved Free quota and Pro allowance summary', () => {
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

  expect(screen.getByText('Free forever · 15 lifetime verified sales · No commission')).toBeTruthy();
  expect(screen.getByText('Unlimited eligible verified sales while subscribed · No commission')).toBeTruthy();
});

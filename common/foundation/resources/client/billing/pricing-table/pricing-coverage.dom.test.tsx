/**
 * @vitest-environment jsdom
 *
 * Regression coverage for the public pricing page's real checkout and billing
 * states. These intentionally use the production pricing components.
 */
import type {Product} from '@app/gen/schemas/product';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {BillingCycleRadio} from './billing-cycle-radio';
import {findBestPrice} from './find-best-price';
import {PricingTable} from './pricing-table';
import {UpsellLabel} from './upsell-label';

const state = vi.hoisted(() => ({
  isLoggedIn: false,
  isSubscribed: false,
  navigate: vi.fn(),
  saveSelection: vi.fn(),
}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({
    isLoggedIn: state.isLoggedIn,
    isSubscribed: state.isSubscribed,
  }),
}));
vi.mock('react-router', () => ({
  useNavigate: () => state.navigate,
}));
vi.mock('@ui/utils/hooks/local-storage', () => ({
  setInLocalStorage: state.saveSelection,
}));

type Price = NonNullable<Product['prices']>[number];

function makePrice(overrides: Partial<Price> = {}): Price {
  return {
    id: 8,
    amount: 700,
    currency: 'ETB',
    interval: 'month',
    interval_count: 1,
    subscriptions_count: null,
    stripe_id: null,
    paypal_id: null,
    ...overrides,
  };
}

function makePlan(overrides: Partial<Product> = {}): Product {
  return {
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
  };
}

function proPlan(overrides: Partial<Product> = {}): Product {
  return makePlan({
    id: 2,
    name: 'Pro',
    uuid: 'pro',
    free: false,
    is_default: false,
    recommended: true,
    prices: [makePrice()],
    ...overrides,
  });
}

beforeEach(() => {
  state.isLoggedIn = false;
  state.isSubscribed = false;
  state.navigate.mockClear();
  state.saveSelection.mockClear();
});

afterEach(cleanup);

test('only visible tiers render with accessible headings and a recommendation badge', () => {
  render(
    <PricingTable
      selectedCycle="monthly"
      products={[
        makePlan({description: 'Start selling for free'}),
        proPlan({description: 'More features for growing creators'}),
        proPlan({id: 3, name: 'Hidden', hidden: true, recommended: false}),
      ]}
    />,
  );

  expect(screen.getByRole('heading', {name: 'Free', level: 2})).toBeTruthy();
  expect(screen.getByRole('heading', {name: 'Pro', level: 2})).toBeTruthy();
  expect(screen.queryByText('Hidden')).toBeNull();
  expect(screen.getByText('Start selling for free')).toBeTruthy();
  expect(screen.getByText('More features for growing creators')).toBeTruthy();
  expect(screen.getAllByText('Most popular')).toHaveLength(1);
  expect(screen.queryByText('Secure digital product payments via Chapa.')).toBeNull();
});

test('guest Free CTA registers without recording a nonexistent price', () => {
  render(<PricingTable selectedCycle="monthly" products={[makePlan()]} />);

  fireEvent.click(screen.getByRole('button', {name: 'Get started'}));

  expect(state.navigate).toHaveBeenCalledWith('/register?redirectFrom=pricing');
  expect(state.saveSelection).not.toHaveBeenCalled();
});

test('guest paid CTA retains the selected plan and price for onboarding', () => {
  render(<PricingTable selectedCycle="monthly" products={[proPlan()]} />);

  fireEvent.click(screen.getByRole('button', {name: 'Get started'}));

  expect(state.saveSelection).toHaveBeenCalledWith('be.onboarding.selected', {
    productId: 2,
    priceId: 8,
  });
  expect(state.navigate).toHaveBeenCalledWith('/register?redirectFrom=pricing');
});

test('paid trial is labeled from the configured plan duration', () => {
  render(
    <PricingTable
      selectedCycle="monthly"
      products={[proPlan({trial_period_days: 7})]}
    />,
  );
  expect(screen.getByRole('button', {name: /free 7 day trial/i})).toBeTruthy();
});

test('signed-in free users see a disabled current-plan action', () => {
  state.isLoggedIn = true;

  render(<PricingTable selectedCycle="monthly" products={[makePlan()]} />);

  const button = screen.getByRole('button', {name: 'Current plan'});
  expect(button.hasAttribute('disabled')).toBe(true);
  fireEvent.click(button);
  expect(state.navigate).not.toHaveBeenCalled();
});

test('signed-in subscribers do not see the Free tier as their current plan', () => {
  state.isLoggedIn = true;
  state.isSubscribed = true;
  render(<PricingTable selectedCycle="monthly" products={[makePlan()]} />);
  expect(screen.getByRole('button', {name: 'Free plan'})).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Current plan'})).toBeNull();
});

test('signed-in creators check out with the configured product and price', () => {
  state.isLoggedIn = true;

  render(<PricingTable selectedCycle="monthly" products={[proPlan()]} />);
  fireEvent.click(screen.getByRole('button', {name: 'Upgrade'}));

  expect(state.navigate).toHaveBeenCalledWith('/checkout/2/8');
  expect(state.saveSelection).not.toHaveBeenCalled();
});

test('subscribers use change-plan confirmation, not a new checkout', () => {
  state.isLoggedIn = true;
  state.isSubscribed = true;

  render(<PricingTable selectedCycle="monthly" products={[proPlan()]} />);
  fireEvent.click(screen.getByRole('button', {name: 'Upgrade'}));

  expect(state.navigate).toHaveBeenCalledWith('/change-plan/2/8/confirm');
});

test('a paid plan without a price cannot navigate to an undefined checkout ID', () => {
  state.isLoggedIn = true;
  render(<PricingTable selectedCycle="monthly" products={[proPlan({prices: []})]} />);

  const button = screen.getByRole('button', {name: 'Upgrade'});
  expect(button.hasAttribute('disabled')).toBe(true);
  fireEvent.click(button);
  expect(state.navigate).not.toHaveBeenCalled();
});

test('annual pricing uses its actual price record, label, and checkout route', () => {
  state.isLoggedIn = true;
  const annual = makePrice({id: 21, amount: 7000, interval: 'year'});
  render(
    <PricingTable
      selectedCycle="yearly"
      products={[proPlan({prices: [makePrice(), annual]})]}
    />,
  );

  expect(screen.getByText('Billed annually')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Upgrade'}));
  expect(state.navigate).toHaveBeenCalledWith('/checkout/2/21');
});

test('a twelve-month price is labeled as annually billed', () => {
  render(
    <PricingTable
      selectedCycle="yearly"
      products={[proPlan({prices: [
        makePrice(),
        makePrice({id: 22, amount: 6000, interval_count: 12}),
      ]})]}
    />,
  );
  expect(screen.getByText('Billed annually')).toBeTruthy();
});

test('annual selection does not falsely label a monthly-only price', () => {
  render(<PricingTable selectedCycle="yearly" products={[proPlan()]} />);
  expect(screen.queryByText('Billed annually')).toBeNull();
});

test('billing selector exposes real radio controls and reports selected billing cycle', () => {
  const onChange = vi.fn();
  render(
    <BillingCycleRadio
      selectedCycle="monthly"
      onChange={onChange}
      products={[proPlan({prices: [
        makePrice(),
        makePrice({id: 21, amount: 7000, interval: 'year'}),
      ]})]}
    />,
  );

  const monthly = screen.getByRole('radio', {name: 'Monthly'});
  const annual = screen.getByRole('radio', {name: 'Annual'});
  expect(monthly.getAttribute('value')).toBe('monthly');
  expect(annual.getAttribute('value')).toBe('yearly');
  expect(screen.getByText('Save up to 17%')).toBeTruthy();
  fireEvent.click(annual);
  expect(onChange).toHaveBeenCalledWith('yearly');
});

test('monthly pricing prefers one-month records over annual records in API order', () => {
  const annual = makePrice({id: 21, amount: 6000, interval_count: 12});
  const monthly = makePrice();
  expect(findBestPrice('monthly', [annual, monthly])?.id).toBe(8);
  expect(findBestPrice('yearly', [annual, monthly])?.id).toBe(21);
});

test('pricing finder handles day-based pricing, empty lists and fallback records', () => {
  const thirtyDay = makePrice({id: 30, interval: 'day', interval_count: 30});
  expect(findBestPrice('monthly', [thirtyDay])?.id).toBe(30);
  expect(findBestPrice('yearly', [thirtyDay])?.id).toBe(30);
  expect(findBestPrice('monthly', [])).toBeUndefined();
  expect(findBestPrice('yearly', [])).toBeUndefined();
});

test('annual savings supports year and twelve-month billing intervals', () => {
  render(
    <UpsellLabel
      products={[
        proPlan({id: 2, prices: [
          makePrice(),
          makePrice({id: 21, amount: 7000, interval: 'year'}),
        ]}),
        proPlan({id: 3, prices: [
          makePrice({id: 32, amount: 100}),
          makePrice({id: 33, amount: 600, interval_count: 12}),
        ]}),
      ]}
    />,
  );

  expect(screen.getByText('Save up to 50%')).toBeTruthy();
});

test('annual savings supports thirty-day monthly equivalents', () => {
  render(
    <UpsellLabel
      products={[proPlan({prices: [
        makePrice({id: 30, amount: 700, interval: 'day', interval_count: 30}),
        makePrice({id: 31, amount: 7000, interval: 'year'}),
      ]})]}
    />,
  );

  expect(screen.getByText('Save up to 17%')).toBeTruthy();
});

test('savings are omitted if no real monthly/annual pair is available', () => {
  render(
    <UpsellLabel
      products={[
        makePlan(),
        proPlan({id: 3, hidden: true, prices: [
          makePrice(),
          makePrice({id: 31, amount: 100, interval: 'year'}),
        ]}),
        proPlan({id: 4, prices: [makePrice()]}),
      ]}
    />,
  );
  expect(screen.queryByText(/Save up to/)).toBeNull();
});

test('savings are omitted across different currencies or zero-value monthly fees', () => {
  render(
    <UpsellLabel
      products={[
        proPlan({id: 2, prices: [
          makePrice({amount: 700, currency: 'ETB'}),
          makePrice({id: 21, amount: 7000, currency: 'USD', interval: 'year'}),
        ]}),
        proPlan({id: 3, prices: [
          makePrice({id: 31, amount: 0}),
          makePrice({id: 32, amount: 100, interval: 'year'}),
        ]}),
      ]}
    />,
  );
  expect(screen.queryByText(/Save up to/)).toBeNull();
});

test('equal or more expensive annual prices are never advertised as a discount', () => {
  render(
    <UpsellLabel
      products={[
        proPlan({id: 2, prices: [
          makePrice(),
          makePrice({id: 21, amount: 8400, interval: 'year'}),
        ]}),
        proPlan({id: 3, prices: [
          makePrice({id: 31, amount: 700}),
          makePrice({id: 32, amount: 12000, interval: 'year'}),
        ]}),
      ]}
    />,
  );
  expect(screen.queryByText(/Save up to/)).toBeNull();
});

/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, test, vi} from 'vitest';
import {LandingPagePricing} from './landing-page-pricing';

vi.mock('@common/admin/subscriptions/products-queries', () => ({
  listProductsOptions: () => ({queryKey: ['homepage-prices']}),
}));
vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({data: {data: []}}),
}));
vi.mock('@ui/bootstrap-data/bootstrap-data-store', () => ({
  getBootstrapData: () => ({loaders: {landingPage: {products: {data: []}}}}),
}));
vi.mock('@common/billing/pricing-table/pricing-table', () => ({
  PricingTable: ({layout, selectedCycle}: {layout: string; selectedCycle: string}) => (
    <div data-testid="homepage-pricing-layout">
      {layout} / {selectedCycle}
    </div>
  ),
}));

afterEach(cleanup);

test('homepage pricing opts into the editorial card layout and keeps billing selector functional', () => {
  render(
    <LandingPagePricing
      config={{name: 'pricing', title: 'Start free. Grow at your own pace.'}}
    />,
  );

  expect(screen.getByRole('heading', {name: 'Start free. Grow at your own pace.', level: 2})).toBeTruthy();
  expect(screen.getByTestId('homepage-pricing-layout').textContent).toBe('landing / yearly');
  expect(screen.getByRole('radio', {name: 'Monthly'})).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', {name: 'Monthly'}));
  expect(screen.getByTestId('homepage-pricing-layout').textContent).toBe('landing / monthly');
  expect(document.getElementById('pricing-section')).toBeTruthy();
});

/**
 * @vitest-environment jsdom
 */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {Component as PricingPage} from './pricing-page';

const query = vi.hoisted(() => ({
  faq: null as null | {name: 'faq'; title: string; questions: {question: string; answer: string}[]},
}));

vi.mock('@common/admin/subscriptions/products-queries', () => ({
  listProductsForPricingPageOptions: () => ({queryKey: ['pricing-page']}),
}));
vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({data: {data: [], faq: query.faq}}),
}));
vi.mock('@common/billing/pricing-table/pricing-table', () => ({
  PricingTable: ({selectedCycle}: {selectedCycle: string}) => (
    <div data-testid="selected-pricing-cycle">{selectedCycle}</div>
  ),
}));
vi.mock('../../seo/static-page-title', () => ({
  StaticPageTitle: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('../../ui/footer/footer', () => ({
  Footer: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../ui/landing-page/header/header', () => ({
  Header: () => <header data-testid="site-header" />,
}));
vi.mock('@common/ui/landing-page/faq/landing-page-faq', () => ({
  LandingPageFaq: ({config}: {config: {title: string}}) => (
    <section data-testid="pricing-faq">{config.title}</section>
  ),
}));

beforeEach(() => {
  query.faq = null;
});
afterEach(cleanup);

test('pricing page preserves the public layout and a working billing selector', () => {
  render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', {name: 'Choose the right plan for you', level: 1})).toBeTruthy();
  expect(screen.getByText("Start for free, then upgrade when you're ready to grow.")).toBeTruthy();
  expect(screen.getByTestId('selected-pricing-cycle').textContent).toBe('yearly');
  fireEvent.click(screen.getByRole('radio', {name: 'Monthly'}));
  expect(screen.getByTestId('selected-pricing-cycle').textContent).toBe('monthly');
  expect(screen.getByRole('link', {name: 'Contact us'}).getAttribute('href')).toBe('/contact');
  expect(screen.getByTestId('site-header')).toBeTruthy();
  expect(screen.getByTestId('site-footer')).toBeTruthy();
});

test('configured FAQ replaces fallback contact prompt without duplicating sections', () => {
  query.faq = {
    name: 'faq',
    title: 'Questions before you get started',
    questions: [{question: 'Can I start for free?', answer: 'Yes'}],
  };

  render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );

  expect(screen.getByTestId('pricing-faq').textContent).toBe('Questions before you get started');
  expect(screen.queryByRole('link', {name: 'Contact us'})).toBeNull();
});

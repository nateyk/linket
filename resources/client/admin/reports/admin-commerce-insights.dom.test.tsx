/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Component} from './admin-commerce-insights';

const fixture = vi.hoisted(() => ({mode: 'success', response: {} as any, requestParams: [] as any[]}));
vi.mock('@common/http/query-client', () => ({apiClient: {get: async (_url: string, options: any) => {
  fixture.requestParams.push(options.params);
  if (fixture.mode === 'loading') return new Promise(() => {});
  if (fixture.mode === 'error') throw new Error('network error');
  return {data: fixture.response};
}}}));
vi.mock('react-router', async importOriginal => ({...(await importOriginal() as any), useOutletContext: () => ({dateRange: {start: {toAbsoluteString: () => '2026-10-01', timeZone: 'UTC'}, end: {toAbsoluteString: () => '2026-10-31'}}})}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: any) => <>{message}</>}));
vi.mock('@ui/i18n/formatted-number', () => ({FormattedNumber: ({value}: any) => <>{value}</>}));
vi.mock('@ui/i18n/formatted-currency', () => ({FormattedCurrency: ({valueInCents}: any) => <>{valueInCents} cents</>}));
vi.mock('@ui/i18n/formatted-date', () => ({FormattedDate: ({date}: any) => <>{date}</>}));
vi.mock('@ui/i18n/selected-locale', () => ({useSelectedLocale: () => ({localeCode: 'en'})}));
vi.mock('@shadcn/chart/chart', () => ({Chart: {Container: ({children}: any) => <div>{children}</div>, Tooltip: () => null, TooltipContent: () => null}}));
vi.mock('recharts', () => ({Area: () => null, AreaChart: ({children}: any) => <div>{children}</div>, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null}));

const empty = {
  data: {
    currency: 'ETB', period: {start: '', end: ''},
    sales: {gross_sales_cents: 0, refunds_cents: 0, net_sales_cents: 0, creator_earnings_cents: 0, platform_fees_cents: 0, paid_orders: 0, unique_customers: 0},
    creator_trend: [], subscriptions: {revenue_cents: 0, active_paid: 0, pro_creators: 0, free_creators: 0},
    payouts: {paid_cents: 0, pending_cents: 0}, platform: {new_users: 0, total_users: 0, total_products: 0, published_products: 0, selling_creators: 0, active_creators: 0, creator_count: 0, pro_creators: 0, free_creators: 0}, trend: [], top_products: [], recent_orders: [],
  },
};

beforeEach(() => { fixture.mode = 'success'; fixture.response = structuredClone(empty); fixture.requestParams = []; });
afterEach(cleanup);
function renderPage() { const client = new QueryClient({defaultOptions: {queries: {retry: false}}}); render(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>); }

it('renders Chapa net sales, subscription revenue and product rankings from API data', async () => {
  fixture.response.data.sales = {
    gross_sales_cents: 15000, refunds_cents: 2500, net_sales_cents: 12500,
    creator_earnings_cents: 11250, platform_fees_cents: 1250,
    paid_orders: 3, unique_customers: 2,
  };
  fixture.response.data.trend = [{date: '2026-10-01', paid_orders: 3, gross_sales_cents: 15000, refunds_cents: 2500, net_sales_cents: 12500}];
  fixture.response.data.creator_trend = [{date: '2026-10-01', new_creators: 2}];
  fixture.response.data.subscriptions.revenue_cents = 50000;
  fixture.response.data.top_products = [{id: 1, title: 'Chapa guide', paid_orders: 3, gross_sales_cents: 15000, refunds_cents: 2500, net_sales_cents: 12500}];
  renderPage();
  expect((await screen.findAllByText('Net sales')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('12500 cents').length).toBeGreaterThan(0);
  expect(screen.getByText('Chapa subscription revenue')).toBeTruthy();
  expect(screen.getByText('Chapa guide')).toBeTruthy();
  expect(screen.queryByText('Pending verifications')).toBeNull();
  expect(fixture.requestParams).toContainEqual({start_date: '2026-10-01', end_date: '2026-10-31', timezone: 'UTC'});
});

it('renders useful empty states without retired payment widgets', async () => {
  renderPage();
  expect(await screen.findByText('No sales in this period')).toBeTruthy();
  expect(screen.getByText('No new creators in this period.')).toBeTruthy();
  expect(screen.getByText('No product sales in this period.')).toBeTruthy();
});

it('renders loading and error states', async () => {
  fixture.mode = 'loading'; renderPage();
  expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  cleanup(); fixture.mode = 'error'; renderPage();
  expect(await screen.findByText('Unable to load Linket insights')).toBeTruthy();
});

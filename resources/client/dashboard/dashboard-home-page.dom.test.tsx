/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Component} from './dashboard-home-page';

const fixture = vi.hoisted(() => ({sales: {} as any, report: {} as any, fail: false, loading: false, reportParams: [] as any[], workspaceId: 1}));
vi.mock('@common/http/query-client', () => ({apiClient: {get: async () => {
  if (fixture.loading) return new Promise(() => {});
  if (fixture.fail) throw new Error('network error');
  return {data: fixture.sales};
}}}));
vi.mock('@common/workspace/workspace-store', () => ({useWorkspaceStore: (selector: any) => selector({activeWorkspace: {id: fixture.workspaceId}})}));
vi.mock('@common/auth/use-auth', () => ({useAuth: () => ({user: {id: 77}})}));
vi.mock('@app/dashboard/reports/tracked-events-queries', () => ({trackedEventsReportOptions: (params: any) => { fixture.reportParams.push(params); return {queryKey: ['analytics', params.metric, params.workspace_id], queryFn: async () => fixture.report}; }}));
vi.mock('@common/seo/static-page-title', () => ({StaticPageTitle: () => null}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({DashboardLayout: {MainSection: 'main', SectionHeader: 'header', SidebarToggle: 'span', SectionTitle: 'h1', SectionContent: 'section'}}));
vi.mock('@common/admin/analytics/report-date-selector', () => ({ReportDateSelector: () => null}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message, values}: any) => <>{Object.entries(values ?? {}).reduce((text: string, [key, value]) => text.replace(`:${key}`, String(value)), message)}</>}));
vi.mock('@ui/i18n/formatted-number', () => ({FormattedNumber: ({value}: any) => <>{value}</>}));
vi.mock('@ui/i18n/formatted-currency', () => ({FormattedCurrency: ({valueInCents}: any) => <>{valueInCents} ETB cents</>}));
vi.mock('@ui/i18n/formatted-date', () => ({FormattedDate: ({date}: any) => <>{date}</>}));
vi.mock('@ui/i18n/formatted-relative-time', () => ({FormattedRelativeTime: ({date}: any) => <>{date}</>}));
vi.mock('@ui/i18n/format-money', () => ({getSiteCurrency: () => 'ETB', formatMoney: (value: number) => String(value)}));
vi.mock('@ui/i18n/selected-locale', () => ({useSelectedLocale: () => ({localeCode: 'en'})}));
vi.mock('@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets', () => ({DateRangePresets: [null, null, {getRangeValue: () => ({start: {toString: () => '2026-10-01', toAbsoluteString: () => '2026-10-01T00:00:00Z', timeZone: 'UTC'}, end: {toString: () => '2026-10-31', toAbsoluteString: () => '2026-10-31T23:59:59Z'}})}]}));
vi.mock('@shadcn/chart/chart', () => ({Chart: {Container: ({children}: any) => <div>{children}</div>, LoadingIndicator: () => <span>Loading chart</span>, Tooltip: () => null, TooltipContent: () => null}}));
vi.mock('recharts', () => ({Area: () => null, AreaChart: ({children}: any) => <div>{children}</div>, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null}));

beforeEach(() => {
  // Base UI scroll-area menus inspect Web Animations after closing; jsdom has no implementation.
  Element.prototype.getAnimations = () => [];
  fixture.fail = false;
  fixture.loading = false;
  fixture.reportParams = [];
  fixture.workspaceId = 1;
  fixture.sales = {summary: {verified_sales_count: 0, verified_revenue_cents: 0, net_sales_cents: 0, paid_orders_count: 0, items_sold_count: 0, average_order_cents: 0, pending_count: 0, manual_review_count: 0, currency: 'ETB'}, data: {data: []}, sales_trend: [], verification_allowance: {consumed: 0, remaining: 10, reserved: 0, limit: 10, is_pro: false}};
  fixture.report = {data: {events: {total: 0, data: []}, countries: {data: []}, referrers: {data: []}}};
  globalThis.IntersectionObserver = class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe() { queueMicrotask(() => this.callback([{isIntersecting: true} as IntersectionObserverEntry], this as unknown as IntersectionObserver)); }
    disconnect() {}
    unobserve() {}
  } as any;
});
afterEach(cleanup);

function showDashboard() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>);
}

it('shows sales and engagement widgets without legacy Verify.et allowance or review cards', async () => {
  showDashboard();
  expect(await screen.findByText('No orders yet')).toBeTruthy();
  expect(screen.getByText('No completed sales in this period')).toBeTruthy();
  for (const heading of ['Sales', 'Orders', 'Items sold', 'Average order']) {
    expect(screen.getByText(heading)).toBeTruthy();
  }
  for (const obsolete of ['Verification allowance', 'Payments needing manual review', 'Current subscription', 'Awaiting payment or verification']) {
    expect(screen.queryByText(obsolete)).toBeNull();
  }
  expect(await screen.findByText('No engagement activity yet')).toBeTruthy();
  expect(await screen.findByText('No location data yet')).toBeTruthy();
  expect(fixture.reportParams).toEqual(expect.arrayContaining([expect.objectContaining({metric: 'events', dashboard: '1', workspace_id: '1'}), expect.objectContaining({metric: 'countries', dashboard: '1', workspace_id: '1'})]));
  expect(screen.queryByText('Available for payout')).toBeNull();
});

it('shows refund-adjusted sales, order counts, units, and average order from Chapa totals', async () => {
  fixture.sales.summary = {
    verified_sales_count: 6,
    verified_revenue_cents: 184000,
    net_sales_cents: 164000,
    paid_orders_count: 4,
    items_sold_count: 7,
    average_order_cents: 41000,
    pending_count: 2,
    manual_review_count: 3,
    currency: 'ETB',
  };
  fixture.sales.verification_allowance = {consumed: 10, remaining: 0, reserved: 0, limit: 10, is_pro: false};
  showDashboard();
  expect(await screen.findByText('164000 ETB cents')).toBeTruthy();
  expect(screen.getByText('41000 ETB cents')).toBeTruthy();
  expect(screen.getByText('Items sold')).toBeTruthy();
  expect(screen.getByText('Net of completed refunds')).toBeTruthy();
  expect(screen.getByText('Paid Chapa orders')).toBeTruthy();
  expect(screen.queryByText('Verification allowance')).toBeNull();
  expect(screen.queryByText('Available for payout')).toBeNull();
});

it('shows placeholders instead of invented zero values when the KPI summary is missing', async () => {
  fixture.sales.summary = undefined;
  showDashboard();
  expect(await screen.findByText('No orders yet')).toBeTruthy();
  expect(screen.getByText('Sales')).toBeTruthy();
  expect(screen.getByText('Items sold')).toBeTruthy();
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
});

it('renders order loading errors instead of invented sales', async () => {
  fixture.fail = true;
  showDashboard();
  expect((await screen.findAllByText('Unable to load orders')).length).toBeGreaterThan(0);
});

it('shows loading placeholders while the sales request is pending', () => {
  fixture.loading = true;
  showDashboard();
  expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  expect(screen.queryByText('No orders yet')).toBeNull();
});

it('renders API-provided verified revenue and recent verification statuses', async () => {
  fixture.sales.summary = {verified_sales_count: 1, verified_revenue_cents: 4200, net_sales_cents: 4200, paid_orders_count: 1, items_sold_count: 1, average_order_cents: 4200, pending_count: 1, manual_review_count: 1, currency: 'ETB'};
  fixture.sales.data.data = [
    {uuid: 'paid', status: 'paid', gross_amount_cents: 4200, currency: 'ETB', buyer_name: 'Sample buyer', buyer_email: 'sample@example.test', created_at: '2026-10-10T10:00:00Z', product: {title: 'Paid workbook'}},
    {uuid: 'review', status: 'manual_review', gross_amount_cents: 3300, currency: 'ETB', buyer_name: null, buyer_email: 'guest@example.test', created_at: '2026-10-11T10:00:00Z', product: {title: 'Review workbook'}},
  ];
  fixture.sales.sales_trend = [{date: '2026-10-10', amount_cents: 4200}];
  showDashboard();
  expect((await screen.findAllByText('4200 ETB cents')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Paid workbook').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sample buyer').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Guest buyer').length).toBeGreaterThan(0);
  expect(screen.getAllByText('sample@example.test').length).toBeGreaterThan(0);
  expect(screen.getAllByText('guest@example.test').length).toBeGreaterThan(0);
  expect(screen.queryByRole('toolbar', {name: 'Filter recent orders'})).toBeNull();
  expect(screen.queryByRole('button', {name: 'Choose visible columns'})).toBeNull();
  expect(screen.queryByRole('searchbox', {name: 'Search recent orders'})).toBeNull();
  expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
  expect(screen.getByRole('link', {name: 'View all'})).toBeTruthy();
  expect(screen.getAllByText('#paid').length).toBeGreaterThan(0);
  expect(screen.queryByText('No completed sales in this period')).toBeNull();
});

it('presents a minimal responsive recent-orders list', async () => {
  fixture.sales.data.data = [
    {
      uuid: 'order-1234567890', status: 'paid', gross_amount_cents: 2600,
      currency: 'ETB', buyer_name: 'First buyer', buyer_email: 'first@example.test',
      created_at: '2026-11-12T09:00:00Z', product: {title: 'Creator guide'},
    },
    {
      uuid: 'review-0987654321', status: 'manual_review', gross_amount_cents: 1500,
      currency: 'ETB', buyer_name: null, buyer_email: null,
      created_at: '2026-11-11T09:00:00Z', product: {title: 'Digital workbook'},
    },
  ];
  showDashboard();

  const list = await screen.findByRole('list', {name: 'Recent orders'});
  expect(list.querySelectorAll('[data-slot="recent-order-row"]')).toHaveLength(2);
  expect(list.textContent).toContain('Order');
  expect(list.textContent).toContain('Customer');
  expect(list.textContent).toContain('Status');
  expect(list.textContent).toContain('Total');
  expect(list.textContent).toContain('Creator guide');
  expect(list.textContent).toContain('First buyer');
  expect(list.textContent).toContain('first@example.test');
  expect(list.textContent).toContain('Guest buyer');
  expect(list.textContent).toContain('#order-12');
  expect(list.textContent).toContain('Review');
  expect(list.textContent).toContain('Paid');
  expect(list.textContent).toContain('2600 ETB cents');
  expect(screen.queryByRole('toolbar', {name: 'Filter recent orders'})).toBeNull();

  const action = screen.getByRole('link', {name: 'View all'});
  expect(action.getAttribute('href')).toBe('/dashboard/orders');
  expect(document.querySelector('[data-slot="card-footer"] a[href="/dashboard/orders"]')).toBeNull();
});

it('keeps recent-order rows linked to the orders page', async () => {
  fixture.sales.data.data = [
    {uuid: 'paid-a', status: 'paid', gross_amount_cents: 2700, currency: 'ETB', buyer_name: 'First', created_at: '2026-11-12T09:00:00Z', product: {title: 'First guide'}},
    {uuid: 'review-b', status: 'manual_review', gross_amount_cents: 1500, currency: 'ETB', buyer_name: 'Second', created_at: '2026-11-11T09:00:00Z', product: {title: 'Second guide'}},
  ];
  showDashboard();

  const list = await screen.findByRole('list', {name: 'Recent orders'});
  const rows = list.querySelectorAll('a[data-slot="recent-order-row"]');
  expect(rows).toHaveLength(2);
  expect(rows[0]?.getAttribute('href')).toBe('/dashboard/orders');
  expect(list.textContent).toContain('First guide');
  expect(list.textContent).toContain('Second guide');
  expect(screen.getByRole('link', {name: 'View all'})).toBeTruthy();
});

it('uses a distinct analytics query key when switching workspaces', async () => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const {rerender} = render(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText('No engagement activity yet')).toBeTruthy();
  fixture.workspaceId = 2;
  rerender(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>);
  await screen.findByText('No engagement activity yet');
  expect(fixture.reportParams).toEqual(expect.arrayContaining([expect.objectContaining({dashboard: '1', workspace_id: '1'}), expect.objectContaining({dashboard: '1', workspace_id: '2'})]));
  expect(client.getQueryCache().findAll({queryKey: ['analytics']}).map(query => query.queryKey)).toEqual(expect.arrayContaining([['analytics', 'events', '1'], ['analytics', 'events', '2']]));
});

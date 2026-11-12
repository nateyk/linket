/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  fixture.sales = {summary: {verified_sales_count: 0, verified_revenue_cents: 0, pending_count: 0, manual_review_count: 0, currency: 'ETB'}, data: {data: []}, sales_trend: [], verification_allowance: {consumed: 0, remaining: 10, reserved: 0, limit: 10, is_pro: false}};
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

it('renders empty sales and the real free allowance without payout metrics', async () => {
  showDashboard();
  expect(await screen.findByText('No orders yet')).toBeTruthy();
  expect(screen.getByText('No verified sales in this period')).toBeTruthy();
  expect(screen.getByText('0 of 10 used')).toBeTruthy();
  expect(await screen.findByText('No engagement activity yet')).toBeTruthy();
  expect(await screen.findByText('No location data yet')).toBeTruthy();
  expect(fixture.reportParams).toEqual(expect.arrayContaining([expect.objectContaining({metric: 'events', dashboard: '1', workspace_id: '1'}), expect.objectContaining({metric: 'countries', dashboard: '1', workspace_id: '1'})]));
  expect(screen.queryByText('Available for payout')).toBeNull();
});

it('renders Pro and free quota exhaustion from the backend response', async () => {
  fixture.sales.verification_allowance = {consumed: 9, remaining: 1, reserved: 0, limit: 10, is_pro: false};
  showDashboard();
  expect(await screen.findByText('9 of 10 used')).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Explore Pro'})).toBeTruthy();
  cleanup();
  fixture.sales.verification_allowance.is_pro = true;
  showDashboard();
  expect(await screen.findByText('Unlimited eligible verified sales')).toBeTruthy();
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
  fixture.sales.summary = {verified_sales_count: 1, verified_revenue_cents: 4200, pending_count: 1, manual_review_count: 1, currency: 'ETB'};
  fixture.sales.data.data = [
    {uuid: 'paid', status: 'paid', gross_amount_cents: 4200, currency: 'ETB', buyer_name: 'Sample buyer', created_at: '2026-10-10T10:00:00Z', product: {title: 'Paid workbook'}},
    {uuid: 'review', status: 'manual_review', gross_amount_cents: 3300, currency: 'ETB', buyer_name: null, created_at: '2026-10-11T10:00:00Z', product: {title: 'Review workbook'}},
  ];
  fixture.sales.sales_trend = [{date: '2026-10-10', amount_cents: 4200}];
  showDashboard();
  expect(await screen.findByText('4200 ETB cents')).toBeTruthy();
  expect(screen.getAllByText('Paid workbook').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sample buyer').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Guest buyer').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', {name: 'Choose visible columns'})).toBeTruthy();
  expect(screen.getAllByText('Manual review needed').length).toBeGreaterThan(0);
  expect(screen.getByRole('link', {name: 'See all orders'})).toBeTruthy();
  expect(screen.getAllByText('#paid').length).toBeGreaterThan(0);
  expect(screen.queryByText('No verified sales in this period')).toBeNull();
});

it('presents compact, accessible recent-order table and mobile rows', async () => {
  fixture.sales.data.data = [
    {
      uuid: 'order-1234567890', status: 'paid', gross_amount_cents: 2600,
      currency: 'ETB', buyer_name: 'First buyer',
      created_at: '2026-11-12T09:00:00Z', product: {title: 'Creator guide'},
    },
    {
      uuid: 'review-0987654321', status: 'manual_review', gross_amount_cents: 1500,
      currency: 'ETB', buyer_name: null,
      created_at: '2026-11-11T09:00:00Z', product: {title: 'Digital workbook'},
    },
  ];
  showDashboard();

  const table = await screen.findByRole('table', {name: 'Recent orders'});
  expect(table.querySelectorAll('thead th')).toHaveLength(3);
  expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
  expect(table.textContent).toContain('Creator guide');
  expect(table.textContent).toContain('First buyer');
  expect(table.textContent).toContain('Manual review needed');

  const mobile = document.querySelector('ol[aria-labelledby="recent-orders-title"]');
  expect(mobile).not.toBeNull();
  expect(mobile?.querySelectorAll('li')).toHaveLength(2);
  expect(mobile?.textContent).toContain('#order-12');
  expect(mobile?.textContent).toContain('Guest buyer');
  expect(mobile?.textContent).toContain('2600 ETB cents');

  const action = screen.getByRole('link', {name: 'See all orders'});
  expect(action.getAttribute('href')).toBe('/dashboard/orders');
  expect(document.querySelector('[data-slot="card-footer"] a[href="/dashboard/orders"]')).toBeNull();
});


it('searches recent orders and sorts amounts within the five loaded records', async () => {
  fixture.sales.data.data = [
    {uuid: 'guide-123', status: 'paid', gross_amount_cents: 2600, currency: 'ETB', buyer_name: 'First buyer', created_at: '2026-11-12T09:00:00Z', product: {title: 'Creator guide'}},
    {uuid: 'workbook-456', status: 'manual_review', gross_amount_cents: 1500, currency: 'ETB', buyer_name: 'Second buyer', created_at: '2026-11-11T09:00:00Z', product: {title: 'Digital workbook'}},
  ];
  showDashboard();

  let table = await screen.findByRole('table', {name: 'Recent orders'});
  expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
  expect(table.querySelector('tbody tr')?.textContent).toContain('Creator guide');

  fireEvent.click(within(table).getByRole('button', {name: 'Amount'}));
  expect(table.querySelector('tbody tr')?.textContent).toContain('Digital workbook');

  const search = screen.getByRole('searchbox', {name: 'Search recent orders'});
  fireEvent.change(search, {target: {value: 'Creator guide'}});
  table = screen.getByRole('table', {name: 'Recent orders'});
  expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
  expect(table.textContent).toContain('Creator guide');
  expect(document.querySelectorAll('ol[aria-labelledby="recent-orders-title"] li')).toHaveLength(1);

  fireEvent.change(search, {target: {value: 'no such product'}});
  expect(screen.getByText('No matching orders')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
  expect(screen.getByRole('table', {name: 'Recent orders'}).querySelectorAll('tbody tr')).toHaveLength(2);
});

it('filters real payment statuses and lets desktop reveal optional columns', async () => {
  fixture.sales.data.data = [
    {uuid: 'paid-1', status: 'paid', gross_amount_cents: 2600, currency: 'ETB', buyer_name: 'Verified buyer', created_at: '2026-11-12T09:00:00Z', product: {title: 'Paid guide'}},
    {uuid: 'review-2', status: 'manual_review', gross_amount_cents: 1500, currency: 'ETB', buyer_name: 'Review buyer', created_at: '2026-11-11T09:00:00Z', product: {title: 'Review guide'}},
    {uuid: 'expired-3', status: 'expired', gross_amount_cents: 1200, currency: 'ETB', buyer_name: 'Expired buyer', created_at: '2026-11-10T09:00:00Z', product: {title: 'Expired guide'}},
  ];
  showDashboard();
  const user = userEvent.setup();
  const table = await screen.findByRole('table', {name: 'Recent orders'});
  expect(table.querySelectorAll('thead th')).toHaveLength(3);

  await user.click(screen.getByRole('combobox', {name: 'Filter by payment status'}));
  await user.click(await screen.findByRole('option', {name: 'Needs review'}));
  expect(screen.getByRole('table', {name: 'Recent orders'}).querySelectorAll('tbody tr')).toHaveLength(1);
  expect(screen.getByRole('table', {name: 'Recent orders'}).textContent).toContain('Review guide');

  await user.click(screen.getByRole('button', {name: 'Choose visible columns'}));
  await user.click(await screen.findByRole('menuitemcheckbox', {name: 'Buyer'}));
  expect(screen.getByRole('table', {name: 'Recent orders'}).querySelectorAll('thead th')).toHaveLength(4);
  expect(screen.getByRole('table', {name: 'Recent orders'}).textContent).toContain('Review buyer');
});


it('keeps the overview responsive when filters, sorting and columns change repeatedly', async () => {
  fixture.sales.data.data = [
    {uuid: 'paid-a', status: 'paid', gross_amount_cents: 2700, currency: 'ETB', buyer_name: 'First', created_at: '2026-11-12T09:00:00Z', product: {title: 'First guide'}},
    {uuid: 'review-b', status: 'manual_review', gross_amount_cents: 1500, currency: 'ETB', buyer_name: 'Second', created_at: '2026-11-11T09:00:00Z', product: {title: 'Second guide'}},
    {uuid: 'expired-c', status: 'expired', gross_amount_cents: 900, currency: 'ETB', buyer_name: 'Third', created_at: '2026-11-10T09:00:00Z', product: {title: 'Third guide'}},
  ];
  showDashboard();
  const user = userEvent.setup();

  for (const status of ['Needs review', 'All statuses', 'Failed or expired', 'All statuses']) {
    await user.click(screen.getByRole('combobox', {name: 'Filter by payment status'}));
    await user.click(await screen.findByRole('option', {name: status}));
    expect(screen.getByRole('table', {name: 'Recent orders'}).querySelectorAll('tbody tr').length)
      .toBe(status === 'All statuses' ? 3 : 1);
  }

  for (const column of ['Buyer', 'Date', 'Buyer', 'Date']) {
    await user.click(screen.getByRole('button', {name: 'Choose visible columns'}));
    await user.click(await screen.findByRole('menuitemcheckbox', {name: column}));
  }
  const table = screen.getByRole('table', {name: 'Recent orders'});
  expect(table.querySelectorAll('thead th')).toHaveLength(3);
  fireEvent.click(within(table).getByRole('button', {name: 'Amount'}));
  fireEvent.change(screen.getByRole('searchbox', {name: 'Search recent orders'}), {
    target: {value: 'Third guide'},
  });
  expect(screen.getByRole('table', {name: 'Recent orders'}).querySelectorAll('tbody tr')).toHaveLength(1);
  expect(screen.getByRole('link', {name: 'See all orders'})).toBeTruthy();
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

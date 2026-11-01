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
vi.mock('@ui/i18n/format-money', () => ({getSiteCurrency: () => 'ETB', formatMoney: (value: number) => String(value)}));
vi.mock('@ui/i18n/selected-locale', () => ({useSelectedLocale: () => ({localeCode: 'en'})}));
vi.mock('@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets', () => ({DateRangePresets: [null, null, {getRangeValue: () => ({start: {toString: () => '2026-10-01', toAbsoluteString: () => '2026-10-01T00:00:00Z', timeZone: 'UTC'}, end: {toString: () => '2026-10-31', toAbsoluteString: () => '2026-10-31T23:59:59Z'}})}]}));
vi.mock('@shadcn/chart/chart', () => ({Chart: {Container: ({children}: any) => <div>{children}</div>, LoadingIndicator: () => <span>Loading chart</span>, Tooltip: () => null, TooltipContent: () => null}}));
vi.mock('recharts', () => ({Area: () => null, AreaChart: ({children}: any) => <div>{children}</div>, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null}));

beforeEach(() => {
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
    {uuid: 'paid', status: 'paid', gross_amount_cents: 4200, currency: 'ETB', product: {title: 'Paid workbook'}},
    {uuid: 'review', status: 'manual_review', gross_amount_cents: 3300, currency: 'ETB', product: {title: 'Review workbook'}},
  ];
  fixture.sales.sales_trend = [{date: '2026-10-10', amount_cents: 4200}];
  showDashboard();
  expect(await screen.findByText('4200 ETB cents')).toBeTruthy();
  expect(screen.getAllByText('Paid workbook').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Manual review needed').length).toBeGreaterThan(0);
  expect(screen.queryByText('No verified sales in this period')).toBeNull();
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

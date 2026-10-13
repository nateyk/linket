/**
 * @vitest-environment jsdom
 */
import {apiClient} from '@common/http/query-client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';
import {KpiCards} from './kpi-cards';
import {PeriodPicker} from './period-picker';
import {PerformanceChart} from './performance-chart';
import {
  ProductStatistics,
  productStatisticsOptions,
  useProductStatistics,
} from './queries';
import {SalesChart} from './sales-chart';
import {TopCountries} from './top-countries';
import {TopReferrers} from './top-referrers';
import {ViewsChart} from './views-chart';

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: vi.fn()},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function monthFixture(overrides: Partial<ProductStatistics> = {}): ProductStatistics {
  return {
    period: {from: '2026-10-01', to: '2026-10-31'},
    kpis: {
      sales_count: 0,
      gross_cents: 0,
      creator_earnings_cents: 0,
      views_count: 0,
      conversion_pct: null,
    },
    sales_series: [{date: '2026-10-01', count: 0, gross_cents: 0}],
    views_series: [{date: '2026-10-01', count: 0}],
    top_countries: [],
    top_referrers: [],
    ...overrides,
  };
}

function pad(part: number) {
  return String(part).padStart(2, '0');
}

test('KpiCards renders all five KPI labels and an em-dash for a null conversion', () => {
  render(<KpiCards stats={monthFixture()} />);

  expect(screen.getByText('Sales')).toBeTruthy();
  expect(screen.getByText('Gross revenue')).toBeTruthy();
  expect(screen.getByText('Earned')).toBeTruthy();
  expect(screen.getByText('Views')).toBeTruthy();
  expect(screen.getByText('Conversion')).toBeTruthy();
  expect(screen.getByText('—')).toBeTruthy();
});

test('KpiCards formats money and shows conversion as a percentage when present', () => {
  const stats = monthFixture({
    kpis: {
      sales_count: 3,
      gross_cents: 15000,
      creator_earnings_cents: 13500,
      views_count: 10,
      conversion_pct: 30,
    },
  });

  render(<KpiCards stats={stats} />);

  expect(screen.getByText('150.00 Br')).toBeTruthy();
  expect(screen.getByText('135.00 Br')).toBeTruthy();
  expect(screen.getByText('30%')).toBeTruthy();
  expect(screen.queryByText('—')).toBeNull();
});

test('PeriodPicker quick action proposes the current month start and end', () => {
  const onChange = vi.fn();
  render(<PeriodPicker from="2026-01-01" to="2026-01-31" onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', {name: 'This month'}));

  const now = new Date();
  const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  )}`;
  expect(onChange).toHaveBeenCalledWith({from, to});
});

test('charts render empty states when the series are all zero', () => {
  const stats = monthFixture();

  render(<SalesChart stats={stats} />);
  render(<ViewsChart stats={stats} />);
  render(<PerformanceChart stats={stats} />);

  expect(screen.getByText('No sales in this period')).toBeTruthy();
  expect(screen.getByText('No views in this period')).toBeTruthy();
  expect(screen.getByText('No performance data in this period')).toBeTruthy();
});

test('charts render without crashing when there is activity in the period', () => {
  const stats = monthFixture({
    kpis: {sales_count: 2, gross_cents: 2000, creator_earnings_cents: 1800, views_count: 4, conversion_pct: 50},
    sales_series: [
      {date: '2026-10-01', count: 1, gross_cents: 1000},
      {date: '2026-10-02', count: 1, gross_cents: 1000},
    ],
    views_series: [
      {date: '2026-10-01', count: 2},
      {date: '2026-10-02', count: 2},
    ],
    top_countries: [{country: 'ET', sales_count: 2, gross_cents: 2000}],
    top_referrers: [{referrer: 'https://x.com/a', views_count: 2}],
  });

  render(<SalesChart stats={stats} />);
  render(<ViewsChart stats={stats} />);
  render(<PerformanceChart stats={stats} />);

  expect(screen.queryByText('No sales in this period')).toBeNull();
  expect(screen.queryByText('No views in this period')).toBeNull();
  expect(screen.queryByText('No performance data in this period')).toBeNull();
});

test('TopCountries renders ranked country rows', () => {
  const stats = monthFixture({
    top_countries: [
      {country: 'ET', sales_count: 3, gross_cents: 300},
      {country: 'US', sales_count: 1, gross_cents: 100},
    ],
  });

  render(<TopCountries items={stats.top_countries} />);

  expect(screen.getByText('ET')).toBeTruthy();
  expect(screen.getByText('US')).toBeTruthy();
  expect(screen.getByText('3.00 Br')).toBeTruthy();
});

test('TopReferrers renders ranked referrer rows', () => {
  const stats = monthFixture({
    top_referrers: [
      {referrer: 'https://x.com/a', views_count: 2},
      {referrer: 'https://y.com/b', views_count: 1},
    ],
  });

  render(<TopReferrers items={stats.top_referrers} />);

  expect(screen.getByText('https://x.com/a')).toBeTruthy();
  expect(screen.getByText('https://y.com/b')).toBeTruthy();
});

function QueryHarness() {
  const {data, isLoading} = useProductStatistics(
    ['digital-products', 1],
    '/api/v1/items/1/statistics',
    {from: '2026-10-01', to: '2026-10-31'},
  );
  return (
    <div data-testid="result">
      {isLoading ? 'loading' : data ? 'loaded' : 'error'}
    </div>
  );
}

test('useProductStatistics fetches from the endpoint with period params', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({data: monthFixture()});

  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  render(
    <QueryClientProvider client={queryClient}>
      <QueryHarness />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('result').textContent).toBe('loaded');
  });

  expect(apiClient.get).toHaveBeenCalledWith(
    '/api/v1/items/1/statistics',
    {params: {from: '2026-10-01', to: '2026-10-31'}},
  );
});

test('productStatisticsOptions derives its query key from the base key plus dates', () => {
  const options = productStatisticsOptions(
    ['digital-products', 99],
    '/api/v1/items/99/statistics',
    {from: '2026-10-01', to: '2026-10-31'},
  );

  expect(options.queryKey).toEqual([
    'digital-products',
    99,
    '2026-10-01',
    '2026-10-31',
  ]);
});
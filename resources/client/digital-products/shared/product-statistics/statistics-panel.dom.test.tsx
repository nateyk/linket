/**
 * @vitest-environment jsdom
 */
import {apiClient} from '@common/http/query-client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';
import {ProductStatistics} from './queries';
import {StatisticsPanel} from './statistics-panel';

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: vi.fn()},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function pad(part: number) {
  return String(part).padStart(2, '0');
}

function currentMonthPeriod() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    to: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      lastDay.getDate(),
    )}`,
  };
}

function emptyStats(): ProductStatistics {
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
  };
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StatisticsPanel
        productId="7"
        queryKey={['adminProductStatistics', '7']}
        endpoint="/api/v1/admin/items/7/statistics"
      />
    </QueryClientProvider>,
  );
}

test('StatisticsPanel requests the admin endpoint with current-month params on mount', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({data: emptyStats()});
  renderPanel();

  const salesLabels = await screen.findAllByText('Sales');

  expect(salesLabels.length).toBeGreaterThan(0);
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api/v1/admin/items/7/statistics',
    {params: currentMonthPeriod()},
  );
});

test('StatisticsPanel renders the five KPI labels and empty states for an all-zero payload', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({data: emptyStats()});
  renderPanel();

  await waitFor(() => {
    expect(screen.getByText('Gross revenue')).toBeTruthy();
  });

  expect(screen.getByText('Earned')).toBeTruthy();
  expect(screen.getAllByText('Views').length).toBeGreaterThan(0);
  expect(screen.getByText('Conversion')).toBeTruthy();
  expect(screen.getByText('—')).toBeTruthy();
  expect(screen.getAllByText('No sales in this period').length).toBeGreaterThan(
    0,
  );
  expect(screen.getByText('No views in this period')).toBeTruthy();
  expect(screen.getByText('No performance data in this period')).toBeTruthy();
  expect(
    screen.getByRole('button', {name: 'This month'}),
  ).toBeTruthy();
});
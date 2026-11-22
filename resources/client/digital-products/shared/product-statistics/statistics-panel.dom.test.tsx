/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';
import {StatisticsPanel} from './statistics-panel';

const getMock = vi.fn();

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: (...args: unknown[]) => getMock(...args)},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('StatisticsPanel shows retry UI when the statistics request fails', async () => {
  getMock.mockRejectedValue(new Error('network'));

  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });

  render(
    <QueryClientProvider client={queryClient}>
      <StatisticsPanel
        productId="9"
        queryKey={['digital-products', 'stats']}
        endpoint="/api/v1/items/9/statistics"
      />
    </QueryClientProvider>,
  );

  expect(
    await screen.findByText("Couldn't load statistics."),
  ).toBeTruthy();

  getMock.mockResolvedValue({
    data: {
      period: {from: '2026-10-01', to: '2026-10-31'},
      kpis: {
        sales_count: 0,
        gross_cents: 0,
        creator_earnings_cents: 0,
        views_count: 0,
        conversion_pct: null,
      },
      sales_series: [],
      views_series: [],
      top_countries: [],
      top_referrers: [],
    },
  });

  fireEvent.click(screen.getByRole('button', {name: 'Retry'}));

  await waitFor(() => {
    expect(screen.queryByText("Couldn't load statistics.")).toBeNull();
  });
});

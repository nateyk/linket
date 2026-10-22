/**
 * @vitest-environment jsdom
 */
import {apiClient} from '@common/http/query-client';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, waitFor} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeEach, expect, test, vi} from 'vitest';
import {Component} from './sales-payouts-page';

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: vi.fn(), post: vi.fn()},
}));

const summary = {
  gross_sales_cents: 0,
  creator_earnings_cents: 0,
  available_for_payout_cents: 0,
  held_earnings_cents: 0,
  reserved_payout_cents: 0,
  paid_out_cents: 0,
  lifetime_earnings_cents: 0,
  currency: 'ETB',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(((url: string) => {
    if (url === '/api/v1/items/sales') {
      return Promise.resolve({data: {summary, orders: {data: []}}});
    }
    if (url.includes('/payout-requests')) {
      return Promise.resolve({
        data: {
          data: [],
          links: [],
          meta: {current_page: 1, last_page: 1, per_page: 10, total: 0},
        },
      });
    }
    if (url.includes('/payout-method')) {
      return Promise.resolve({data: {data: null}});
    }
    return Promise.reject(new Error(`unexpected url: ${url}`));
  }) as never);
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  const router = createMemoryRouter(
    [{path: '/dashboard/sales-payouts', element: <Component />}],
    {initialEntries: ['/dashboard/sales-payouts']},
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>
    </QueryClientProvider>,
  );
}

test('empty tables render a plain message, not a card inside the table card', async () => {
  renderPage();

  await waitFor(() => {
    expect(document.querySelectorAll('[data-slot="empty"]').length).toBe(2);
  });

  const empties = document.querySelectorAll<HTMLElement>('[data-slot="empty"]');
  for (const empty of empties) {
    // nested-cards: the default Empty shell (rounded-card) would sit inside
    // the table's Card — call sites inside cards strip the shell.
    expect(empty.className).toContain('rounded-none');
    expect(empty.className).not.toContain('rounded-card');
    expect(empty.closest('[data-slot="card"]')).toBeTruthy();
  }
});

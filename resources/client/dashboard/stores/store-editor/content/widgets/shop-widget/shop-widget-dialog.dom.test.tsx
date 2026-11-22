/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';

const {PRODUCTS, mutate} = vi.hoisted(() => ({
  PRODUCTS: [
    {
      id: 11,
      title: 'Logo pack',
      status: 'approved',
      price_cents: 1500,
      currency: 'ETB',
    },
    {
      id: 12,
      title: 'Draft kit',
      status: 'draft',
      price_cents: 900,
      currency: 'ETB',
    },
  ],
  mutate: vi.fn(),
}));

vi.mock('@app/gen/digital-products', async importOriginal => ({
  ...(await importOriginal<typeof import('@app/gen/digital-products')>()),
  digitalProductsIndex: vi.fn(async () => ({data: PRODUCTS})),
}));

vi.mock('@common/ui/navigation/use-required-params', () => ({
  useRequiredParams: () => ({storeId: '5'}),
}));

vi.mock(
  '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget',
  () => ({
    useCrupdateBiolinkWidget: () => ({
      mutate,
      isPending: false,
    }),
  }),
);

import {ShopWidgetDialog} from './shop-widget-dialog';

beforeEach(() => {
  vi.clearAllMocks();
});

test('ShopWidgetDialog lists approved products and toggles product_ids selection', async () => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ShopWidgetDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Logo pack')).toBeTruthy();
  expect(screen.queryByText('Draft kit')).toBeNull();
  expect(screen.getByText('Products')).toBeTruthy();

  fireEvent.click(screen.getByLabelText('Logo pack'));

  await waitFor(() => {
    expect(screen.getByLabelText('Remove Logo pack')).toBeTruthy();
  });

  fireEvent.click(screen.getByLabelText('Remove Logo pack'));

  await waitFor(() => {
    expect(screen.queryByLabelText('Remove Logo pack')).toBeNull();
  });
});

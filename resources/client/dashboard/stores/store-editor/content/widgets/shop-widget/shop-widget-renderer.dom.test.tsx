/**
 * @vitest-environment jsdom
 */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {ComponentProps} from 'react';

const {get} = vi.hoisted(() => ({get: vi.fn()}));

vi.mock('@common/http/query-client', () => ({
  apiClient: {get},
}));

vi.mock('@app/digital-products/shared/product-card', () => ({
  ProductCard: ({title}: {title: string}) => <div>{title}</div>,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({
    trans: (value: {message: string} | string) =>
      typeof value === 'string' ? value : value.message,
  }),
}));

const {ShopWidgetRenderer} = await import('./shop-widget-renderer');

const props = {
  variant: 'biolinkPage',
  widget: {config: {product_ids: []}},
  biolink: {id: 42, back_half: 'creator', short_url: '/creator'},
} as unknown as ComponentProps<typeof ShopWidgetRenderer>;

beforeEach(() => {
  get.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Storefront public product load recovery', () => {
  test('recovers from a failed GET in place without reloading or losing the shop', async () => {
    get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        data: {
          data: [
            {id: 7, title: 'Sample course', price_cents: 0, currency: 'ETB'},
          ],
        },
      });

    render(<ShopWidgetRenderer {...props} />);

    expect(await screen.findByText("Couldn't load products")).toBeTruthy();
    const retry = screen.getByRole('button', {name: 'Retry loading products'});
    fireEvent.click(retry);

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(2);
    });
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/public/stores/42/digital-products',
    );
    expect(await screen.findByText('Sample course')).toBeTruthy();
    expect(screen.queryByText("Couldn't load products")).toBeNull();
  });

  test('does not show Retry for a genuinely empty successful response', async () => {
    get.mockResolvedValueOnce({data: {data: []}});
    render(<ShopWidgetRenderer {...props} />);

    expect(await screen.findByText('Nothing for sale yet')).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Retry loading products'})).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('allows repeated failures to be retried until the data is available', async () => {
    get
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('gateway'))
      .mockResolvedValueOnce({data: {data: []}});

    render(<ShopWidgetRenderer {...props} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Retry loading products'}));

    const retryAgain = await screen.findByRole('button', {
      name: 'Retry loading products',
    });
    fireEvent.click(retryAgain);

    expect(await screen.findByText('Nothing for sale yet')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(3);
  });
});

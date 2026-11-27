/**
 * @vitest-environment jsdom
 */
import {apiClient} from '@common/http/query-client';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {PublicDigitalProduct} from './digital-product-public-pages';
import {ProductReviewsBlock} from './product-reviews-block';

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: vi.fn()},
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    dates: {format: 'medium', default_timezone: 'UTC'},
  }),
}));

const product: PublicDigitalProduct = {
  id: 42,
  title: 'Resolver Presets',
  price_cents: 4500,
  currency: 'ETB',
  type: 'digital',
  cover: null,
};

function makeReviews(count: number) {
  return Array.from({length: count}, (_, index) => ({
    id: index + 1,
    stars: index === 0 ? 4 : 5,
    title: `Review title ${index + 1}`,
    review: `Detailed feedback ${index + 1}`,
    buyer_name: `Buyer ${index + 1}`,
    verified: index % 2 === 0,
    created_at: '2026-11-20T12:00:00Z',
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ProductReviewsBlock DOM', () => {
  test('renders fractional Rating summary, breakdown bars, and Show all pagination', async () => {
    const onSummary = vi.fn();
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: makeReviews(6),
        summary: {
          average: 4.6,
          rating_stats: {
            total: 6,
            counts: {5: 5, 4: 1, 3: 0, 2: 0, 1: 0},
            percentages: {5: 83, 4: 17, 3: 0, 2: 0, 1: 0},
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <ProductReviewsBlock
          product={product}
          biolinkId={7}
          appearance={{btnConfig: {variant: 'solid', radius: 'rounded-lg'}}}
          onSummary={onSummary}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('4.6 out of 5 · 6 reviews'),
    ).toBeTruthy();
    expect(screen.getByRole('img', {name: '4.6 / 5'})).toBeTruthy();
    expect(onSummary).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Verified Purchase').length).toBe(3);

    expect(screen.queryByText('Review title 6')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Show all 6 reviews'}));
    expect(screen.getByText('Review title 6')).toBeTruthy();
    expect(screen.getByRole('link', {name: 'My Portal'}).getAttribute('href')).toBe(
      '/my-portal',
    );
  });

  test('renders empty state when there are no reviews', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [],
        summary: {average: null, rating_stats: {total: 0, counts: {}, percentages: {}}},
      },
    });

    render(
      <MemoryRouter>
        <ProductReviewsBlock product={product} biolinkId={7} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No reviews yet.')).toBeTruthy();
  });

  test('shows Retry alert on failure and reloads cleanly when clicked', async () => {
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: {
          data: makeReviews(1),
          summary: {
            average: 4,
            rating_stats: {
              total: 1,
              counts: {5: 0, 4: 1, 3: 0, 2: 0, 1: 0},
              percentages: {5: 0, 4: 100, 3: 0, 2: 0, 1: 0},
            },
          },
        },
      });

    render(
      <MemoryRouter>
        <ProductReviewsBlock product={product} biolinkId={7} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Unable to load reviews.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));

    await waitFor(() => {
      expect(screen.getByText('Review title 1')).toBeTruthy();
    });
    expect(screen.getAllByRole('img', {name: '4 / 5'})).toHaveLength(2);
  });
});

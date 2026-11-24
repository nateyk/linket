/**
 * @vitest-environment jsdom
 *
 * T4 — a Paid course created from
 * `/dashboard/items/new/course?billing=paid&price_cents=1000` accepted an
 * empty (or zero) price and posted `price_cents: 0` while the product stayed
 * labeled Paid. The wizard's own price step gates on cents > 0
 * (`canContinue` in product-create-flow.ts); the course page must gate the
 * same way before it posts, with the wizard's inline Field.Error copy.
 */
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {Component} from './create-course-page';

// Settings are always mounted, so TipTap/ProseMirror is always present —
// stub layout APIs jsdom omits (same as create-course-page.test.tsx).
beforeAll(() => {
  const emptyRect: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
  Range.prototype.getBoundingClientRect = () => emptyRect;
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as unknown as DOMRectList;
  document.elementFromPoint = () => document.body;
});

const mockPost = vi.hoisted(() => vi.fn());

vi.mock('@common/http/query-client', async () => {
  const {QueryClient} = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({defaultOptions: {queries: {retry: false}}}),
    apiClient: {
      get: () => Promise.resolve({data: {data: []}}),
      post: mockPost,
      put: () => Promise.resolve({data: {data: []}}),
      delete: () => Promise.resolve({data: {data: []}}),
      request: () => Promise.resolve({data: {data: []}}),
    },
  };
});

const PAID_URL =
  '/dashboard/items/new/course?billing=paid&price_cents=1000';

function mount(url = PAID_URL) {
  const router = createMemoryRouter(
    [
      {path: '/dashboard/items/new/course', element: <Component />},
      {
        path: '/dashboard/items/:productId/course',
        element: <p>course builder</p>,
      },
      {path: '*', element: <p>not found</p>},
    ],
    {initialEntries: [url]},
  );
  render(
    <QueryClientProvider
      client={new QueryClient({defaultOptions: {queries: {retry: false}}})}
    >
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>
    </QueryClientProvider>,
  );
  return router;
}

function submitForm() {
  const form = document.getElementById('course-create-form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function typeTitle(title = 'Ethiopian coffee course') {
  fireEvent.change(screen.getByRole('textbox', {name: /course title/i}), {
    target: {value: title},
  });
}

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({data: {data: {id: 77}}});
});

describe('paid course price gate', () => {
  test('empty price blocks submit and shows the wizard copy inline', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();

    const priceInput = screen.getByLabelText(/price \(etb\)/i) as HTMLInputElement;
    expect(priceInput.value).toBe('10');
    await user.clear(priceInput);

    submitForm();

    expect(mockPost).not.toHaveBeenCalled();
    const inlineError = screen.getByText('Enter an amount greater than ETB 0.');
    expect(inlineError.closest('[role="alert"]')).toBeTruthy();
    expect(priceInput.getAttribute('aria-invalid')).toBe('true');
    // Never navigates into the builder with an unbuilt price.
    expect(screen.queryByText('course builder')).toBeNull();
  });

  test('a zero price is not a paid price', async () => {
    mount();
    typeTitle();

    fireEvent.change(screen.getByLabelText(/price \(etb\)/i), {
      target: {value: '0'},
    });

    submitForm();

    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByText('Enter an amount greater than ETB 0.')).toBeTruthy();
  });

  test('a valid price submits in cents and routes to the builder', async () => {
    mount();
    typeTitle();

    fireEvent.change(screen.getByLabelText(/price \(etb\)/i), {
      target: {value: '25.5'},
    });

    submitForm();

    await vi.waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/items',
        expect.objectContaining({
          title: 'Ethiopian coffee course',
          price_cents: 2550,
          type: 'course',
        }),
      ),
    );
    expect(screen.queryByText('Enter an amount greater than ETB 0.')).toBeNull();
    expect(await screen.findByText('course builder')).toBeTruthy();
  });

  test('free billing keeps submitting zero without a price error', async () => {
    mount('/dashboard/items/new/course?billing=free');
    typeTitle();
    expect(screen.queryByLabelText(/price \(etb\)/i)).toBeNull();

    submitForm();

    await vi.waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/items',
        expect.objectContaining({price_cents: 0}),
      ),
    );
    expect(screen.queryByText('Enter an amount greater than ETB 0.')).toBeNull();
  });
});

// Keep the single accessible heading without adding a second visible title.
describe('page shell: one h1, and a title that owns the header row', () => {
  test('renders exactly one h1 naming the page', () => {
    mount();

    const h1s = Array.from(document.querySelectorAll('h1'));
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe('Create course');
  });

  test('one breadcrumb displays All products › Create course with no extra Back button', () => {
    mount();

    const nav = document.querySelector('[data-slot="breadcrumb"]');
    expect(nav).not.toBeNull();
    // jsdom has no dimensions: overflow collapsing may hide the parent link.
    // Verify the current crumb here; its parent link is asserted in the
    // source-level contract and exercised by authenticated browser QA.
    expect(nav!.textContent).toContain('Create course');
    expect(nav!.className).toContain('sm:flex');
    expect(document.querySelector('[data-slot="breadcrumb-page"]')?.textContent).toBe('Create course');
    expect(document.querySelectorAll('[data-slot="breadcrumb-separator"]').length).toBeLessThanOrEqual(1);
    expect(screen.queryByRole('button', {name: 'Back to products'})).toBeNull();
    expect(document.querySelector('[data-slot="section-title"]')).toBeNull();
    // Mobile header title (same copy as the breadcrumb page crumb).
    expect(document.querySelector('h1')?.textContent).toBe('Create course');
  });

  test('progress bar keeps its screen-reader label', () => {
    mount();

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-label')).toBe('Course setup progress');
    expect(screen.getByText('Course setup')).not.toBeNull();
  });
});

describe('course setup omits customer preview', () => {
  test('has no Preview control or customer preview dialog', () => {
    mount('/dashboard/items/new/course?billing=free');
    expect(screen.queryByRole('button', {name: 'Preview'})).toBeNull();
    expect(screen.queryByRole('dialog', {name: 'Customer preview'})).toBeNull();
    expect(screen.queryByText('Your course title')).toBeNull();
  });
});

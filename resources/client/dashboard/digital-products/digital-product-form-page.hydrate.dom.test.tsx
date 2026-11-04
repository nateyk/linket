/**
 * @vitest-environment jsdom
 *
 * T2 — the edit page used to fetch the product on *every* creation-context
 * render (`actions` is rebuilt by the context memo whenever `state` changes),
 * so each hydration re-triggered a refetch, which re-hydrated the form and
 * wiped typed input within one round trip (browser-proven: 568 GETs / 8s).
 *
 * These tests pin the fix: the product is fetched exactly once per productId,
 * typed input survives context re-renders, and the approved→draft banner only
 * appears after a real edit — never as a load-time flash.
 */
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {Component} from './digital-product-form-page';

// jsdom has no layout: ProseMirror queries Range rects while its view mounts
// (same stub as creator-about-editor.dom.test.tsx).
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
});

const h = vi.hoisted(() => {
  type PendingRequest = {
    url: string;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  };

  const pending: PendingRequest[] = [];

  return {
    pending,
    itemUrls: [] as string[],
    get(url: string): Promise<unknown> {
      if (url.startsWith('/api/v1/items/')) {
        this.itemUrls.push(url);
        return new Promise((resolve, reject) => {
          pending.push({url, resolve, reject});
        });
      }
      if (url.startsWith('/api/v1/biolinks')) {
        return Promise.resolve({data: {data: []}});
      }
      return Promise.resolve({data: {data: []}});
    },
    get itemGetCount() {
      return this.itemUrls.length;
    },
    reset() {
      this.itemUrls.length = 0;
      pending.length = 0;
    },
    /** Complete every in-flight product request with the server payload. */
    resolvePendingItems(product: unknown) {
      const inFlight = pending.splice(0, pending.length);
      inFlight.forEach(request => {
        if (request.url.startsWith('/api/v1/items/')) {
          request.resolve({data: {data: product}});
        } else {
          request.resolve({data: {data: []}});
        }
      });
      return inFlight.length;
    },
    /** Resolve ONLY the pending request for this item URL (out-of-order
     *  responses: the stale-response guard test). */
    resolveItem(url: string, product: unknown) {
      const idx = pending.findIndex(request => request.url === url);
      if (idx === -1) return false;
      const [request] = pending.splice(idx, 1);
      request.resolve({data: {data: product}});
      return true;
    },
  };
});

vi.mock('@common/http/query-client', async () => {
  const {QueryClient} = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({defaultOptions: {queries: {retry: false}}}),
    apiClient: {
      get: (url: string) => h.get(url),
      post: () => Promise.resolve({data: {data: {}}}),
      put: () => Promise.resolve({data: {data: {}}}),
      delete: () => Promise.resolve({data: {data: {}}}),
      request: () => Promise.resolve({data: {data: {}}}),
    },
  };
});

const serverProduct = {
  id: 1,
  title: 'Ethiopian Coffee Ritual Field Guide',
  description: 'Server description',
  price_cents: 1500,
  currency: 'etb',
  status: 'approved',
  type: 'digital',
  cover: null,
  cover_file_entry_id: null,
  files: [{id: 5, name: 'guide.pdf', file_size: 2048, extension: 'pdf'}],
  biolink_ids: [],
};

beforeEach(() => {
  h.reset();
});

function mount() {
  const router = createMemoryRouter(
    [{path: '/dashboard/items/:productId/edit', element: <Component />}],
    {initialEntries: ['/dashboard/items/1/edit']},
  );
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>
    </QueryClientProvider>,
  );
  return router;
}

async function flushTasks(iterations = 4) {
  await act(async () => {
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
}

/** Resolve the pending product request and wait for the hydrated form. */
async function loadProduct() {
  await waitFor(() => expect(h.itemGetCount).toBe(1));
  await act(async () => {
    h.resolvePendingItems(serverProduct);
  });
  const input = (await screen.findByRole('textbox', {
    name: /product title/i,
  })) as HTMLInputElement;
  expect(input.value).toBe(serverProduct.title);
  return input;
}

test('fetches the product exactly once and typed input survives context re-renders', async () => {
  const user = userEvent.setup();
  mount();

  const input = await loadProduct();

  // Every keystroke re-renders the creation context (new `state` → new
  // `actions` object). Before the fix each of those re-renders refetched the
  // product and re-hydrated the form, so the draft below was wiped.
  await user.clear(input);
  await user.type(input, 'MY DRAFT TITLE');

  // Let any (buggy) follow-up request complete, so a revert would be visible.
  await flushTasks();
  await act(async () => {
    h.resolvePendingItems(serverProduct);
  });
  await flushTasks();

  expect(h.itemGetCount).toBe(1);
  expect(input.value).toBe('MY DRAFT TITLE');
});

test('approved-update review banner never flashes on load and stays after a real edit', async () => {
  const user = userEvent.setup();
  mount();

  const input = await loadProduct();

  // Loading never sets `dirty`, so the moderation banner must not flash while
  // the page hydrates (it used to appear and vanish with every refetch).
  expect(
    screen.queryByText(/Changes to approved products may require review\. The published version remains available during review\./i),
  ).toBeNull();

  await user.type(input, '!');

  // Complete any stale refetch: it must neither revert the input nor clear
  // the dirty flag that the banner is conditioned on.
  await flushTasks();
  await act(async () => {
    h.resolvePendingItems(serverProduct);
  });
  await flushTasks();

  expect(input.value).toBe(`${serverProduct.title}!`);
  expect(
    screen.getByText(/Changes to approved products may require review\. The published version remains available during review\./i),
  ).toBeTruthy();
});

test('refetches when the productId changes', async () => {
  const router = mount();
  await loadProduct();

  await act(async () => {
    await router.navigate('/dashboard/items/2/edit');
  });

  await waitFor(() =>
    expect(h.itemUrls).toContain('/api/v1/items/2'),
  );
  expect(screen.queryByRole('textbox', {name: /product title/i})).toBeNull();
  expect((screen.getByRole('button', {name: /save draft/i}) as HTMLButtonElement).disabled).toBe(true);
});

test('disables editing and saving when an existing product cannot be loaded', async () => {
  mount();
  await waitFor(() => expect(h.itemGetCount).toBe(1));
  await act(async () => {
    h.pending.splice(0).forEach(request => request.reject(new Error('Load failed')));
  });

  expect(await screen.findByText('Load failed')).toBeTruthy();
  expect((screen.getByRole('button', {name: /save draft/i}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', {name: /submit for review/i}) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('textbox', {name: /product title/i})).toBeNull();
});

test('a stale response for a previous product never hydrates the current one', async () => {
  // P2 (T2 review): switching products while a request is still in flight —
  // product 1 resolves LAST and must be dropped, or it silently overwrites
  // the form (and the product record Save PUTs against).
  const router = mount();

  await waitFor(() => expect(h.itemGetCount).toBe(1));
  await act(async () => {
    await router.navigate('/dashboard/items/2/edit');
  });
  await waitFor(() => expect(h.itemGetCount).toBe(2));

  const second = {...serverProduct, id: 2, title: 'Second Product Title'};
  await act(async () => {
    expect(h.resolveItem('/api/v1/items/2', second)).toBe(true);
  });
  const input = (await screen.findByRole('textbox', {
    name: /product title/i,
  })) as HTMLInputElement;
  expect(input.value).toBe('Second Product Title');

  // Stale response arrives after the current one was applied.
  await act(async () => {
    expect(h.resolveItem('/api/v1/items/1', serverProduct)).toBe(true);
  });
  await flushTasks();

  expect(input.value).toBe('Second Product Title');
  expect(h.itemUrls).toEqual([
    '/api/v1/items/1',
    '/api/v1/items/2',
  ]);
});

test('ships exactly one h1, the page title', async () => {
  // Final-fix item 2: the header used to render SectionTitle as a plain
  // div, so the edit page shipped ZERO headings. It now renders the page
  // title as the one h1 (T7's `render={<h1 />}` mechanism).
  mount();
  await loadProduct();

  const h1s = Array.from(document.querySelectorAll('h1'));
  expect(h1s).toHaveLength(1);
  expect(h1s[0].textContent).toBe('Edit digital product');
  // The status badge lives inside SectionTitle, so the heading's accessible
  // name carries the title first ("Edit digital productApproved").
  expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
  expect(
    screen.getAllByRole('heading', {level: 1, name: /^Edit digital product/}),
  ).toHaveLength(1);
});

test('header action buttons carry an accessible name without their visible label', async () => {
  // crit3-A: below 640px the button text is `max-sm:hidden`, leaving
  // icon-only buttons — each still needs its own accessible name.
  mount();
  await loadProduct();

  const del = screen.getByRole('button', {name: 'Delete'});
  expect(del.getAttribute('aria-label')).toBe('Delete');
  const save = screen.getByRole('button', {name: 'Save draft'});
  expect(save.getAttribute('aria-label')).toBe('Save draft');
  const submit = screen.getByRole('button', {name: 'Submit for review'});
  expect(submit.getAttribute('aria-label')).toBe('Submit for review');
});

test('description editor is bordered as a field, not as a nested card', async () => {
  // crit3-B confirmed-real nested-cards hit: the TipTap wrapper shipped
  // `rounded-card-sm border border-border` (card tokens) inside the
  // section card. It is the Description field's control, so it wears the
  // same field tokens as the title/price inputs next to it.
  mount();
  await loadProduct();

  const editor = document.querySelector('.overflow-hidden.rounded-input');
  expect(editor).not.toBeNull();
  const className = editor!.getAttribute('class') ?? '';
  expect(className).toContain('border-input');
  expect(className).not.toContain('border-border');
  expect(className).not.toContain('rounded-card-sm');
});

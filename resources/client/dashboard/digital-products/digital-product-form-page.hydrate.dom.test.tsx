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
import {AxiosError} from 'axios';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
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
    mutationCalls: 0,
    submitCalls: 0,
    putCalls: 0,
    submitError: null as Error | null,
    updatedProduct: null as unknown,
    storefrontGetCount: 0,
    storefrontFail: false,
    storefrontRecords: [] as {id: number; name: string; short_url?: string}[],
    get(url: string): Promise<unknown> {
      if (url.startsWith('/api/v1/items/')) {
        this.itemUrls.push(url);
        return new Promise((resolve, reject) => {
          pending.push({url, resolve, reject});
        });
      }
      if (url.startsWith('/api/v1/biolinks')) {
        this.storefrontGetCount++;
        return this.storefrontFail
          ? Promise.reject(new Error('Synthetic Storefront list outage'))
          : Promise.resolve({data: {data: this.storefrontRecords}});
      }
      return Promise.resolve({data: {data: []}});
    },
    get itemGetCount() {
      return this.itemUrls.length;
    },
    reset() {
      this.itemUrls.length = 0;
      pending.length = 0;
      this.mutationCalls = 0;
      this.submitCalls = 0;
      this.putCalls = 0;
      this.submitError = null;
      this.updatedProduct = null;
      this.storefrontGetCount = 0;
      this.storefrontFail = false;
      this.storefrontRecords = [];
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
      post: (url: string) => {
        h.mutationCalls++;
        if (url.endsWith('/submit')) {
          h.submitCalls++;
          if (h.submitError) return Promise.reject(h.submitError);
        }
        return Promise.resolve({data: {data: h.updatedProduct ?? {}}});
      },
      put: () => {
        h.mutationCalls++;
        h.putCalls++;
        return Promise.resolve({data: {data: h.updatedProduct ?? {}}});
      },
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
  biolink_ids: [] as number[],
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
async function loadProduct(product = serverProduct) {
  await waitFor(() => expect(h.itemGetCount).toBe(1));
  await act(async () => {
    h.resolvePendingItems(product);
  });
  const input = (await screen.findByRole('textbox', {
    name: /product title/i,
  })) as HTMLInputElement;
  expect(input.value).toBe(product.title);
  return input;
}

test('failed submission after a confirmed draft save keeps the save and field errors visible', async () => {
  const user = userEvent.setup();
  h.updatedProduct = {...serverProduct, status: 'draft', title: 'Edited guide'};
  h.submitError = new AxiosError(
    'Synthetic rejected submit',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 422,
      data: {errors: {title: ['Please correct the title before review.']}},
      statusText: 'Unprocessable Content',
      headers: {},
      config: {} as never,
    },
  );
  mount();
  const titleInput = await loadProduct({...serverProduct, status: 'draft'});
  fireEvent.change(titleInput, {target: {value: 'Edited guide'}});
  await user.click(screen.getByRole('button', {name: 'Submit for review'}));

  expect(await screen.findByText('Draft saved, but submission failed. Fix the issue and try again.')).toBeTruthy();
  expect(await screen.findByText('Draft saved')).toBeTruthy();
  expect(screen.queryByText('Unsaved changes')).toBeNull();
  expect(await screen.findByText('Please correct the title before review.')).toBeTruthy();
  expect(h.putCalls).toBe(1);
  expect(h.submitCalls).toBe(1);
  expect(screen.getByRole('textbox', {name: /product title/i}).getAttribute('aria-invalid')).toBe('true');
});

test('a 503 after a draft save is uncertain, not a confirmed failed submission', async () => {
  const user = userEvent.setup();
  h.updatedProduct = {...serverProduct, status: 'draft'};
  h.submitError = new AxiosError(
    'Synthetic unavailable',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      status: 503,
      data: {message: 'Synthetic unavailable'},
      statusText: 'Service Unavailable',
      headers: {},
      config: {} as never,
    },
  );
  mount();
  await loadProduct({...serverProduct, status: 'draft'});
  await user.click(screen.getByRole('button', {name: 'Submit for review'}));

  expect(await screen.findByText('Draft saved, but we could not confirm submission. Check My Items before submitting again.')).toBeTruthy();
  await waitFor(() => expect((screen.getByRole('button', {name: 'Submit for review'}) as HTMLButtonElement).disabled).toBe(true));
  expect(h.putCalls).toBe(1);
  expect(h.submitCalls).toBe(1);
});

test('unknown submit result blocks another mutation and offers accessible reconciliation', async () => {
  const user = userEvent.setup();
  h.updatedProduct = {...serverProduct, status: 'draft'};
  h.submitError = new AxiosError('Synthetic network failure', 'ERR_NETWORK');
  mount();
  await loadProduct({...serverProduct, status: 'draft'});
  await user.click(screen.getByRole('button', {name: 'Submit for review'}));

  expect(await screen.findByText('Draft saved, but we could not confirm submission. Check My Items before submitting again.')).toBeTruthy();
  await waitFor(() => {
    expect((screen.getByRole('button', {name: 'Submit for review'}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', {name: 'Save draft'}) as HTMLButtonElement).disabled).toBe(true);
  });
  expect(screen.getByRole('link', {name: 'Check My Items'})).toBeTruthy();
  expect(h.putCalls).toBe(1);
  expect(h.submitCalls).toBe(1);
});

test('Storefront outage remains recoverable and does not discard existing placement', async () => {
  const user = userEvent.setup();
  h.storefrontFail = true;
  mount();
  await loadProduct({...serverProduct, biolink_ids: [42]});

  expect(await screen.findByText(/Unable to load Storefronts\. Your product can still be saved or submitted\./)).toBeTruthy();
  expect(screen.queryByText(/Create a Storefront later if you want to display it there/)).toBeNull();
  expect((screen.getByRole('button', {name: 'Save draft'}) as HTMLButtonElement).disabled).toBe(false);
  expect(h.itemGetCount).toBe(1);
  expect(h.storefrontGetCount).toBe(1);

  h.storefrontFail = false;
  h.storefrontRecords = [{id: 42, name: 'My Existing Storefront', short_url: 'my-store'}];
  await user.click(screen.getByRole('button', {name: 'Retry Storefront loading'}));
  expect(await screen.findByRole('button', {name: 'Choose Storefronts'})).toBeTruthy();
  expect(screen.queryByText(/Unable to load Storefronts/)).toBeNull();
  expect(screen.queryByRole('checkbox', {name: /My Existing Storefront/})).toBeNull();
  await user.click(screen.getByRole('button', {name: 'Choose Storefronts'}));
  expect(await screen.findByRole('menuitemcheckbox', {name: /My Existing Storefront/})).toHaveAttribute('aria-checked', 'true');
  expect(h.itemGetCount).toBe(1); // A retry must not rehydrate the product or lose edits.
  expect(h.storefrontGetCount).toBe(2);
});

test('Storefront dropdown preserves multi-selection and uses no inline checkboxes', async () => {
  const user = userEvent.setup();
  h.storefrontRecords = [
    {id: 42, name: 'Main Store', short_url: 'main-store'},
    {id: 43, name: 'Books Store', short_url: 'books-store'},
  ];
  mount();
  await loadProduct({...serverProduct, status: 'draft', biolink_ids: [42]});

  const trigger = await screen.findByRole('button', {name: 'Choose Storefronts'});
  expect(trigger.textContent).toContain('1 selected');
  expect(screen.queryByRole('checkbox', {name: /Main Store/})).toBeNull();
  await user.click(trigger);
  expect(screen.getByRole('menuitemcheckbox', {name: /Main Store/}).getAttribute('aria-checked')).toBe('true');
  await user.click(screen.getByRole('menuitemcheckbox', {name: /Books Store/}));
  expect(await screen.findByText('2 selected')).toBeTruthy();

  // The dropdown does not replace the existing array-based placement model.
  await user.click(trigger);
  expect(screen.getByRole('menuitemcheckbox', {name: /Main Store/}).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('menuitemcheckbox', {name: /Books Store/}).getAttribute('aria-checked')).toBe('true');
});

test('a successful empty Storefront lookup is not misrepresented as an outage', async () => {
  mount();
  await loadProduct();
  expect(await screen.findByText(/Create a Storefront later if you want to display it there/)).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Retry Storefront loading'})).toBeNull();
  expect(h.storefrontGetCount).toBe(1);
});

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

test('failed existing-product load can be retried without creating or saving a product', async () => {
  const user = userEvent.setup();
  mount();
  await waitFor(() => expect(h.itemGetCount).toBe(1));
  await act(async () => {
    h.pending.splice(0).forEach(request => request.reject(new Error('Synthetic product load outage')));
  });
  expect(await screen.findByText('Synthetic product load outage')).toBeTruthy();
  expect(screen.queryByRole('textbox', {name: /product title/i})).toBeNull();
  expect((screen.getByRole('button', {name: 'Save draft'}) as HTMLButtonElement).disabled).toBe(true);

  await user.click(screen.getByRole('button', {name: 'Retry loading product'}));
  await waitFor(() => expect(h.itemGetCount).toBe(2));
  await act(async () => { h.resolvePendingItems(serverProduct); });
  const title = await screen.findByRole('textbox', {name: /product title/i}) as HTMLInputElement;
  expect(title.value).toBe(serverProduct.title);
  expect(screen.queryByText('Synthetic product load outage')).toBeNull();
  expect(h.mutationCalls).toBe(0);
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

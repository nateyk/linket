/**
 * @vitest-environment jsdom
 *
 * T2 — the edit page's auto-save had never fired. `autoSaveRef` keeps only the
 * FIRST debounced function it was constructed with, and that closure captured
 * the first render's `state`/`dirty`, where `dirty` is always false — so the
 * `if (!dirty) return` guard bailed out on every schedule. A forced call would
 * have sent the first-render snapshot, the pending debounce was never
 * cancelled on unmount, and the trigger was not gated on status: for an
 * approved product auto-save would have performed the approved→draft revert
 * the banner promises only as an explicit Save action.
 *
 * Contract pinned here (the plan's "Produces"): after 1500ms idle with
 * `dirty` and a draft product, exactly ONE PUT with the CURRENT state; no PUT
 * while the product has not loaded; no PUT after unmount (the pending
 * debounce is cancelled); no PUT for approved products.
 */
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {useEffect, useState} from 'react';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {afterAll, afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {Component} from './digital-product-form-page';
import {
  ProductCreationProvider,
  useProductCreation,
} from './product-creation-context';
import type {ProductFormState} from './product-creation-context';

// jsdom has no layout: ProseMirror queries Range rects while the page's
// description editor mounts (same stub as digital-product-form-page.hydrate
// .dom.test.tsx).
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
  const put = vi.fn();
  const item = {current: null as Record<string, unknown> | null};
  return {
    put,
    item,
    get(url: string): Promise<unknown> {
      if (url.startsWith('/api/v1/items/')) {
        // Hang while the test has not "loaded" a product, exactly like an
        // in-flight GET (the page-level gate is closed during that window).
        if (!item.current) return new Promise(() => {});
        return Promise.resolve({data: {data: item.current}});
      }
      return Promise.resolve({data: {data: []}});
    },
    reset() {
      item.current = null;
      put.mockReset();
      put.mockImplementation(async () => ({data: {data: {}}}));
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
      put: h.put,
      delete: () => Promise.resolve({data: {data: {}}}),
      request: () => Promise.resolve({data: {data: {}}}),
    },
  };
});

beforeEach(() => {
  h.reset();
});

// A fully parallel `vitest run` starves this suite (the same load also times
// out the neighbouring hydrate.dom suite), so give every test more than the
// default 5s before a slow machine is mistaken for a hang.
vi.setConfig({testTimeout: 15_000});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Advance the fake clock past the 1500ms debounce window and flush the
 * async auto-save body (dynamic `import()` of the api client, then the PUT
 * itself, then `setDirty(false)`) inside `act`, so every state update it
 * triggers is awaited rather than leaking an act warning.
 */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    for (let i = 0; i < 50; i++) {
      await Promise.resolve();
    }
  });
}

/* ── Provider-level harness (tests 1–2) ── */

type Creation = ReturnType<typeof useProductCreation>;

let probe: {actions: Creation['actions']; setStatus: (s: string | null) => void} | null =
  null;

function Probe() {
  const {actions, dirty} = useProductCreation();
  // Stand-in for the edit page's `product` record: null until the product has
  // loaded — exactly what digital-product-form-page.tsx holds while its GET
  // is in flight — then the loaded status.
  const [status, setStatus] = useState<string | null>(null);
  // Mirror of the edit page's trigger effect (the real one lives in
  // digital-product-form-page.tsx and is pinned by the page-level test
  // below): draft status only, nothing scheduled during load.
  useEffect(() => {
    if (dirty && status === 'draft') actions.autoSave();
  }, [dirty, actions, status]);
  // Test probe: every render commits inside act(), so the test always reads
  // the latest context (all actions are stable callbacks; `actions` is not).
  probe = {actions, setStatus};
  return null;
}

function mountProvider() {
  return render(
    <ProductCreationProvider prefill={null} productId={1}>
      <Probe />
    </ProductCreationProvider>,
  );
}

const DRAFT_FORM: ProductFormState = {
  title: 'Old',
  description: 'Server description',
  price: '10.00',
  coverUrl: '',
  coverFileId: null,
  files: [{id: 7, name: 'guide.pdf'}],
  biolinkIds: [3],
  productType: 'digital',
};

test('debounced auto-save sends CURRENT state, not first-render state', async () => {
  vi.useFakeTimers();
  mountProvider();

  // The edit page hydrates the form once the product GET resolves (draft),
  // then the creator edits — only now does `dirty` flip and the trigger fire.
  act(() => {
    probe!.setStatus('draft');
    probe!.actions.hydrate({...DRAFT_FORM});
  });
  act(() => {
    probe!.actions.setTitle('New');
  });

  // Still idle: nothing goes out before the 1500ms window elapses.
  expect(h.put).not.toHaveBeenCalled();

  await advance(1600);

  // Exactly one PUT carrying the CURRENT state — not the first-render
  // snapshot (empty title, dirty=false) the debounced body used to close
  // over. `file_ids`/`biolink_ids` always travel as arrays: the draft
  // endpoint's mutation service 500s when they are missing on a non-course
  // product.
  expect(h.put).toHaveBeenCalledTimes(1);
  expect(h.put).toHaveBeenCalledWith(
    '/api/v1/items/1/draft',
    expect.objectContaining({
      title: 'New',
      description: 'Server description',
      price_cents: 1000,
      currency: 'etb',
      cover_file_entry_id: null,
      file_ids: [7],
      biolink_ids: [3],
      type: 'digital',
    }),
  );

  // One PUT per idle window — no duplicate once the payload has landed.
  await advance(2000);
  expect(h.put).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});

test('no auto-save fires before hydrate (dirty=false) and none after unmount', async () => {
  vi.useFakeTimers();
  const {unmount} = mountProvider();

  // Before the product has loaded the page holds `product = null`, so its
  // `product?.status === 'draft'` gate is closed: an edit made during load
  // must never schedule a PUT (the probe drives the context actions directly
  // because the real form is still a skeleton at that point).
  act(() => {
    probe!.actions.setTitle('X');
  });
  await advance(1600);
  expect(h.put).not.toHaveBeenCalled();

  // Product loads as a draft → hydrate → edit: the debounce is now pending…
  act(() => {
    probe!.setStatus('draft');
    probe!.actions.hydrate({...DRAFT_FORM});
  });
  act(() => {
    probe!.actions.setTitle('Edited');
  });

  // …and the provider unmounts before the window elapses. The pending PUT
  // must be cancelled, not fired against an unmounted tree.
  unmount();
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(0);

  vi.useRealTimers();
});

/* ── Page-level trigger effect (test 3) ── */

const SERVER_PRODUCT = (status: string): Record<string, unknown> => ({
  id: 1,
  title: 'Server title',
  description: 'Server description',
  price_cents: 1500,
  currency: 'etb',
  status,
  type: 'digital',
  cover: null,
  cover_file_entry_id: null,
  files: [{id: 5, name: 'guide.pdf', file_size: 2048, extension: 'pdf'}],
  biolink_ids: [],
});

async function mountPage(status: 'draft' | 'approved') {
  h.item.current = SERVER_PRODUCT(status);
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
  const input = (await screen.findByRole(
    'textbox',
    {name: /product title/i},
    // Under a fully parallel run this file mounts two TipTap editors; give
    // the load wait room so a slow machine fails on the assertion instead of
    // the query timeout.
    {timeout: 10_000},
  )) as HTMLInputElement;
  expect(input.value).toBe('Server title');
  return input;
}

test(
  'auto-save does not fire for approved products (explicit-Save-only revert)',
  {
    // Two full page mounts (TipTap included): the default 5s test timeout is
    // too tight under a fully parallel `vitest run`.
    timeout: 30_000,
  },
  async () => {
    // Approved: editing may not auto-save — the approved→draft revert is
    // promised to the user as an explicit Save action (the warning banner),
    // so auto-save must not perform it behind their back.
    let input = await mountPage('approved');
    vi.useFakeTimers();
    fireEvent.change(input, {target: {value: 'Approved edit'}});
    await advance(1600);
    expect(h.put).not.toHaveBeenCalled();
    vi.useRealTimers();
    cleanup();

    // Draft: the very same edit auto-saves exactly once, with the edited title.
    input = await mountPage('draft');
    vi.useFakeTimers();
    fireEvent.change(input, {target: {value: 'Draft edit'}});
    await advance(1600);
    expect(h.put).toHaveBeenCalledTimes(1);
    expect(h.put).toHaveBeenCalledWith(
      '/api/v1/items/1/draft',
      expect.objectContaining({
        title: 'Draft edit',
        file_ids: [5],
        biolink_ids: [],
      }),
    );
    await advance(2000);
    expect(h.put).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  },
);

afterAll(() => {
  probe = null;
});

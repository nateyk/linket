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
 *
 * Tests 2 and 3 render the real `DigitalProductForm`, so the shipped
 * `product?.status === 'draft'` gate (digital-product-form-page.tsx) is the
 * condition they exercise — including the `product === null` branch (not yet
 * loaded) that only the page can reach. Test 1 drives the context directly
 * and pins only the debounce/current-state contract.
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
import {useEffect} from 'react';
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
  const pending: {
    url: string;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }[] = [];
  return {
    put,
    item,
    pending,
    get(url: string): Promise<unknown> {
      if (url.startsWith('/api/v1/items/')) {
        // No product set → the GET is left hanging (an in-flight request);
        // the test decides later whether it resolves or settles as a failure.
        if (!item.current) {
          return new Promise((resolve, reject) => {
            pending.push({url, resolve, reject});
          });
        }
        return Promise.resolve({data: {data: item.current}});
      }
      return Promise.resolve({data: {data: []}});
    },
    /** Settle every in-flight product GET with the given payload. */
    resolvePendingItems(product: unknown) {
      pending.splice(0, pending.length).forEach(request => {
        request.resolve({data: {data: product}});
      });
    },
    /** Settle every in-flight product GET as a failure (shipped error path). */
    rejectPending(error: unknown) {
      pending.splice(0, pending.length).forEach(request => {
        request.reject(error);
      });
    },
    reset() {
      pending.length = 0;
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

/* ── Context-level harness (test 1: the debounce contract only) ── */

type Creation = ReturnType<typeof useProductCreation>;

let ctxActions: Creation['actions'] | null = null;
let latestAutoSaveState: Creation['autoSaveState'] | null = null;

/**
 * Test 1 only needs the debounce to be TRIGGERED when the form becomes dirty.
 * The draft-status gate itself lives in digital-product-form-page.tsx and is
 * pinned against shipped code by tests 2 and 3, which render the real page —
 * this harness deliberately does NOT re-implement that condition.
 */
function Trigger() {
  const {actions, dirty, autoSaveState} = useProductCreation();
  useEffect(() => {
    if (dirty) actions.autoSave();
  }, [dirty, actions.autoSave]);
  // Every render commits inside act(), so the test always reads the latest
  // context (all actions are stable callbacks; the `actions` object is not).
  ctxActions = actions;
  latestAutoSaveState = autoSaveState;
  return null;
}

function mountProvider() {
  return render(
    <ProductCreationProvider prefill={null} productId={1}>
      <Trigger />
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
  samples: [],
};

test('debounced auto-save sends CURRENT state, not first-render state', async () => {
  vi.useFakeTimers();
  mountProvider();

  // The edit page hydrates the form once the product GET resolves, then the
  // creator edits — only now does `dirty` flip and the trigger fire.
  act(() => {
    ctxActions!.hydrate({...DRAFT_FORM});
  });
  act(() => {
    ctxActions!.setTitle('New');
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

test('autosave status reflects confirmed success, failed write, and recovery', async () => {
  vi.useFakeTimers();
  mountProvider();
  act(() => ctxActions!.hydrate({...DRAFT_FORM}));
  expect(latestAutoSaveState).toBe('saved');
  h.put.mockRejectedValueOnce(new Error('Synthetic network failure'));

  act(() => ctxActions!.setTitle('First unsaved edit'));
  expect(latestAutoSaveState).toBe('idle');
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(1);
  expect(latestAutoSaveState).toBe('failed');

  act(() => ctxActions!.setTitle('Recovered draft'));
  expect(latestAutoSaveState).toBe('idle');
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(2);
  expect(latestAutoSaveState).toBe('saved');
});

test('saves edits made while an earlier autosave is in flight without overlapping writes', async () => {
  vi.useFakeTimers();
  let resolveFirst!: (value: unknown) => void;
  h.put.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
  mountProvider();
  act(() => ctxActions!.hydrate({...DRAFT_FORM}));
  act(() => ctxActions!.setTitle('First edit'));
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(1);

  act(() => ctxActions!.setTitle('Latest edit'));
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(1);

  await act(async () => resolveFirst({data: {data: {}}}));
  await advance(1600);
  expect(h.put).toHaveBeenCalledTimes(2);
  expect(h.put).toHaveBeenLastCalledWith('/api/v1/items/1/draft', expect.objectContaining({title: 'Latest edit'}));
});

test(
  'no auto-save while product.status is not draft (null during load), and none after unmount',
  {
    // Two full page mounts (TipTap included): the default 5s test timeout is
    // too tight under a fully parallel `vitest run`.
    timeout: 30_000,
  },
  async () => {
    // ── Part A: the shipped `product === null` branch of the gate ──
    // No product is preset, so the page's item GET is left hanging. While it
    // is in flight the page renders skeletons (there is not even an input to
    // edit). It then settles WITHOUT hydrating — the shipped load-failure
    // path (`setError` + `setLoading(false)`, `setProduct` never called), so
    // `product` stays null and the form must remain unavailable.
    renderEditPage();
    expect(h.pending).toHaveLength(1);
    expect(
      screen.queryByRole('textbox', {name: /product title/i}),
    ).toBeNull(); // still loading

    vi.useFakeTimers();
    await advance(1600);
    expect(h.put).not.toHaveBeenCalled();
    vi.useRealTimers();

    await act(async () => {
      h.rejectPending(new Error('Network error'));
    });
    expect(await screen.findByText(/Network error/)).toBeTruthy();
    expect(screen.queryByRole('textbox', {name: /product title/i})).toBeNull();

    vi.useFakeTimers();
    await advance(1600);
    expect(h.put).not.toHaveBeenCalled();
    vi.useRealTimers();
    cleanup();

    // ── Part B: a pending auto-save is cancelled on unmount ──
    // The product now loads as a draft, so the shipped gate opens; the edit
    // schedules the debounce, then the page unmounts before the window
    // elapses — the pending PUT must be cancelled, not fired.
    h.item.current = SERVER_PRODUCT('draft');
    renderEditPage();
    const loaded = (await screen.findByRole(
      'textbox',
      {name: /product title/i},
      {timeout: 10_000},
    )) as HTMLInputElement;
    expect(loaded.value).toBe('Server title'); // hydrated → product is set

    vi.useFakeTimers();
    fireEvent.change(loaded, {target: {value: 'Pending edit'}});
    expect(h.put).not.toHaveBeenCalled(); // still inside the idle window
    cleanup(); // unmount with the debounce pending
    await advance(1600);
    expect(h.put).toHaveBeenCalledTimes(0);

    vi.useRealTimers();
  },
);

/* ── Page-level helpers (tests 2–3 render the shipped DigitalProductForm) ── */

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

/** Mount the real edit page. The item GET is pending iff `h.item.current`
 *  is null, resolved with that payload otherwise. */
function renderEditPage() {
  const router = createMemoryRouter(
    [{path: '/dashboard/items/:productId/edit', element: <Component />}],
    {initialEntries: ['/dashboard/items/1/edit']},
  );
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>
    </QueryClientProvider>,
  );
}

/** Load a product with the given status and wait for the hydrated form. */
async function mountPage(status: 'draft' | 'approved') {
  h.item.current = SERVER_PRODUCT(status);
  renderEditPage();
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
  ctxActions = null;
});

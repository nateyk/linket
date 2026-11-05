/**
 * @vitest-environment jsdom
 *
 * The service form is one page serving two routes — `/dashboard/services/new`
 * and `/dashboard/services/:serviceId/edit` — so the create/edit split lives in
 * `useParams`, not in the component tree. These tests mount the real route
 * paths through a memory router and drive the page the way a creator does:
 * read the shell (breadcrumb, progress, five sections and on-demand preview),
 * type a title, and save with the keyboard shortcut.
 *
 * Everything the page fetches goes through the mocked `apiClient`, so the tests
 * assert real wiring: which URL the save hits (PUT vs POST) and that the
 * preview tracks the same state the form writes.
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component} from './service-form-page';
import type {CreatorServiceResource} from './service-form-state';

// jsdom has no layout: the TipTap description editor in the Basics section
// queries Range rects while its view mounts (same stub as
// digital-product-form-page.hydrate.dom.test.tsx).
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

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({
  apiClient: {
    get: api.get,
    post: api.post,
    put: api.put,
    delete: api.remove,
  },
}));

const stores = [{id: 7, name: 'My Store'}];

const serverService: CreatorServiceResource = {
  id: 3,
  title: 'Brand identity sprint',
  slug: 'brand-identity-sprint',
  status: 'draft',
  category: 'Design',
  skills: ['Branding', 'Illustration'],
  short_description: 'A custom logo and identity built for your brand.',
  description: '<p>The full story of the service.</p>',
  video_url: null,
  live_demo_url: null,
  contact_channels: [
    {type: 'whatsapp', label: 'Chat on WhatsApp', value: '+251911234567'},
  ],
  cover: null,
  gallery: [],
  packages: [
    {
      id: 11,
      name: 'Starter',
      description: '',
      price_cents: 150000,
      currency: 'ETB',
      delivery_days: 7,
      revisions: 2,
      features: [],
      position: 1,
    },
  ],
  faqs: [],
  store: {id: 7, name: 'My Store', short_url: 'mystore'},
  public_url: 'https://linket.test/mystore/services/brand-identity-sprint',
};

const SECTION_TITLES = [
  'Basics',
  'Media and links',
  'Packages',
  'FAQ',
  'Contact buttons',
];

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.put.mockReset();
  api.remove.mockReset();

  api.get.mockImplementation((url: string) => {
    if (url.startsWith('/api/v1/services/')) {
      return Promise.resolve({data: {data: serverService}});
    }
    return Promise.resolve({data: {data: stores}});
  });
  api.post.mockResolvedValue({data: {data: serverService}});
  api.put.mockResolvedValue({data: {data: serverService}});
  api.remove.mockResolvedValue({data: {data: {}}});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Mounts the real route shape so `useParams` supplies (or omits) serviceId. */
function mountPage(path: '/dashboard/services/new' | '/dashboard/services/3/edit') {
  const router = createMemoryRouter(
    [
      {path: '/dashboard/services/new', element: <Component />},
      {
        path: '/dashboard/services/:serviceId/edit',
        element: <Component />,
      },
      {path: '/dashboard/services', element: <div>Services index</div>},
      {path: '*', element: <div>Not found</div>},
    ],
    {initialEntries: [path]},
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
}

/** The loading skeleton is replaced once the stores + service GETs settle. */
async function waitForForm() {
  return screen.findByRole('button', {name: 'Basics'});
}

function titleInput(): HTMLInputElement {
  return screen.getByRole('textbox', {name: 'Title'}) as HTMLInputElement;
}

/** Cmd+S anywhere on the page saves the draft, exactly like the product editor. */
async function pressSaveShortcut() {
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

describe('the service form shell', () => {
  test('create mode offers the whole form under the "New service" heading', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();

    expect(screen.getByRole('link', {name: 'My Services'})).toBeTruthy();
    expect(
      screen.getByRole('heading', {level: 1, name: /New service/}),
    ).toBeTruthy();
    expect(
      screen.getByRole('progressbar', {name: 'Service setup progress'}),
    ).toBeTruthy();
    expect(screen.getByText('Service setup')).toBeTruthy();
    expect(screen.getByText('0 of 3 recommended sections complete')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Preview'})).toBeTruthy();
    // The product and service creators both keep buyer previews on-demand.
    expect(screen.queryByText('Customer preview')).toBeNull();
  });

  test('all five sections are reachable as accordion triggers', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();

    SECTION_TITLES.forEach(title => {
      const trigger = screen.getByRole('button', {name: title});
      // A real trigger: it reports and toggles the open state of its panel.
      expect(trigger.getAttribute('aria-expanded')).not.toBeNull();
    });
    // Basics is the section open on arrival, so the title field is already there.
    expect(
      screen
        .getByRole('button', {name: 'Basics'})
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });

  test('edit mode loads the service and hydrates the form from it', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/3/edit');
    await waitForForm();

    expect(api.get).toHaveBeenCalledWith('/api/v1/services/3');
    expect(api.get).toHaveBeenCalledWith('/api/v1/stores?per_page=100');
    expect(
      screen.getByRole('heading', {level: 1, name: /Edit service/}),
    ).toBeTruthy();
    await waitFor(() =>
      expect(titleInput().value).toBe('Brand identity sprint'),
    );
    // The preview reads hydrated state only when the creator requests it.
    expect(screen.queryByText('Starter')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    expect(screen.getByText('Brand identity sprint')).toBeTruthy();
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  test('the header carries both save actions, named for screen readers too', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();

    const saveDraft = screen.getByRole('button', {name: 'Save draft'});
    expect(saveDraft.getAttribute('aria-label')).toBe('Save draft');

    const publish = screen.getByRole('button', {name: 'Publish service'});
    expect(publish.getAttribute('aria-label')).toBe('Publish service');
  });

  test('delete is offered in edit mode, and never in create mode', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();
    // A service that does not exist yet has nothing to delete.
    expect(screen.queryByRole('button', {name: 'Delete'})).toBeNull();
  });

  test('edit mode offers delete alongside the two save actions', async () => {
    mountPage('/dashboard/services/3/edit');
    await waitForForm();

    const remove = screen.getByRole('button', {name: 'Delete'});
    expect(remove.getAttribute('aria-label')).toBe('Delete');
    expect(screen.getByRole('button', {name: 'Save draft'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Publish service'})).toBeTruthy();
  });
});

describe('the preview is on-demand and live', () => {
  test('typing updates the preview when opened, without saving or publishing', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();

    expect(screen.queryByText('Untitled service')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Untitled service')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    // Both the footer action and the dialog's accessible X are named Close.
    // Choose the visible footer action deliberately.
    await user.click(screen.getAllByRole('button', {name: 'Close'})[0]);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.type(titleInput(), 'Logo design');
    await user.click(screen.getByRole('button', {name: 'Preview'}));

    expect(screen.getByText('Logo design')).toBeTruthy();
    expect(screen.queryByText('Untitled service')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });
});

describe('load failure recovery', () => {
  test('a network failure shows retry rather than incorrectly demanding a new storefront', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce(new Error('Network unavailable'));
    mountPage('/dashboard/services/new');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Unable to load service')).toBeTruthy();
    expect(screen.getByText('Network unavailable')).toBeTruthy();
    expect(screen.queryByText('Create a storefront first')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Publish service'})).toBeNull();

    await user.click(screen.getByRole('button', {name: 'Try again'}));
    await waitForForm();
    expect(screen.getByRole('button', {name: 'Preview'})).toBeTruthy();
  });
});

describe('saving', () => {
  test('rapid keyboard shortcuts cannot create duplicate services while saving', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();

    let finishRequest: ((value: {data: {data: CreatorServiceResource}}) => void) | undefined;
    api.post.mockImplementation(() => new Promise(resolve => {
      finishRequest = resolve;
    }));

    await act(async () => {
      const event = () => new KeyboardEvent('keydown', {
        key: 's', metaKey: true, bubbles: true, cancelable: true,
      });
      window.dispatchEvent(event());
      window.dispatchEvent(event());
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishRequest?.({data: {data: serverService}});
    });
  });

  test('unknown create response blocks a second POST and preserves the unsaved form', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.type(titleInput(), 'Network uncertainty service');
    api.post.mockRejectedValueOnce(new Error('Connection ended after submission'));

    await user.click(screen.getByRole('button', {name: 'Save draft'}));
    expect(await screen.findByText(/We could not confirm whether the service was created/)).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Check My Services'}).getAttribute('href'))
      .toBe('/dashboard/services');
    expect(titleInput().value).toBe('Network uncertainty service');
    expect(screen.getByRole('button', {name: 'Save draft'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', {name: 'Publish service'}).hasAttribute('disabled')).toBe(true);

    await pressSaveShortcut();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.put).not.toHaveBeenCalled();
  });

  test('a successful create response missing its ID is not retried blindly', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    api.post.mockResolvedValueOnce({data: {data: {status: 'draft'}}});

    await user.click(screen.getByRole('button', {name: 'Save draft'}));
    expect(await screen.findByText(/We could not confirm whether the service was created/)).toBeTruthy();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Save draft'}).hasAttribute('disabled')).toBe(true);
  });

  test('Cmd+S PUTs the loaded service in edit mode', async () => {
    mountPage('/dashboard/services/3/edit');
    await waitForForm();

    await pressSaveShortcut();

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(api.put.mock.calls[0][0]).toBe('/api/v1/services/3');
    // Editing never creates a second service.
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put.mock.calls[0][1]).toMatchObject({
      title: 'Brand identity sprint',
      status: 'draft',
      store_id: 7,
    });
  });

  test('Cmd+S POSTs a new service in create mode', async () => {
    mountPage('/dashboard/services/new');
    await waitForForm();

    await pressSaveShortcut();

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][0]).toBe('/api/v1/services');
    expect(api.post.mock.calls[0][1]).toMatchObject({status: 'draft'});
    // There is no id to update yet.
    expect(api.put).not.toHaveBeenCalled();
  });

  test('publishing without a title is blocked and the error lands on the field', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();

    await user.click(screen.getByRole('button', {name: 'Publish service'}));

    expect(screen.getByText('A title is required.')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });
});

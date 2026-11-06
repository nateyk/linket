/**
 * @vitest-environment jsdom
 *
 * The service form is one page serving two routes — `/dashboard/services/new`
 * and `/dashboard/services/:serviceId/edit` — so the create/edit split lives in
 * `useParams`, not in the component tree. These tests mount the real route
 * paths through a memory router and drive the page the way a creator does:
 * read the shell (breadcrumb, four steps and desktop/modal preview),
 * type a title, and save with the keyboard shortcut.
 *
 * Everything the page fetches goes through the mocked `apiClient`, so the tests
 * assert real wiring: which URL the save hits (PUT vs POST) and that the
 * preview tracks the same state the form writes.
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AxiosError} from 'axios';
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

const STEP_TITLES = ['Details', 'Media', 'Packages', 'Settings'];

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
  await screen.findByRole('navigation', {name: 'Service creation steps'});
  return screen.findByRole('button', {name: 'Details, step 1 of 4'});
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
      screen.getByRole('heading', {level: 1, name: /Create a service/}),
    ).toBeTruthy();
    expect(screen.getByRole('navigation', {name: 'Service creation steps'})).toBeTruthy();
    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Preview'})).toBeTruthy();
    // On larger screens the same unsaved state is previewed alongside the form.
    expect(screen.getByRole('complementary', {name: 'Service preview'})).toBeTruthy();
    // Step changes are announced once by the page-level status region.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  test('package, FAQ and contact length guidance matches the Laravel contract', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();

    await user.click(screen.getByRole('button', {name: 'Packages, step 3 of 4'}));
    await user.click(screen.getByRole('button', {name: 'Add Starter package'}));
    expect(screen.getByRole('textbox', {name: 'Package description'}).getAttribute('maxlength')).toBe('3000');
    expect(screen.getByText('0/3000')).toBeTruthy();

    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));
    await user.click(screen.getByRole('button', {name: 'Add FAQ'}));
    expect(screen.getByRole('textbox', {name: 'Answer'}).getAttribute('maxlength')).toBe('3000');

    await user.click(screen.getByRole('button', {name: 'Add contact button'}));
    expect(screen.getByRole('textbox', {name: 'Value'}).getAttribute('maxlength')).toBe('300');
  });

  test('FAQ and contact repeaters stop at the API maximums', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));

    const addFaq = screen.getByRole('button', {name: 'Add FAQ'});
    for (let index = 0; index < 20; index += 1) {
      await user.click(addFaq);
    }
    expect(addFaq).toHaveProperty('disabled', true);
    expect(screen.getByText('Maximum 20 FAQs reached.')).toBeTruthy();

    const addContact = screen.getByRole('button', {name: 'Add contact button'});
    for (let index = 0; index < 6; index += 1) {
      await user.click(addContact);
    }
    expect(addContact).toHaveProperty('disabled', true);
    expect(screen.getByText('Maximum 6 contact buttons reached.')).toBeTruthy();
  });

  test('all four service stages are accessible, navigable and retain unsaved fields', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();

    STEP_TITLES.forEach((title, index) => {
      expect(screen.getByRole('button', {name: `${title}, step ${index + 1} of 4`})).toBeTruthy();
    });
    expect(screen.getByRole('button', {name: 'Details, step 1 of 4'}).getAttribute('aria-current')).toBe('step');
    await user.type(titleInput(), 'Custom brand consulting');
    const descriptionEditor = document.getElementById('description');
    expect(descriptionEditor).not.toBeNull();

    const navigation = screen.getByRole('navigation', {name: 'Service creation steps'});
    const scroller = navigation.closest('[data-slot="section-content"]') as HTMLDivElement;
    expect(scroller).toBeTruthy();
    // The stage may be scrolled far down in the previous form; its own scroll
    // owner must reset after React commits the next stage, not in a stale rAF.
    scroller.scrollTop = 320;
    await user.click(screen.getByRole('button', {name: 'Media, step 2 of 4'}));
    expect(scroller.scrollTop).toBe(0);
    expect(screen.getByRole('button', {name: 'Media, step 2 of 4'}).getAttribute('aria-current')).toBe('step');
    expect(screen.queryByRole('textbox', {name: 'Title'})).toBeNull();
    expect(document.getElementById('description')).toBe(descriptionEditor);
    expect(screen.getByRole('heading', {name: 'Media and links'})).toBeTruthy();

    await user.click(screen.getByRole('button', {name: 'Packages, step 3 of 4'}));
    expect(screen.getByRole('heading', {name: 'Packages'})).toBeTruthy();

    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));
    expect(screen.getByRole('heading', {name: 'FAQ'})).toBeTruthy();
    expect(screen.getByRole('heading', {name: 'Contact buttons'})).toBeTruthy();

    scroller.scrollTop = 280;
    await user.click(screen.getByRole('button', {name: 'Details, step 1 of 4'}));
    expect(scroller.scrollTop).toBe(0);
    expect(titleInput().value).toBe('Custom brand consulting');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  test('Continue and Previous step move through the same stage sequence', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();

    await user.click(screen.getByRole('button', {name: 'Continue'}));
    const mediaStep = screen.getByRole('button', {name: 'Media, step 2 of 4'});
    expect(mediaStep.getAttribute('aria-current')).toBe('step');
    expect(document.activeElement).toBe(mediaStep);
    await user.click(screen.getByRole('button', {name: 'Previous step'}));
    expect(screen.getByRole('button', {name: 'Details, step 1 of 4'}).getAttribute('aria-current')).toBe('step');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('edit preview does not emit duplicate React key warnings', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPage('/dashboard/services/3/edit');
    await waitForForm();
    await waitFor(() => expect(titleInput().value).toBe('Brand identity sprint'));

    const messages = errorSpy.mock.calls.flat().map(String);
    expect(messages.some(message => message.includes('same key'))).toBe(false);
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
    // Sidebar and modal use the same hydrated, unsaved form state.
    expect(within(screen.getByRole('complementary', {name: 'Service preview'})).getByText('Starter')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    const dialog = screen.getByRole('dialog', {name: 'Customer preview'});
    expect(within(dialog).getByText('Brand identity sprint')).toBeTruthy();
    expect(within(dialog).getByText('Starter')).toBeTruthy();
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

    expect(within(screen.getByRole('complementary', {name: 'Service preview'})).getByText('Untitled service')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    const dialog = screen.getByRole('dialog', {name: 'Customer preview'});
    expect(within(dialog).getByText('Untitled service')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    // Both the footer action and the dialog's accessible X are named Close.
    // Choose the visible footer action deliberately.
    await user.click(screen.getAllByRole('button', {name: 'Close'})[0]);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.type(titleInput(), 'Logo design');
    // The modal correctly makes background content inert. Inspect the sidebar
    // before opening it, then verify the focused dialog's own content.
    expect(within(screen.getByRole('complementary', {name: 'Service preview'})).queryByText('Untitled service')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));

    expect(within(screen.getByRole('dialog', {name: 'Customer preview'})).getByText('Logo design')).toBeTruthy();
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
  test('editing a package clears its indexed server validation error', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.click(screen.getByRole('button', {name: 'Packages, step 3 of 4'}));
    await user.click(screen.getByRole('button', {name: 'Add Starter package'}));

    api.post.mockRejectedValueOnce(
      new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 422,
          data: {
            message: 'The given data was invalid.',
            errors: {'packages.0.name': ['Choose another package name.']},
          },
          statusText: 'Unprocessable Content',
          headers: {},
          config: {} as never,
        },
      ),
    );

    await user.click(screen.getByRole('button', {name: 'Save draft'}));
    expect(await screen.findByText('Choose another package name.')).toBeTruthy();

    const packageName = screen.getByRole('textbox', {name: 'Package name'});
    await user.clear(packageName);
    await user.type(packageName, 'Essentials');

    expect(screen.queryByText('Choose another package name.')).toBeNull();
  });

  test('indexed skills validation opens Details and shows the error on Skills', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.type(titleInput(), 'Brand strategy');
    await user.type(screen.getByRole('textbox', {name: 'Skills'}), 'A very long skill name that exceeds the server limit');
    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));

    api.post.mockRejectedValueOnce(
      new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 422,
          data: {
            message: 'The given data was invalid.',
            errors: {'skills.0': ['Each skill may not be greater than 40 characters.']},
          },
          statusText: 'Unprocessable Content',
          headers: {},
          config: {} as never,
        },
      ),
    );

    await user.click(screen.getByRole('button', {name: 'Publish service'}));

    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'Details, step 1 of 4'}).getAttribute('aria-current'),
      ).toBe('step'),
    );
    expect(screen.getByText('Each skill may not be greater than 40 characters.')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('skills')));
  });

  test('gallery validation opens Media and shows the error on the gallery field', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.type(titleInput(), 'Portfolio review');
    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));

    api.post.mockRejectedValueOnce(
      new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 422,
          data: {
            message: 'The given data was invalid.',
            errors: {'gallery_file_entry_ids.0': ['Select an image from this workspace.']},
          },
          statusText: 'Unprocessable Content',
          headers: {},
          config: {} as never,
        },
      ),
    );

    await user.click(screen.getByRole('button', {name: 'Publish service'}));

    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'Media, step 2 of 4'}).getAttribute('aria-current'),
      ).toBe('step'),
    );
    expect(screen.getByText('Select an image from this workspace.')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('gallery')));
  });

  test('server URL validation opens Media and focuses the invalid field', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.type(titleInput(), 'Consulting with demo');
    await user.click(screen.getByRole('button', {name: 'Settings, step 4 of 4'}));

    api.post.mockRejectedValueOnce(
      new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 422,
          data: {
            message: 'The given data was invalid.',
            errors: {video_url: ['Enter a valid video URL.']},
          },
          statusText: 'Unprocessable Content',
          headers: {},
          config: {} as never,
        },
      ),
    );

    await user.click(screen.getByRole('button', {name: 'Publish service'}));

    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'Media, step 2 of 4'}).getAttribute('aria-current'),
      ).toBe('step'),
    );
    expect(screen.getByText('Enter a valid video URL.')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('video_url')));
  });

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

  test('uncertain create recovery uses link semantics without Base UI button warnings', async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mountPage('/dashboard/services/new');
    await waitForForm();
    api.post.mockRejectedValueOnce(new Error('Connection ended after submission'));

    await user.click(screen.getByRole('button', {name: 'Save draft'}));
    const recoveryAction = await screen.findByRole('button', {name: 'Check My Services'});
    expect(recoveryAction.tagName).toBe('A');
    expect(recoveryAction.getAttribute('href')).toBe('/dashboard/services');

    const messages = errorSpy.mock.calls.flat().map(String);
    expect(messages.some(message => message.includes('expected a native <button>'))).toBe(false);
  });

  test('unknown create response blocks a second POST and preserves the unsaved form', async () => {
    const user = userEvent.setup();
    mountPage('/dashboard/services/new');
    await waitForForm();
    await user.type(titleInput(), 'Network uncertainty service');
    api.post.mockRejectedValueOnce(new Error('Connection ended after submission'));

    await user.click(screen.getByRole('button', {name: 'Save draft'}));
    expect(await screen.findByText(/We could not confirm whether the service was created/)).toBeTruthy();
    const recoveryAction = screen.getByRole('button', {name: 'Check My Services'});
    expect(recoveryAction.tagName).toBe('A');
    expect(recoveryAction.getAttribute('href')).toBe('/dashboard/services');
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

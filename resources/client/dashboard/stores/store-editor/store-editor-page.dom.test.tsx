/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {Suspense} from 'react';
import {beforeEach, expect, test, vi} from 'vitest';
import {createMemoryRouter, RouterProvider} from 'react-router';

const {BIOLINK} = vi.hoisted(() => ({
  BIOLINK: {
    id: 5,
    name: 'Nathanael Yitbarek',
    back_half: 'nate',
    short_url: 'https://linket.ddev.site/nate',
    url: 'https://linket.ddev.site/nate',
    builder_mode: 'creator_profile',
    content: [],
    appearance: null,
  } as any,
}));

vi.mock('@app/dashboard/stores/stores-queries', async importOriginal => ({
  ...(await importOriginal<
    typeof import('@app/dashboard/stores/stores-queries')
  >()),
  retrieveStoreOptions: (id: string) => ({
    queryKey: ['retrieveStoreOptions', id],
    queryFn: async () => ({data: BIOLINK}),
  }),
  listCurrentUserStoresOptions: () => ({
    queryKey: ['listCurrentUserStoresOptions'],
    queryFn: async () => ({data: [BIOLINK]}),
  }),
}));

vi.mock('@app/dashboard/use-datatable-route-type', () => ({
  useDatatableRouteType: () => ({
    routeType: 'dashboard',
    isForCurrentUser: true,
  }),
}));

vi.mock('@common/admin/ads/ad-host', () => ({
  AdHost: () => null,
}));

vi.mock('@app/gen/stores', async importOriginal => ({
  ...(await importOriginal<typeof import('@app/gen/stores')>()),
  updateStoreCreatorProfile: vi.fn(async () => ({data: {}})),
}));

const {PRODUCTS} = vi.hoisted(() => ({
  PRODUCTS: [] as any[],
}));

vi.mock('@app/gen/digital-products', async importOriginal => ({
  ...(await importOriginal<typeof import('@app/gen/digital-products')>()),
  digitalProductsIndex: vi.fn(async () => ({data: PRODUCTS})),
}));

vi.mock('@common/auth/use-auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@common/auth/use-auth')>()),
  useAuth: () => ({
    user: {id: 1, email: 'creator@example.com'},
    isLoggedIn: true,
    isSubscribed: false,
    hasPermission: () => false,
    hasRole: () => false,
    getPermission: () => undefined,
    getRestrictionValue: () => null,
    checkOverQuotaOrNoPermission: () => null,
    getRedirectUri: () => '/',
  }),
}));

vi.mock('@app/dashboard/stores/store-editor/live-preview', () => ({
  LivePreview: () => null,
}));

import {updateStoreCreatorProfile} from '@app/gen/stores';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';

import {useBiolinkEditorStore} from './biolink-editor-store';
import {CreatorProfileEditor} from './creator-profile-editor';
import {Component} from './store-editor-page';

/**
 * Outlet content inside the editor store: lets a test flip the profile dirty
 * flag directly, the way typing into the real profile form would.
 */
function ProfileProbe() {
  const setProfileIsDirty = useBiolinkEditorStore(s => s.setProfileIsDirty);
  return (
    <div>
      <button type="button" onClick={() => setProfileIsDirty(true)}>
        make dirty
      </button>
      <input aria-label="text field" name="bio" />
    </div>
  );
}

/** The phone preview's data source: the profile config pushed by the form. */
function PreviewProbe() {
  const bio = useBiolinkEditorStore(s => s.profileConfig.bio);
  const dirty = useBiolinkEditorStore(s => s.profileIsDirty);
  return <output data-testid="preview">{`${bio}|${dirty ? 'dirty' : 'clean'}`}</output>;
}

const previewText = () => screen.getByTestId('preview').textContent;

function renderEditor(opts: {form?: boolean} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: <div>dashboard home</div>,
      },
      {
        path: '/dashboard/stores/:storeId',
        element: (
          <DashboardLayout.Root name="test">
            <Component />
          </DashboardLayout.Root>
        ),
        children: [
          {
            index: true,
            element: opts.form ? (
              <>
                <CreatorProfileEditor />
                <PreviewProbe />
              </>
            ) : (
              <ProfileProbe />
            ),
          },
          {path: 'about', element: <div>about panel</div>},
          {path: 'appearance', element: <div>appearance panel</div>},
        ],
      },
    ],
    {initialEntries: ['/dashboard/stores/5']},
  );

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>loading</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  );
  return {...utils, router};
}

async function renderLoadedEditor(opts: {form?: boolean} = {}) {
  const utils = renderEditor(opts);
  await screen.findByRole('heading', {level: 1});
  return utils;
}

function markDirty() {
  fireEvent.click(screen.getByRole('button', {name: 'make dirty'}));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateStoreCreatorProfile).mockResolvedValue({data: {}} as any);
});

test('editor page has exactly one h1, the store name (A-09)', async () => {
  renderEditor();

  const h1 = await screen.findByRole('heading', {level: 1});
  expect(h1.textContent).toBe('Nathanael Yitbarek');
  expect(document.querySelectorAll('h1')).toHaveLength(1);
});

test('arrow keys switch tabs with history.replace, guard never fires (A-11)', async () => {
  const {router} = await renderLoadedEditor();
  markDirty();

  const contentTab = screen.getByRole('tab', {name: 'Content'});
  contentTab.focus();
  fireEvent.keyDown(contentTab, {key: 'ArrowRight'});

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/dashboard/stores/5/about');
  });
  expect(router.state.historyAction).toBe('REPLACE');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('alertdialog')).toBeNull();

  // aria-selected always matches the visible panel (poll: router state
  // updates a tick before React re-renders the tab strip).
  await waitFor(() => {
    const selected = screen.getByRole('tab', {selected: true});
    expect(selected.textContent).toContain('About');
    expect(contentTab.getAttribute('aria-selected')).toBe('false');
  });

  // Clicking a tab still switches, also unblocked while dirty.
  fireEvent.click(screen.getByRole('tab', {name: 'Content'}));
  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/dashboard/stores/5');
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Space activates the focused link tab (A-11)', async () => {
  const {router} = await renderLoadedEditor();

  const aboutTab = screen.getByRole('tab', {name: 'About'});
  aboutTab.focus();
  fireEvent.keyDown(aboutTab, {key: ' '});
  fireEvent.keyUp(aboutTab, {key: ' '});

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/dashboard/stores/5/about');
  });
});

test('Ctrl+S is swallowed and no-ops while clean (A-16)', async () => {
  await renderLoadedEditor();

  const notPrevented = fireEvent.keyDown(window, {key: 's', ctrlKey: true});

  // preventDefault while the editor is mounted: no browser save dialog.
  expect(notPrevented).toBe(false);
  expect(updateStoreCreatorProfile).not.toHaveBeenCalled();
});

test('Ctrl+S saves the dirty profile (A-16)', async () => {
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});

  await waitFor(() =>
    expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1),
  );
  expect(updateStoreCreatorProfile).toHaveBeenCalledWith(
    '5',
    expect.any(Object),
  );
});

test('Cmd+S saves the dirty profile (A-16)', async () => {
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', metaKey: true});

  await waitFor(() =>
    expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1),
  );
});

test('Ctrl+S is ignored while a save is pending (A-16)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockImplementation(
    () => new Promise(() => {}) as any,
  );
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  await waitFor(() =>
    expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1),
  );
  // While pending the button is labelled "Saving..." (A-07) and disabled.
  const saveButton = screen.getByRole('button', {
    name: /Saving/,
  }) as HTMLButtonElement;
  await waitFor(() => expect(saveButton.disabled).toBe(true));

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1);
});

test('Ctrl+S works while focus is in a text field (A-16)', async () => {
  await renderLoadedEditor();
  markDirty();

  const input = screen.getByLabelText('text field');
  input.focus();
  fireEvent.keyDown(input, {key: 's', ctrlKey: true});

  await waitFor(() =>
    expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1),
  );
});

test('Save button advertises the shortcut and shows it in a tooltip (A-16)', async () => {
  await renderLoadedEditor();
  markDirty();

  const saveButton = screen.getByRole('button', {name: /Save changes/});
  expect(saveButton.getAttribute('aria-keyshortcuts')).toBe('Control+S Meta+S');

  // Base UI tooltips are intentionally visual-only (no role="tooltip"),
  // so open via focus and assert the hint text appears.
  saveButton.focus();
  expect(await screen.findByText('Save changes (Ctrl+S)')).toBeTruthy();
});

test('discarding via the unsaved-changes dialog restores the saved preview (A-05)', async () => {
  const {router} = await renderLoadedEditor({form: true});

  // Edit the real form: the draft reaches the preview store.
  const bio = screen.getByLabelText('Short bio') as HTMLTextAreaElement;
  fireEvent.change(bio, {target: {value: 'XY'}});
  await waitFor(() => expect(previewText()).toContain('XY'));

  // Leaving while dirty opens the dialog; Discard throws the draft away.
  await router.navigate('/dashboard');
  const dialog = await screen.findByRole('dialog');
  expect(dialog.textContent).toContain('You have unsaved changes');
  fireEvent.click(screen.getByRole('button', {name: 'Discard'}));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/dashboard'),
  );

  // Coming back, the phone preview shows the saved value, not the draft.
  await router.navigate('/dashboard/stores/5');
  await screen.findByRole('heading', {level: 1});
  await waitFor(() => expect(previewText()).not.toContain('XY'));
  expect(previewText()).toBe('|clean');
});

test('after a successful save the preview equals the form (A-05)', async () => {
  await renderLoadedEditor({form: true});

  const bio = screen.getByLabelText('Short bio') as HTMLTextAreaElement;
  fireEvent.change(bio, {target: {value: 'XY'}});
  await waitFor(() => expect(previewText()).toBe('XY|dirty'));

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  await waitFor(() =>
    expect(updateStoreCreatorProfile).toHaveBeenCalledTimes(1),
  );

  // Save clears the store's dirty flag, and the preview still matches what
  // the form holds — the same bytes that were just sent to the server.
  await waitFor(() => expect(previewText()).toBe('XY|clean'));
  expect(bio.value).toBe('XY');
  expect(screen.getByTestId('preview').textContent).not.toContain('Saved');
});

// ---------------------------------------------------------------------------
// Save feedback (A-07). Every save is intercepted in the client — a fake
// never-resolving promise or a faked 422/500 — so nothing is ever written.

/** An axios-shaped error, which is what parseApiError() understands. */
const apiError = (status: number, data: Record<string, unknown>) =>
  ({isAxiosError: true, response: {status, data}}) as any;

/** The save-failure summary (role=alert), distinguishing it from error toasts. */
async function findSaveAlert() {
  const alerts = await screen.findAllByRole('alert');
  const alert = alerts.find(a =>
    a.textContent?.includes('Could not save changes'),
  );
  expect(alert).toBeTruthy();
  return alert as HTMLElement;
}

test('saving shows pending feedback and never double-submits (A-07)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockClear();
  vi.mocked(updateStoreCreatorProfile).mockImplementationOnce(
    () => new Promise(() => {}), // pending forever
  );
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  const saving = await screen.findByRole('button', {name: /Saving/});
  expect(saving.getAttribute('aria-busy')).toBe('true');
  expect(saving.hasAttribute('disabled')).toBe(true);
  const spinner = saving.querySelector('svg');
  expect(spinner?.getAttribute('class')).toContain('animate-spin');

  // No success announcement while the request is still open.
  expect(screen.queryByText('Changes saved')).toBeNull();

  // Neither a second Ctrl+S nor a click on the disabled button queues more.
  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  fireEvent.click(saving);
  expect(vi.mocked(updateStoreCreatorProfile)).toHaveBeenCalledTimes(1);
});

test('a successful save announces through an sr-only role=status (A-07)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockClear();
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});
  await waitFor(() =>
    expect(vi.mocked(updateStoreCreatorProfile)).toHaveBeenCalledTimes(1),
  );

  // The live region exists from the start; only its text changes.
  const status = screen
    .getAllByRole('status')
    .find(el => el.classList.contains('sr-only'));
  expect(status).toBeTruthy();
  await waitFor(() => expect(status!.textContent).toContain('Changes saved'));

  // Clean again: the Save button returns to its intentionally disabled look.
  await waitFor(() =>
    expect(
      screen.getByRole('button', {name: /Save changes/}).hasAttribute('disabled'),
    ).toBe(true),
  );
});

test('a clean Save button reads as intentionally disabled (A-07)', async () => {
  await renderLoadedEditor();

  const save = screen.getByRole('button', {name: /Save changes/});
  expect(save.hasAttribute('disabled')).toBe(true);
  // Not just opacity .5: muted tokens say "nothing to save".
  expect(save.className).toContain('disabled:bg-muted');
  expect(save.className).toContain('disabled:text-muted-foreground');
  expect(save.className).toContain('disabled:opacity-100');
});

test('a 422 lists and links failing fields and focuses the first invalid one (A-07)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockClear();
  vi.mocked(updateStoreCreatorProfile).mockRejectedValueOnce(
    apiError(422, {
      message: 'The given data was invalid.',
      errors: {
        bio: ['The bio must not be greater than 600 characters.'],
        display_name: ['The display name field is required.'],
      },
    }),
  );
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});

  const alert = await findSaveAlert();
  expect(alert.textContent).toContain('Could not save changes');
  expect(alert.textContent).toContain('The given data was invalid.');
  expect(within(alert).getByRole('link', {name: 'Short bio'})).toBeTruthy();
  expect(within(alert).getByRole('link', {name: 'Display name'})).toBeTruthy();
  expect(alert.textContent).toContain(
    'The bio must not be greater than 600 characters.',
  );

  // Focus moves to the first invalid field (keys iterate in fixture order).
  await waitFor(() =>
    expect(
      (document.activeElement as HTMLElement | null)?.getAttribute('name'),
    ).toBe('bio'),
  );

  // Dirty state is kept so nothing is lost.
  expect(
    screen.getByRole('button', {name: /Save changes/}).hasAttribute('disabled'),
  ).toBe(false);
});

test('a 500 shows the server error without field links and keeps dirty (A-07)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockClear();
  vi.mocked(updateStoreCreatorProfile).mockRejectedValueOnce(
    apiError(500, {message: 'Something went wrong on our side.'}),
  );
  await renderLoadedEditor();
  markDirty();

  fireEvent.keyDown(window, {key: 's', ctrlKey: true});

  const alert = await findSaveAlert();
  expect(alert.textContent).toContain('Something went wrong on our side.');
  expect(within(alert).queryAllByRole('link')).toHaveLength(0);

  // No invalid field exists: focus lands on the summary itself so the
  // announcement is not lost.
  await waitFor(() => expect(document.activeElement).toBe(alert));

  expect(
    screen.getByRole('button', {name: /Save changes/}).hasAttribute('disabled'),
  ).toBe(false);
});

test('Save & leave shares the failure states and stays in the editor (A-07)', async () => {
  vi.mocked(updateStoreCreatorProfile).mockClear();
  vi.mocked(updateStoreCreatorProfile).mockRejectedValueOnce(
    apiError(422, {
      message: 'The given data was invalid.',
      errors: {bio: ['The bio field is required.']},
    }),
  );
  const {router} = await renderLoadedEditor();
  markDirty();

  await router.navigate('/dashboard');
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save & leave'}));

  // Same summary as the header button would show...
  const alert = await findSaveAlert();
  expect(within(alert).getByRole('link', {name: 'Short bio'})).toBeTruthy();

  // ...and the guard keeps the user in the editor (navigation cancelled).
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe('/dashboard/stores/5');
  expect(
    screen.getByRole('button', {name: /Save changes/}).hasAttribute('disabled'),
  ).toBe(false);
});

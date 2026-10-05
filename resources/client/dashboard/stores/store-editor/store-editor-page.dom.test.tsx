/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
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

vi.mock('@app/dashboard/stores/store-editor/live-preview', () => ({
  LivePreview: () => null,
}));

import {updateStoreCreatorProfile} from '@app/gen/stores';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';

import {useBiolinkEditorStore} from './biolink-editor-store';
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
      <input aria-label="text field" />
    </div>
  );
}

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard/stores/:storeId',
        element: (
          <DashboardLayout.Root name="test">
            <Component />
          </DashboardLayout.Root>
        ),
        children: [
          {index: true, element: <ProfileProbe />},
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

async function renderLoadedEditor() {
  const utils = renderEditor();
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
  const saveButton = screen.getByRole('button', {
    name: /Save changes/,
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

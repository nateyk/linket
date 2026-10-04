/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {createMemoryRouter, Link, Outlet, RouterProvider} from 'react-router';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));

import {isWithinStoreEditorPath, UnsavedChangesGuard} from './unsaved-changes-guard';

const EDITOR_BASE = '/dashboard/stores/1';

type GuardOverrides = {
  dirty?: boolean;
  saveAndLeave?: () => Promise<void>;
};

function Shell({dirty, saveAndLeave}: Required<GuardOverrides>) {
  return (
    <>
      <UnsavedChangesGuard
        isDirty={dirty}
        isEditorPath={pathname => isWithinStoreEditorPath(EDITOR_BASE, pathname)}
        saveAndLeave={saveAndLeave}
      />
      <nav>
        <Link to={`${EDITOR_BASE}/about`}>to-about</Link>
        <Link to="/dashboard/other">to-other</Link>
      </nav>
      <Outlet />
    </>
  );
}

function renderEditor({
  dirty = true,
  saveAndLeave = vi.fn().mockResolvedValue(undefined),
}: GuardOverrides = {}) {
  const router = createMemoryRouter(
    [
      {
        path: EDITOR_BASE,
        element: <Shell dirty={dirty} saveAndLeave={saveAndLeave} />,
        children: [
          {index: true, element: <div>content panel</div>},
          {path: 'about', element: <div>about panel</div>},
        ],
      },
      {path: '/dashboard/other', element: <div>other page</div>},
    ],
    {initialEntries: [EDITOR_BASE]},
  );
  render(<RouterProvider router={router} />);
  return {router, saveAndLeave};
}

test('isWithinStoreEditorPath covers the editor tabs and nothing beside it', () => {
  expect(isWithinStoreEditorPath(EDITOR_BASE, EDITOR_BASE)).toBe(true);
  expect(isWithinStoreEditorPath(EDITOR_BASE, `${EDITOR_BASE}/about`)).toBe(true);
  expect(isWithinStoreEditorPath(EDITOR_BASE, `${EDITOR_BASE}/appearance`)).toBe(true);
  expect(isWithinStoreEditorPath(EDITOR_BASE, '/dashboard/other')).toBe(false);
  // Prefix siblings must not be swallowed by a naive startsWith.
  expect(isWithinStoreEditorPath(EDITOR_BASE, '/dashboard/stores/10')).toBe(false);
  expect(isWithinStoreEditorPath(EDITOR_BASE, '/dashboard/stores/10/about')).toBe(false);
  expect(isWithinStoreEditorPath(EDITOR_BASE, '/')).toBe(false);
});

test('beforeunload warns while the form is dirty (A-02)', () => {
  renderEditor({dirty: true});
  const event = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

test('beforeunload stays silent when the form is clean', () => {
  renderEditor({dirty: false});
  const event = new Event('beforeunload', {cancelable: true});
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});

test('switching editor tabs is never blocked while dirty', async () => {
  const {router} = renderEditor({dirty: true});
  fireEvent.click(screen.getByText('to-about'));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(`${EDITOR_BASE}/about`),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('a clean form leaves without any dialog', async () => {
  const {router, saveAndLeave} = renderEditor({dirty: false});
  fireEvent.click(screen.getByText('to-other'));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/dashboard/other'),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(saveAndLeave).not.toHaveBeenCalled();
});

test('leaving the editor while dirty offers Save & leave, Discard and Stay', async () => {
  const {router} = renderEditor({dirty: true});
  fireEvent.click(screen.getByText('to-other'));

  await screen.findByRole('dialog');
  expect(screen.getByRole('button', {name: 'Save & leave'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Discard'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Stay'})).toBeTruthy();
  // Navigation is held, not completed.
  expect(router.state.location.pathname).toBe(EDITOR_BASE);
});

test('Stay closes the dialog and keeps the editor open', async () => {
  const {router} = renderEditor({dirty: true});
  fireEvent.click(screen.getByText('to-other'));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', {name: 'Stay'}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe(EDITOR_BASE);
});

test('Discard leaves without saving', async () => {
  const {router, saveAndLeave} = renderEditor({dirty: true});
  fireEvent.click(screen.getByText('to-other'));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', {name: 'Discard'}));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/dashboard/other'),
  );
  expect(saveAndLeave).not.toHaveBeenCalled();
});

test('Save & leave saves first and only then navigates', async () => {
  let finishSave!: () => void;
  const saveAndLeave = vi.fn(
    () =>
      new Promise<void>(resolve => {
        finishSave = resolve;
      }),
  );
  const {router} = renderEditor({dirty: true, saveAndLeave});
  fireEvent.click(screen.getByText('to-other'));
  await screen.findByRole('dialog');

  const saveButton = screen.getByRole('button', {name: 'Save & leave'});
  fireEvent.click(saveButton);
  expect(saveAndLeave).toHaveBeenCalledTimes(1);
  // Save still pending: hold the navigation and lock the button.
  expect(router.state.location.pathname).toBe(EDITOR_BASE);
  expect(saveButton).toHaveProperty('disabled', true);

  finishSave();
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/dashboard/other'),
  );
});

test('a failed save keeps the user in the editor', async () => {
  const saveAndLeave = vi.fn(() => Promise.reject(new Error('save failed')));
  const {router} = renderEditor({dirty: true, saveAndLeave});
  fireEvent.click(screen.getByText('to-other'));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', {name: 'Save & leave'}));

  await waitFor(() => expect(saveAndLeave).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe(EDITOR_BASE);
});

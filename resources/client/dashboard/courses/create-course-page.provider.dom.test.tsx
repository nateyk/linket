/**
 * @vitest-environment jsdom
 *
 * Critical-2 regression: the "Course settings" panel mounts the shared
 * CourseSettingsCoverField → CroppedCover, whose upload hook reads
 * FileUploadContext — a `createContext(null!)`. The create page returned
 * DashboardLayout.MainSection with no provider, so CLICKING the settings
 * section threw during render (the builder and the digital-product form
 * both wrap their trees in <FileUploadProvider>; the create page did not).
 *
 * The page's main test file module-stubs CroppedCover, which is exactly why
 * this was masked there. This file keeps the cover field REAL and supplies
 * only the page-level providers — NOT FileUploadProvider: the page itself
 * must provide the upload context.
 */
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, expect, test, vi} from 'vitest';
import {Component} from './create-course-page';

// jsdom has no layout: the panel also mounts the TipTap description field,
// which queries Range rects and elementFromPoint (same stubs as the page's
// main test file).
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

vi.mock('@common/http/query-client', async () => {
  const {QueryClient} = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({defaultOptions: {queries: {retry: false}}}),
    apiClient: {
      get: () => Promise.resolve({data: {data: []}}),
      post: () => Promise.resolve({data: {data: {id: 900, course: {id: 77}}}}),
      put: () => Promise.resolve({data: {data: {}}}),
      delete: () => Promise.resolve({data: {data: []}}),
      request: () => Promise.resolve({data: {data: []}}),
    },
  };
});

test('opening Course settings renders the real cover field without a provider error', async () => {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [{path: '/dashboard/items/new/course', element: <Component />}],
    {initialEntries: ['/dashboard/items/new/course?billing=free']},
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

  // Deliberately no FileUploadProvider here — the page must supply it.
  await user.click(screen.getByRole('button', {name: /course settings/i}));

  // The real CroppedCover dropzone mounts (it reads the upload store the
  // page provides) instead of throwing out of render.
  expect(await screen.findByText('Cover image')).toBeTruthy();
  expect(
    await screen.findByText('Select file to upload or drag-and-drop file'),
  ).toBeTruthy();
});

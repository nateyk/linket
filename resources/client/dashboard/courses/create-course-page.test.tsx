/**
 * @vitest-environment jsdom
 */
import fs from 'node:fs';
import path from 'node:path';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {Component} from './create-course-page';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
  'utf8',
);

describe('course creation page', () => {
  test('reads billing and price through the shared prefill parser', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).not.toContain("searchParams.get('price_cents')");
  });

  test('renders breadcrumb and shared form primitives', () => {
    expect(source).toContain("from '@shadcn/breadcrumb/breadcrumb'");
    expect(source).toContain('<Breadcrumb');
    expect(source).toContain('All products');
    expect(source).toContain('<ProductFormField');
    expect(source).toContain('aria-invalid');
  });

  test('shows a Free badge instead of a price field for free billing', () => {
    expect(source).toContain('<Badge');
    expect(source).toContain("billing === 'free'");
  });

  test('keeps spinner submit state and uncertain-creation recovery', () => {
    expect(source).toContain('<Spinner');
    expect(source).toContain('creationUncertain');
    expect(source).toContain('Check My Items');
  });

  test('labels static copy through Trans', () => {
    expect(source).toContain('<Trans message="Create course" />');
    expect(source).toContain('label="Course title"');
    expect(source).toContain('label="Price (ETB)"');
    expect(source).not.toContain("setError('Add a course title");
  });
});

describe('wizard handoff provenance', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('states where the billing and price came from', () => {
    expect(source).toContain('prefill.billing !== null');
    expect(source).toContain('From previous step: Free.');
    expect(source).toContain('From previous step: Paid');
  });
});
describe('uncertain creation recovery', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('keeps submit enabled for direct retry', () => {
    expect(source).toContain('disabled={creating}>');
    expect(source).not.toContain('disabled={creating || creationUncertain}');
  });

  test('keeps the items escape hatch', () => {
    expect(source).toContain('creationUncertain');
    expect(source).toContain('Check My Items');
  });
});

/* ── Task B — inline course settings in the two-step create flow ──
 *
 * The "Course settings" section is a real form now: it renders the shared
 * settings fields (the same module the builder's settings dialog uses) and
 * the create submit follows the POST /items with a best-effort
 * PUT /courses/{id} carrying ONLY the settings subset. The course exists
 * after the POST, so a rejected PUT must never re-create it — it navigates
 * into the builder anyway and surfaces one danger toast.
 */

// jsdom has no layout: ProseMirror queries Range rects while the settings
// description editor mounts (same stub as the other TipTap-owning suites),
// and its mousedown handler calls document.elementFromPoint (jsdom omits it).
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

const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockToastDanger = vi.hoisted(() => vi.fn());

vi.mock('@common/http/query-client', async () => {
  const {QueryClient} = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({defaultOptions: {queries: {retry: false}}}),
    apiClient: {
      get: () => Promise.resolve({data: {data: []}}),
      post: mockPost,
      put: mockPut,
      delete: () => Promise.resolve({data: {data: []}}),
      request: () => Promise.resolve({data: {data: []}}),
    },
  };
});

// The toast container is mounted at the app root, not inside this page, so
// the copy is asserted at the call site (toast.danger(trans({message})))
// rather than through rendered toast DOM.
vi.mock('@ui/toast/toast', () => {
  const toast = Object.assign(vi.fn(), {
    danger: mockToastDanger,
    positive: vi.fn(),
    loading: vi.fn(),
  });
  return {toast};
});

function mount(url = '/dashboard/items/new/course?billing=free') {
  const router = createMemoryRouter(
    [
      {path: '/dashboard/items/new/course', element: <Component />},
      {
        path: '/dashboard/items/:productId/course',
        element: <p>course builder</p>,
      },
      {path: '*', element: <p>not found</p>},
    ],
    {initialEntries: [url]},
  );
  render(
    <QueryClientProvider
      client={new QueryClient({defaultOptions: {queries: {retry: false}}})}
    >
      <DashboardLayoutContextProvider name="test">
        {() => (
          // The cover field mounts CroppedCover, whose upload hook reads the
          // file-upload store from context.
          <FileUploadProvider>
            <RouterProvider router={router} />
          </FileUploadProvider>
        )}
      </DashboardLayoutContextProvider>
    </QueryClientProvider>,
  );
  return router;
}

function submitForm() {
  const form = document.getElementById('course-create-form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

async function typeTitle(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByRole('textbox', {name: /course title/i}),
    'Ethiopian coffee course',
  );
}

async function openSettingsSection(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByRole('button', {name: /course settings/i}),
  );
}

async function addOutcome(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.type(
    screen.getByPlaceholderText(/build and launch/i),
    text,
  );
  await user.click(screen.getByRole('button', {name: 'Add'}));
}

/** Type into the shared TipTap description editor (the section must be open). */
async function typeDescription(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  const editor = await vi.waitFor(() => {
    const el = document.querySelector('.ProseMirror');
    expect(el).toBeTruthy();
    return el as HTMLElement;
  });
  await user.click(editor);
  await user.keyboard(text);
}

const SETTINGS_FAILURE_COPY =
  'Course created, but some settings could not be saved. You can update them from the course builder.';

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({data: {data: {id: 77}}});
  mockPut.mockReset();
  mockPut.mockResolvedValue({data: {data: {}}});
  mockToastDanger.mockReset();
});

describe('inline course settings', () => {
  test('settings section renders the three shared fields above the helper copy', async () => {
    const user = userEvent.setup();
    mount();
    await openSettingsSection(user);

    // The two catalog helper lines stay put — the fields are added below them.
    expect(
      screen.getByText('Next, add chapters and lessons in the course builder.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Your course stays a draft until you submit it for review.'),
    ).toBeTruthy();

    // The three fields, by their visible labels.
    expect(await screen.findByText('Description')).toBeTruthy();
    expect(screen.getByText("What you'll learn")).toBeTruthy();
    expect(screen.getByText('Cover Image')).toBeTruthy();
    // ...and the description editor is the shared TipTap field.
    await vi.waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy();
    });
  });

  test('submitting with untouched settings posts once and never PUTs', async () => {
    const user = userEvent.setup();
    mount();
    await typeTitle(user);

    submitForm();

    expect(await screen.findByText('course builder')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('settings content follows creation with one PUT of the subset payload', async () => {
    const user = userEvent.setup();
    mount();
    await typeTitle(user);
    await openSettingsSection(user);
    await typeDescription(user, 'Learn the coffee ritual');
    await addOutcome(user, 'Ship a working course');

    submitForm();

    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/77', {
      description: '<p>Learn the coffee ritual</p>',
      learning_outcomes: ['Ship a working course'],
      cover_file_entry_id: null,
    });
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('course builder')).toBeTruthy();
  });

  test('a rejected settings PUT still navigates, never re-creates, and warns once', async () => {
    mockPut.mockRejectedValue(new Error('validation failed'));
    const user = userEvent.setup();
    mount();
    await typeTitle(user);
    await openSettingsSection(user);
    await addOutcome(user, 'Ship a working course');

    submitForm();

    // The course exists after the POST: navigate into the builder anyway...
    expect(await screen.findByText('course builder')).toBeTruthy();
    // ...without a second create attempt...
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledTimes(1);
    // ...and surface exactly one danger toast with the new copy.
    expect(mockToastDanger).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledWith(SETTINGS_FAILURE_COPY);
  });

  test('settings completion feeds the progress display without gating create', async () => {
    const user = userEvent.setup();
    mount();

    // Title valid, settings still empty: only the details section counts.
    await typeTitle(user);
    expect(screen.getByText('1 of 2 required sections complete')).toBeTruthy();

    // A filled description completes the second section (any settings content
    // would — description is the one the spec pins down).
    await openSettingsSection(user);
    await typeDescription(user, 'Learn the coffee ritual');
    expect(
      await screen.findByText('2 of 2 required sections complete'),
    ).toBeTruthy();
  });
});

/**
 * @vitest-environment jsdom
 */
import fs from 'node:fs';
import path from 'node:path';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {AxiosError} from 'axios';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {Component} from './create-course-page';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
  'utf8',
);

describe('large text responsive Course header UX-34', () => {
  test('keeps the heading readable and icon controls named at tablet text sizes', () => {
    expect(source).toContain('className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2"');
    expect(source).toContain('max-lg:order-3 max-lg:basis-full');
    expect(source).toContain('max-lg:overflow-visible max-lg:whitespace-normal');
    expect(source).toContain('max-lg:hidden');
    expect(source).toContain('max-lg:size-11 max-lg:px-0');
    expect(source).toContain('aria-label={trans({message: \'Preview\'})}');
  });
});

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
    expect(source).toContain("const isFree = billingMode === 'free'");
    expect(source).toContain('<Trans message="Free" />');
    expect(source).toContain('Badge');
    // Price field only for paid — free renders the badge, not the ETB input.
    expect(source).toContain('isFree ? (');
    expect(source).toContain('label="Price (ETB)"');
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

describe('wizard handoff continuity', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('prefills silently like the digital form — no "previous step" seam copy', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).not.toContain('From previous step');
  });

  test('customer preview opens through the shared read-only dialog', () => {
    expect(source).toContain('ProductFormCustomerPreview');
    expect(source).not.toContain('<Card.Root>');
    expect(source).toContain('<ProductPreviewDialog');
    expect(source).toContain('<Trans message="Preview" />');
    expect(source).not.toContain('<aside className="min-w-0 lg:sticky lg:top-6">');
  });

  test('course settings uses a non-price icon', () => {
    expect(source).toContain('ListChecksIcon');
    expect(source).not.toMatch(/settings.*TagIcon|icon: TagIcon/);
  });
});
describe('uncertain creation recovery', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
    'utf8',
  );

  test('blocks duplicate POST while creating or after an uncertain response', () => {
    expect(source).toContain('disabled={creating || creationUncertain}');
    expect(source).toContain('createInFlight.current || uncertainRequest.current || creationUncertain');
    expect(source).toContain('createInFlight.current = true');
    expect(source).toContain('createInFlight.current = false');
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

// CroppedCover runs a crop + XHR-upload pipeline jsdom cannot drive (object
// URLs, an upload strategy, a crop dialog). The branch the cover test guards
// is the page wiring of the field's onChange(url, entry) contract — which
// CourseSettingsCoverField maps to onChange(url, entry?.id ?? null) — so the
// stub calls that same contract with a fake entry instead of uploading.
vi.mock('@common/uploads/components/cropped-image-selector', () => ({
  CroppedCover: ({
    onChange,
  }: {
    value: string;
    onChange: (url: string, entry?: {id: number}) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange('https://cdn.test/cover.png', {id: 456})}
    >
      Set cover
    </button>
  ),
}));

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
        {() => <RouterProvider router={router} />}
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

// Plain controlled inputs take one change event — per-keystroke user-event
// typing is the expensive path under jsdom and buys nothing here (only the
// TipTap editor needs real key events, see typeDescription below).
function typeTitle(title = 'Cafe') {
  fireEvent.change(screen.getByRole('textbox', {name: /course title/i}), {
    target: {value: title},
  });
}

async function openSettingsSection(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByRole('button', {name: /course settings/i}),
  );
}

function addOutcome(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/build and launch/i), {
    target: {value: text},
  });
  fireEvent.click(screen.getByRole('button', {name: 'Add'}));
}

/**
 * One real keystroke into the shared TipTap description editor (the section
 * must be open). ProseMirror only accepts DOM-driven key events, and every
 * keystroke costs a full editor transaction — callers pass a single
 * character, enough to give the editor non-empty content.
 */
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
  // Product id ≠ course id on purpose: the dev DB often has them equal
  // (same auto-increment), which is exactly how the wrong-id PUT bug hid.
  // Every PUT-expecting case must target the COURSE id (77), never the
  // product id (900).
  mockPost.mockResolvedValue({data: {data: {id: 900, course: {id: 77}}}});
  mockPut.mockReset();
  mockPut.mockResolvedValue({data: {data: {}}});
  mockToastDanger.mockReset();
});

describe('Course creation uncertainty and duplicate prevention', () => {
  test('an unacknowledged POST blocks further creates and keeps Check My Items accessible', async () => {
    mockPost.mockRejectedValueOnce(new AxiosError('Network error', 'ERR_NETWORK'));
    mount();
    typeTitle('Synthetic course');

    submitForm();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('We could not confirm whether the course was created.');
    await vi.waitFor(() => {
      expect((screen.getByRole('button', {name: 'Create course'}) as HTMLButtonElement).disabled).toBe(true);
    });
    expect(screen.getByRole('link', {name: 'Check My Items'})).toBeTruthy();

    submitForm(); // Even a programmatic submit must not issue another POST.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('a definite HTTP rejection permits a deliberate user retry', async () => {
    mockPost.mockRejectedValueOnce(new AxiosError(
      'Unprocessable',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 422,
        data: {message: 'Course cannot be created yet.'},
        statusText: 'Unprocessable Content',
        headers: {},
        config: {} as never,
      },
    ));
    mount();
    typeTitle('Synthetic course');

    submitForm();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Course cannot be created yet.');
    await vi.waitFor(() => {
      expect((screen.getByRole('button', {name: 'Create course'}) as HTMLButtonElement).disabled).toBe(false);
    });
    submitForm();
    expect(await screen.findByText('course builder')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  test('a 503 response stays uncertain and does not invite duplicate creation', async () => {
    mockPost.mockRejectedValueOnce(new AxiosError(
      'Service unavailable',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 503,
        data: {message: 'Temporary server error'},
        statusText: 'Service Unavailable',
        headers: {},
        config: {} as never,
      },
    ));
    mount();
    typeTitle('Synthetic course');
    submitForm();
    expect((await screen.findByRole('alert')).textContent).toContain('We could not confirm whether the course was created.');
    await vi.waitFor(() => {
      expect((screen.getByRole('button', {name: 'Create course'}) as HTMLButtonElement).disabled).toBe(true);
    });
    submitForm();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('malformed success payload cannot cause a second create POST', async () => {
    mockPost.mockResolvedValueOnce({data: {data: {}}});
    mount();
    typeTitle('Synthetic course');
    submitForm();
    expect((await screen.findByRole('alert')).textContent).toContain('We could not confirm whether the course was created.');
    await vi.waitFor(() => {
      expect((screen.getByRole('button', {name: 'Create course'}) as HTMLButtonElement).disabled).toBe(true);
    });
    submitForm();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('synchronous repeated submissions share one in-flight POST', async () => {
    let resolvePost: ((payload: unknown) => void) | undefined;
    mockPost.mockImplementationOnce(() => new Promise(resolve => { resolvePost = resolve; }));
    mount();
    typeTitle('Synthetic course');
    submitForm();
    submitForm();
    expect(mockPost).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolvePost!({data: {data: {id: 900, course: {id: 77}}}});
    });
    expect(await screen.findByText('course builder')).toBeTruthy();
  });
});

describe('inline course settings', () => {
  test('settings section renders the three shared fields with the helper copy below them', async () => {
    const user = userEvent.setup();
    mount();
    await openSettingsSection(user);

    // The section subtitle names the inline form (a plain array string the
    // extractor cannot see — it reaches <Trans> through a variable).
    expect(
      screen.getByText(
        'Add a description, learning outcomes, and a cover image.',
      ),
    ).toBeTruthy();

    // The three fields, by their visible labels.
    const descriptionLabel = await screen.findByText('Description');
    expect(screen.getByText("What you'll learn")).toBeTruthy();
    expect(screen.getByText('Cover image')).toBeTruthy();
    // ...and the description editor is the shared TipTap field.
    await vi.waitFor(() => {
      expect(document.querySelector('.ProseMirror')).toBeTruthy();
    });

    // The "what happens next" helper lines moved BELOW the fields (the first
    // one reworded; the draft-review line is unchanged).
    const firstHelper = screen.getByText(
      'After creating the course, add chapters and lessons in the course builder.',
    );
    expect(
      screen.getByText('Your course stays a draft until you submit it for review.'),
    ).toBeTruthy();
    expect(
      descriptionLabel.compareDocumentPosition(firstHelper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('the customer preview reflects the typed description as plain text', async () => {
    const user = userEvent.setup();
    mount();

    // Empty description: shared ProductCard omits the description block
    // (same as the digital-product edit preview) until there is real copy.
    expect(
      screen.queryByText(
        'Add a short description to show learners what to expect.',
      ),
    ).toBeNull();
    expect(screen.queryByText('Your course title')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    expect(screen.getByText('Your course title')).toBeTruthy();
    await user.keyboard('{Escape}');

    await openSettingsSection(user);
    await typeDescription(user, 'Cafe basics');
    await user.click(screen.getByRole('button', {name: 'Preview'}));

    // The preview shows the typed text — the TipTap value is tag-stripped and
    // rendered as a plain text node (the editor itself also holds the text,
    // so pick the match outside .ProseMirror).
    const matches = await screen.findAllByText('Cafe basics');
    const preview = matches.find(el => !el.closest('.ProseMirror'));
    expect(preview).toBeTruthy();
    expect(preview!.textContent).toBe('Cafe basics');
  }, 10_000);

  test('submitting with untouched settings posts once and never PUTs', async () => {
    mount();
    typeTitle();

    submitForm();

    expect(await screen.findByText('course builder')).toBeTruthy();
    // The create request stays byte-identical to the pre-settings page —
    // pinned here so a payload edit has to break a test, not just a diff.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/items', {
      title: 'Cafe',
      description: null,
      price_cents: 0,
      currency: 'etb',
      type: 'course',
    });
    expect(mockPut).not.toHaveBeenCalled();
  });

  test('settings content follows creation with one PUT of the subset payload', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    // A single keystroke — enough to make the editor's HTML non-empty.
    await typeDescription(user, 'X');
    addOutcome('Ship a working course');

    submitForm();

    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    // The settings PUT binds the COURSE id, not the product id the dev DB
    // usually mirrors it with.
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/77', {
      description: '<p>X</p>',
      learning_outcomes: ['Ship a working course'],
      cover_file_entry_id: null,
    });
    expect(mockPut).not.toHaveBeenCalledWith(
      '/api/v1/courses/900',
      expect.anything(),
    );
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('course builder')).toBeTruthy();
  }, 10_000);

  test('a rejected settings PUT still navigates, never re-creates, and warns once', async () => {
    mockPut.mockRejectedValue(new Error('validation failed'));
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    addOutcome('Ship a working course');

    submitForm();

    // The course exists after the POST: navigate into the builder anyway...
    expect(await screen.findByText('course builder')).toBeTruthy();
    // ...without a second create attempt...
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/77', expect.anything());
    expect(mockPut).not.toHaveBeenCalledWith(
      '/api/v1/courses/900',
      expect.anything(),
    );
    // ...and surface exactly one danger toast with the new copy.
    expect(mockToastDanger).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledWith(SETTINGS_FAILURE_COPY);
  });

  // Non-gating is proven by the untouched-settings test above (create still
  // submits with settings empty); this one pins the progress flip itself.
  test('a filled description flips the second required section to complete', async () => {
    const user = userEvent.setup();
    mount();

    // Title valid, settings still empty: only the details section counts.
    typeTitle();
    expect(screen.getByText('1 of 2 required sections complete')).toBeTruthy();

    // A filled description completes the second section (any settings content
    // would — description is the one the spec pins down).
    await openSettingsSection(user);
    await typeDescription(user, 'X');
    expect(
      await screen.findByText('2 of 2 required sections complete'),
    ).toBeTruthy();
  }, 10_000);

  test('a cover alone follows creation with its numeric file id', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    await user.click(screen.getByRole('button', {name: 'Set cover'}));

    submitForm();

    // coverFileId alone makes settings worth sending — with the other two
    // fields still empty in their spec-defined empty shapes.
    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/77', {
      description: null,
      learning_outcomes: [],
      cover_file_entry_id: 456,
    });
    expect(mockPut).not.toHaveBeenCalledWith(
      '/api/v1/courses/900',
      expect.anything(),
    );
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('course builder')).toBeTruthy();
  }, 10_000);

  // Defense for the "should not happen for type=course" branch: if the POST
  // response ever lacks the nested course id, settings cannot be saved —
  // warn once and navigate, but NEVER re-POST (the course exists).
  test('settings without a course id in the response warn and never re-create', async () => {
    mockPost.mockResolvedValue({data: {data: {id: 900}}});
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    addOutcome('Ship a working course');

    submitForm();

    expect(await screen.findByText('course builder')).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledWith(SETTINGS_FAILURE_COPY);
  });

  // A focused-then-cleared TipTap editor can emit tag-only HTML — in this
  // harness select-all + backspace leaves
  // `<p ...><br class="ProseMirror-trailingBreak"></p>`, which the shared
  // hook does NOT normalize to ''. That is not description content: it must
  // not open the settings gate...
  test('a cleared description editor does not count as settings content', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    await typeDescription(user, 'X');
    // What clearing the field does: select all, then delete.
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');

    submitForm();

    expect(await screen.findByText('course builder')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  }, 10_000);

  // Whitespace-only content is a case the shared hook does NOT normalize
  // (`<p> </p>` passes its exact-`<p></p>` check) — the page-level
  // tag-strip is what keeps it from counting as settings.
  test('a whitespace-only description does not count as settings content', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    await typeDescription(user, ' ');

    submitForm();

    expect(await screen.findByText('course builder')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPut).not.toHaveBeenCalled();
  }, 10_000);

  // ...and when other settings exist, the PUT must send description: null
  // instead of the tag-only junk.
  test('an emptied description sends null alongside other settings', async () => {
    const user = userEvent.setup();
    mount();
    typeTitle();
    await openSettingsSection(user);
    await typeDescription(user, 'X');
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    addOutcome('Ship a working course');

    submitForm();

    await vi.waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut).toHaveBeenCalledWith('/api/v1/courses/77', {
      description: null,
      learning_outcomes: ['Ship a working course'],
      cover_file_entry_id: null,
    });
    expect(mockToastDanger).not.toHaveBeenCalled();
    expect(await screen.findByText('course builder')).toBeTruthy();
  }, 10_000);
});

/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {useState} from 'react';
import {expect, test, vi} from 'vitest';

import {STORE_3006_ABOUT_HTML} from '@app/short-links/renderers/biolink-renderer/store-3006-about.fixture';

const {PRODUCTS} = vi.hoisted(() => ({
  PRODUCTS: [
    {id: 11, name: 'Logo pack', status: 'approved', biolink_ids: [5]},
    {id: 12, name: 'Brand guide', status: 'approved', biolink_ids: [5]},
    {id: 13, name: 'Unattached', status: 'approved', biolink_ids: []},
  ] as any[],
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

import {
  BiolinkEditorStoreProvider,
  useBiolinkEditorStore,
} from './biolink-editor-store';
import {CreatorProfileEditor} from './creator-profile-editor';

/** Store 3006's real skills, in the order they are saved. */
const SKILLS_3006 = [
  'Design',
  'Photography',
  'adobe',
  'Figma',
  'inDesign',
  'Nextjs',
  'JavaScript',
];

const BIOLINK = {
  id: 5,
  name: 'Nathanael Yitbarek',
  back_half: 'nate',
  builder_mode: 'creator_profile',
  content: [],
  appearance: null,
  profile_config: {skills: SKILLS_3006},
} as any;

/**
 * Store 3006's raw profile_config shape (every field populated, follow_url
 * null the way the DB stores an absent link) — the fields where the pushed
 * config and the saved baseline could diverge only exist with real data.
 */
const REAL_BIOLINK = {
  ...BIOLINK,
  profile_config: {
    bio: 'Creative Director building the future of digital products.',
    skills: SKILLS_3006,
    cover_url: '/storage/link-images/8871de22-9cc1-4294-ab9f-cd98b1bc677c.jpg',
    about_html: '<p>Real about content.</p>',
    avatar_url: '/storage/link-images/be18c9cc-d1c1-46de-8ad2-fc944c5b5528.png',
    follow_url: null,
    contact_url: 'admin@admin.com',
    display_name: 'Nathanael Yitbarek',
    social_links: {
      mail: 'natenaelny@gmail.com',
      twitter: '@youtname',
      instagram: '@instalgesam',
    },
    profile_title: 'Creative director',
    source_widget_ids: [],
    available_for_work: true,
  },
} as any;

/** The phone preview's data source: the profile config pushed by the form. */
function PreviewProbe() {
  const bio = useBiolinkEditorStore(s => s.profileConfig.bio);
  const skills = useBiolinkEditorStore(s => s.profileConfig.skills);
  const dirty = useBiolinkEditorStore(s => s.profileIsDirty);
  return (
    <>
      <output data-testid="preview">{`${bio}|${dirty ? 'dirty' : 'clean'}`}</output>
      <output data-testid="preview-skills">{skills.join(',')}</output>
    </>
  );
}

function renderProfileEditor(
  tab?: 'content' | 'about',
  biolink: any = BIOLINK,
) {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BiolinkEditorStoreProvider data={biolink}>
        <PreviewProbe />
        <CreatorProfileEditor tab={tab} />
      </BiolinkEditorStoreProvider>
    </QueryClientProvider>,
  );
}

const preview = () => screen.getByTestId('preview').textContent;
const triggerByName = (name: string) => screen.getByRole('button', {name});

/**
 * Keeps the editor store mounted (like the real route layout does) while the
 * editor itself can be unmounted and remounted — what happens when the user
 * switches Content -> Appearance -> Content, since each tab is a route.
 */
function RemountableProfileEditor() {
  const [instance, setInstance] = useState(0);
  return (
    <>
      <button
        type="button"
        data-testid="remount-editor"
        onClick={() => setInstance(value => value + 1)}
      >
        Remount
      </button>
      <CreatorProfileEditor key={instance} />
    </>
  );
}

function renderRemountableProfileEditor(biolink = BIOLINK) {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BiolinkEditorStoreProvider data={biolink}>
        <PreviewProbe />
        <RemountableProfileEditor />
      </BiolinkEditorStoreProvider>
    </QueryClientProvider>,
  );
}

function describedTexts(trigger: HTMLElement): string {
  return (trigger.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

test('content tab has an h2 panel title like the other tabs (A-09)', async () => {
  renderProfileEditor();

  const h2 = await screen.findByRole('heading', {level: 2, name: 'Content'});
  expect(h2).toBeTruthy();
});

test('bio field is labelled Short bio, never a second About (A-15)', () => {
  renderProfileEditor();
  // Sections start collapsed now — open Profile to reach its fields.
  fireEvent.click(triggerByName('Profile'));

  expect(screen.getByLabelText('Short bio')).toBeTruthy();
  expect(screen.queryByLabelText('About')).toBeNull();
});

test('section triggers are named by their title alone (A-09)', () => {
  renderProfileEditor();

  expect(screen.getByRole('button', {name: 'Profile'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Social links'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Actions'})).toBeTruthy();
});

test('products trigger reads its count as a description phrase (A-09)', async () => {
  renderProfileEditor();

  const products = await screen.findByRole('button', {name: 'Products'});
  expect(describedTexts(products)).toContain(
    'Feature up to six items.',
  );
  await waitFor(() => {
    expect(describedTexts(products)).toContain('2 of 6 products featured');
  });
});

test('reverting every edit pushes the saved value back to the preview (A-05)', async () => {
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  const bio = screen.getByLabelText('Short bio') as HTMLTextAreaElement;
  expect(preview()).toBe('|clean');

  // Edit: the draft reaches the phone preview while the form is dirty.
  fireEvent.change(bio, {target: {value: 'XY'}});
  await waitFor(() => expect(preview()).toBe('XY|dirty'));

  // Undo (back to the saved value): the form returns to clean and the
  // preview must show the saved value again, not the discarded draft.
  fireEvent.change(bio, {target: {value: ''}});
  await waitFor(() => expect(preview()).toBe('|clean'));

  // A form back at its saved values is never reported as unsaved.
  expect(preview()).toContain('|clean');
});

test('profile fields expose their form field name for error focus (A-07)', () => {
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  // The save-failure summary locates a field by its name and focuses the
  // control inside it — so the name must reach the DOM on the field group.
  expect(
    document.querySelector('[data-slot="field"][data-field-name="bio"]'),
  ).toBeTruthy();
  expect(
    document.querySelector('[data-slot="field"][data-field-name="display_name"]'),
  ).toBeTruthy();
});

/** The skills field group, located the way the error summary does (A-07). */
function skillsField(): HTMLElement {
  const field = document.querySelector(
    '[data-slot="field"][data-field-name="skills"]',
  );
  expect(field).toBeTruthy();
  return field as HTMLElement;
}

/** Chip remove labels in DOM (= chip) order, `Remove :skill` per chip. */
function skillRemoveLabels(): string[] {
  return within(skillsField())
    .queryAllByRole('button', {name: /^Remove /})
    .map(button => button.getAttribute('aria-label') ?? '');
}

test("store 3006's seven skills load as ordered chips with an n/8 counter and stay clean (A-12)", () => {
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  expect(skillRemoveLabels()).toEqual(
    SKILLS_3006.map(skill => `Remove ${skill}`),
  );
  expect(skillsField().textContent).toContain('7/8');
  // Loading the editor must never mark the form as having unsaved changes.
  expect(preview()).toContain('|clean');
  // The preview is fed the same array, in the same order, as the chips.
  expect(screen.getByTestId('preview-skills').textContent).toBe(
    SKILLS_3006.join(','),
  );
});

test('adding a skill marks the form dirty and reaches the preview; undoing restores both (A-12)', async () => {
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));
  const input = within(skillsField()).getByRole('textbox');

  fireEvent.change(input, {target: {value: 'Rust'}});
  fireEvent.keyDown(input, {key: 'Enter'});

  expect(skillRemoveLabels()).toEqual(
    [...SKILLS_3006, 'Rust'].map(skill => `Remove ${skill}`),
  );
  expect(skillsField().textContent).toContain('8/8');
  await waitFor(() => expect(preview()).toContain('|dirty'));
  expect(screen.getByTestId('preview-skills').textContent).toBe(
    [...SKILLS_3006, 'Rust'].join(','),
  );

  // Undoing the exact edit returns to the saved array and a clean form.
  fireEvent.click(
    within(skillsField()).getByRole('button', {name: 'Remove Rust'}),
  );
  await waitFor(() => expect(preview()).toContain('|clean'));
  expect(screen.getByTestId('preview-skills').textContent).toBe(
    SKILLS_3006.join(','),
  );
});

test('dirty edits survive the editor remounting (Content -> Appearance -> Content)', async () => {
  renderRemountableProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  const bio = screen.getByLabelText('Short bio') as HTMLTextAreaElement;
  fireEvent.change(bio, {target: {value: 'XY'}});
  await waitFor(() => expect(preview()).toBe('XY|dirty'));

  // The tab switch unmounts the editor and builds a fresh form from the
  // store. The draft's value must persist — and so must the dirty flag the
  // Save button and the leave-warning read, because the values still differ
  // from the last saved config.
  fireEvent.click(screen.getByTestId('remount-editor'));

  const remountedBio = (await screen.findByLabelText(
    'Short bio',
  )) as HTMLTextAreaElement;
  expect(remountedBio.value).toBe('XY');
  await waitFor(() => expect(preview()).toBe('XY|dirty'));

  // Undoing back to the saved value after the remount is clean again.
  fireEvent.change(remountedBio, {target: {value: ''}});
  await waitFor(() => expect(preview()).toBe('|clean'));
});

test('remounting without edits keeps the form clean with real-shaped config', async () => {
  renderRemountableProfileEditor(REAL_BIOLINK);
  fireEvent.click(triggerByName('Profile'));

  await waitFor(() => expect(preview()).toContain('|clean'));

  // Tab switch with zero user edits: the pushed config from the first mount
  // feeds the remounted form's values, and they must still compare clean
  // against the saved baseline.
  fireEvent.click(screen.getByTestId('remount-editor'));

  await screen.findByLabelText('Short bio');
  // Give the push effect and any query settling time to (wrongly) flip the
  // flag, then assert the form never reported unsaved changes.
  await new Promise(resolve => setTimeout(resolve, 50));
  expect(preview()).toContain('|clean');
});

test('opening the About tab on a pristine form keeps it clean (rebase vs mount re-seed)', async () => {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const biolink = {
    ...REAL_BIOLINK,
    profile_config: {
      ...REAL_BIOLINK.profile_config,
      // TipTap's canonical serialization of this content differs byte-wise
      // from renderAboutHtml's output (attribute order), so the mount-time
      // rebase has real work to do.
      about_html: STORE_3006_ABOUT_HTML,
    },
  };
  render(
    <QueryClientProvider client={queryClient}>
      <BiolinkEditorStoreProvider data={biolink}>
        <PreviewProbe />
        <CreatorProfileEditor tab="about" />
      </BiolinkEditorStoreProvider>
    </QueryClientProvider>,
  );

  await screen.findByRole('toolbar');
  // Guard: a pristine form must stay clean after About mounts. jsdom creates
  // TipTap asynchronously (after this mount's re-seed), so the Chrome-only
  // ordering — child rebase during render, then the parent re-seed with
  // keepDefaultValues clobbering its values, leaving about_html permanently
  // dirty (Save glowed with zero edits) — does not reproduce here; the true
  // repro and the RED/GREEN evidence live in the browser bisect probe
  // (S2/S3/S5/S7 wrongly enabled on pre-fix code).
  await waitFor(
    () => expect(preview()).toContain('|clean'),
    {timeout: 3000},
  );
});

test('content sections use the divider-list variant, not separated cards', () => {
  renderProfileEditor();
  const root = document.querySelector('[data-slot="accordion"]');
  // The accordion sits inside the section's card pane: separated items would
  // be rounded bordered cards inside that card (nested cards). The default
  // variant renders divider rows instead.
  expect(root?.getAttribute('data-variant')).toBe('default');
});

test('content sections start collapsed (nothing open by default)', () => {
  renderProfileEditor();
  for (const name of ['Profile', 'Social links', 'Actions', 'Products']) {
    expect(triggerByName(name).getAttribute('aria-expanded')).toBe('false');
  }
});

test('filled cover and avatar tiles stay on dashboard chrome', () => {
  // REAL_BIOLINK has both images, so the filled shells render. The avatar
  // field is the grid's auto track: without the max-w clamp the "size-22"
  // tile stretched to the upload hint's text width — a full-width pill —
  // and that wide auto track squeezed the Display name / Profile title
  // column to ~190px. The cover is the banner: full column width, with
  // the tile's inline 3:1 aspect-ratio driving its height.
  renderProfileEditor('content', REAL_BIOLINK);
  fireEvent.click(triggerByName('Profile'));

  const coverField = document.querySelector('[data-field-name="cover_url"]')!;
  const coverTile = coverField.querySelector('div.group.relative')!;
  expect(coverTile.classList.contains('rounded-input')).toBe(true);
  expect(coverTile.classList.contains('rounded-4xl')).toBe(false);
  expect(coverTile.classList.contains('w-full')).toBe(true);
  expect(coverTile.classList.contains('h-28')).toBe(false);
  expect(coverTile.classList.contains('max-w-[22.5rem]')).toBe(false);
  expect(coverTile.style.aspectRatio).toBe('3 / 1');

  const avatarField = document.querySelector('[data-field-name="avatar_url"]')!;
  expect(avatarField.classList.contains('max-w-56')).toBe(true);
  const avatarTile = avatarField.querySelector('div.group.relative')!;
  expect(avatarTile.classList.contains('size-22')).toBe(true);
  expect(avatarTile.classList.contains('max-w-22')).toBe(true);

  // Dashboard chrome: no storefront surface token anywhere in the tiles.
  expect(coverField.innerHTML).not.toContain('--biolink-');
  expect(avatarField.innerHTML).not.toContain('--biolink-');
});

test('empty profile photo shows an icon dropzone sized to the tile', () => {
  // BIOLINK has no avatar: the circle placeholder must not render the long
  // dropzone sentence inside an 88px tile (it overflowed the circle).
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  const avatarField = document.querySelector('[data-field-name="avatar_url"]')!;
  const button = avatarField.querySelector(
    'button:not([data-slot="popover-trigger"])',
  )!;
  expect(button.classList.contains('rounded-full')).toBe(true);
  expect(button.classList.contains('size-22')).toBe(true);
  expect(button.classList.contains('max-w-22')).toBe(true);
  expect(button.textContent ?? '').not.toContain('Select file to upload');
  expect(button.querySelector('svg')).not.toBeNull();
});

test('empty cover shows a rectangular banner placeholder', () => {
  // BIOLINK has no cover: the placeholder is the banner's own 3:1 box
  // with a compact icon affordance — the generic dropzone sentence reads
  // wrong at banner scale.
  renderProfileEditor();
  fireEvent.click(triggerByName('Profile'));

  const coverField = document.querySelector('[data-field-name="cover_url"]')!;
  const button = coverField.querySelector(
    'button:not([data-slot="popover-trigger"])',
  )!;
  expect(button.classList.contains('rounded-input')).toBe(true);
  expect(button.classList.contains('w-full')).toBe(true);
  expect(button.style.aspectRatio).toBe('3 / 1');
  expect(button.textContent ?? '').toContain('Add a cover image');
  expect(button.textContent ?? '').not.toContain('Select file to upload');
  expect(button.querySelector('svg')).not.toBeNull();
});

test('long descriptions become label help popovers', async () => {
  // The upload rules and field explanations live behind hover/focus help
  // popovers at the label instead of muted description lines, which kept
  // the form visually noisy.
  renderProfileEditor('content', REAL_BIOLINK);
  fireEvent.click(triggerByName('Profile'));

  expect(screen.queryByText(/JPG, PNG, or WebP/)).toBeNull();
  expect(
    screen.queryByText('Choose the professional title shown below your name.'),
  ).toBeNull();
  expect(
    screen.queryByText('A short introduction to your work and audience.'),
  ).toBeNull();
  expect(
    screen.queryByText('Separate skills with commas. The first eight are shown.'),
  ).toBeNull();

  // Exactly one help trigger beside every label that used to carry one.
  for (const fieldName of [
    'cover_url',
    'avatar_url',
    'profile_title',
    'bio',
    'skills',
    'available_for_work',
  ]) {
    const field = document.querySelector(`[data-field-name="${fieldName}"]`)!;
    expect(field.querySelectorAll('[data-slot="popover-trigger"]').length).toBe(
      1,
    );
  }

  // The trigger opens the rules in a popover.
  const coverTrigger = document.querySelector(
    '[data-field-name="cover_url"] [data-slot="popover-trigger"]',
  )!;
  fireEvent.click(coverTrigger);
  await waitFor(() => {
    expect(screen.getByText(/JPG, PNG, or WebP/)).toBeTruthy();
  });
});

test('the Content heading carries a muted description', () => {
  renderProfileEditor();
  const description = screen.getByText('Manage what appears on your profile.');
  expect(description.className).toContain('text-muted-foreground');
});

test('About tab drops the redundant About content field label (heading labels it)', () => {
  renderProfileEditor('about');

  expect(screen.queryByText('About content')).toBeNull();
  expect(screen.getByRole('heading', {level: 2, name: 'About'})).toBeTruthy();
});

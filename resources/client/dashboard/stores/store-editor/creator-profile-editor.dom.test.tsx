/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {expect, test, vi} from 'vitest';

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

function renderProfileEditor() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BiolinkEditorStoreProvider data={BIOLINK}>
        <PreviewProbe />
        <CreatorProfileEditor />
      </BiolinkEditorStoreProvider>
    </QueryClientProvider>,
  );
}

const preview = () => screen.getByTestId('preview').textContent;

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
    'Feature up to six Digital Products.',
  );
  await waitFor(() => {
    expect(describedTexts(products)).toContain('2 of 6 products featured');
  });
});

test('reverting every edit pushes the saved value back to the preview (A-05)', async () => {
  renderProfileEditor();

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

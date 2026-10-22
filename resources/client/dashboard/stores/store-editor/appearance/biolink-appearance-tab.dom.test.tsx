/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';

import {BiolinkEditorStoreProvider} from '../biolink-editor-store';
import {Component as AppearanceTab} from './biolink-appearance-tab';

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({biolink: null}),
}));

vi.mock('@ui/themes/use-is-dark-mode', () => ({
  useIsDarkMode: () => false,
}));

const BIOLINK = {
  id: 5,
  name: 'Nathanael Yitbarek',
  back_half: 'nate',
  builder_mode: 'creator_profile',
  content: [],
  appearance: null,
  profile_config: {},
} as any;

function renderAppearanceTab() {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BiolinkEditorStoreProvider data={BIOLINK}>
        <AppearanceTab />
      </BiolinkEditorStoreProvider>
    </QueryClientProvider>,
  );
}

const trigger = (name: string) => screen.getByRole('button', {name});

test('appearance accordion uses the divider-list variant, not separated cards', () => {
  renderAppearanceTab();
  const root = document.querySelector('[data-slot="accordion"]');
  // The accordion sits inside the section's card pane: separated items would
  // be rounded bordered cards inside that card (nested cards). The default
  // variant renders divider rows instead.
  expect(root?.getAttribute('data-variant')).toBe('default');
});

test('appearance sections start collapsed (single-open default is closed)', () => {
  renderAppearanceTab();
  expect(trigger('Background').getAttribute('aria-expanded')).toBe('false');
  expect(trigger('Buttons').getAttribute('aria-expanded')).toBe('false');
  expect(trigger('Text').getAttribute('aria-expanded')).toBe('false');
});

test('opening one appearance section closes the one already open', () => {
  renderAppearanceTab();
  fireEvent.click(trigger('Background'));
  expect(trigger('Background').getAttribute('aria-expanded')).toBe('true');

  fireEvent.click(trigger('Buttons'));
  expect(trigger('Background').getAttribute('aria-expanded')).toBe('false');
  expect(trigger('Buttons').getAttribute('aria-expanded')).toBe('true');
});

test('appearance row titles use the shared section label (truncating title)', () => {
  renderAppearanceTab();
  const backgroundTrigger = trigger('Background');
  const titleId = backgroundTrigger.getAttribute('aria-labelledby');
  const title = titleId ? document.getElementById(titleId) : null;
  expect(title?.className).toContain('truncate');
});

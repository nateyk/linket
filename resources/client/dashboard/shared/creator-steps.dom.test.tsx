/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {CreatorSteps} from './creator-steps';

const steps = [
  {id: 'details', title: 'Details', description: 'Describe your offer.'},
  {id: 'media', title: 'Media', description: 'Add helpful images.'},
  {id: 'packages', title: 'Packages', description: 'Choose a package.'},
  {id: 'settings', title: 'Settings', description: 'Configure delivery.'},
] as const;

const completed = {
  details: true,
  media: true,
  packages: false,
  settings: false,
};

test('shared navigation connects steps and distinguishes current from complete', () => {
  render(
    <CreatorSteps
      ariaLabel="Creator steps"
      columns="grid-cols-4"
      steps={steps}
      active="media"
      completed={completed}
      onSelect={vi.fn()}
      heading="Service setup"
      progressLabel="Step 2 of 4"
      targetIds={{media: 'service-media'}}
    />,
  );

  const nav = screen.getByRole('navigation', {name: 'Creator steps'});
  expect(nav.getAttribute('data-slot')).toBe('creator-steps');
  expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
  expect(nav.querySelector('ol')?.className).toContain('grid-cols-4');
  expect(nav.querySelector('ol')?.className).toContain('xl:grid-cols-1');
  expect(nav.querySelectorAll('[data-slot="creator-step-connector"]')).toHaveLength(3);
  expect(nav.querySelectorAll('[data-slot="separator"]')).toHaveLength(3);
  expect(within(nav).getByText('Step 2 of 4')).toBeTruthy();

  const active = within(nav).getByRole('button', {name: 'Media, step 2 of 4'});
  expect(active.getAttribute('aria-current')).toBe('step');
  expect(active.getAttribute('data-step-complete')).toBe('true');
  expect(active.getAttribute('aria-controls')).toBe('service-media');
  expect(active.getAttribute('aria-description')).toBe('Complete');
  expect(active.className).toContain('bg-primary/5');
  expect(active.querySelector('[data-slot="creator-step-indicator"]')?.className).toContain('bg-primary');

  const previous = within(nav).getByRole('button', {name: 'Details, step 1 of 4'});
  expect(previous.querySelector('[data-slot="creator-step-indicator"]')?.className).toContain('bg-positive');
  expect(previous.getAttribute('aria-current')).toBeNull();

  const upcoming = within(nav).getByRole('button', {name: 'Packages, step 3 of 4'});
  expect(upcoming.getAttribute('data-step-complete')).toBe('false');
  expect(upcoming.querySelector('[data-slot="creator-step-indicator"]')?.className).toContain('bg-card');
  expect(nav.querySelector('[data-slot="creator-step-description"]')?.className).toContain('xl:block');
});

test('step navigation remains regular keyboard-operated buttons, not tabs', async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <CreatorSteps
      ariaLabel="Product steps"
      columns="grid-cols-5"
      steps={steps}
      active="details"
      completed={completed}
      onSelect={onSelect}
    />,
  );

  const nav = screen.getByRole('navigation', {name: 'Product steps'});
  const destination = within(nav).getByRole('button', {name: 'Settings, step 4 of 4'});
  destination.focus();
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith('settings');
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(nav.querySelector('ol')?.className).toContain('grid-cols-5');
});

/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import type {Store} from '@app/gen/schemas/store';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BiolinkCard} from './stores-page';

const clipboard = vi.hoisted(() => ({copy: vi.fn(() => true)}));
const notifications = vi.hoisted(() => ({success: vi.fn()}));

vi.mock('copy-to-clipboard', () => ({default: clipboard.copy}));
vi.mock('@shadcn/toast/toast', () => ({toast: notifications}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({
    trans: ({message, values}: {message: string; values?: Record<string, string>}) =>
      message.replace(/:(\w+)/g, (_, key: string) => values?.[key] ?? ':' + key),
  }),
}));
vi.mock('@ui/i18n/formatted-number', () => ({
  FormattedNumber: ({value}: {value: number}) => <span>{value}</span>,
}));

const store = {
  id: 9,
  name: 'Nate Anon',
  short_url: 'https://linket.example/novalife',
  clicks_count: 4,
  profile_config: {},
} as Store;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('storefront profile card', () => {
  it('shows the default storefront icon when no avatar is uploaded', () => {
    const {container} = render(
      <BiolinkCard biolink={store} onClick={vi.fn()} onInsights={vi.fn()} />,
    );

    expect(screen.getByRole('listitem')).toBeTruthy();
    expect(container.querySelector('[data-slot="item-media"] img')).toBeNull();
    expect(container.querySelector('.lucide-layout-panel-top')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('clicks')).toBeTruthy();
  });

  it('shows the uploaded image, normalizes storage URLs, and restores the icon if loading fails', () => {
    const {container} = render(
      <BiolinkCard
        biolink={{
          ...store,
          profile_config: {avatar_url: '/storage/creator-avatar.webp'},
        }}
        onClick={vi.fn()}
        onInsights={vi.fn()}
      />,
    );

    const image = container.querySelector('[data-slot="item-media"] img') as HTMLImageElement;
    expect(image).toBeTruthy();
    expect(image.getAttribute('src')).toBe('/storage/creator-avatar.webp');
    expect(image.getAttribute('alt')).toBe('');
    expect(container.querySelector('.lucide-layout-panel-top')).toBeNull();

    fireEvent.error(image);
    expect(container.querySelector('[data-slot="item-media"] img')).toBeNull();
    expect(container.querySelector('.lucide-layout-panel-top')).toBeTruthy();
  });

  it('copies the public profile URL directly without navigating into the editor', () => {
    const edit = vi.fn();
    render(
      <BiolinkCard biolink={store} onClick={edit} onInsights={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Copy link'}));

    expect(clipboard.copy).toHaveBeenCalledWith(store.short_url);
    expect(notifications.success).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', {name: 'Link copied'})).toBeTruthy();
    expect(edit).not.toHaveBeenCalled();
  });

  it('provides a keyboard-focusable edit button and keeps actions separate', () => {
    const edit = vi.fn();
    const {container} = render(
      <BiolinkCard biolink={store} onClick={edit} onInsights={vi.fn()} />,
    );

    const editButton = screen.getByRole('button', {name: 'Edit Nate Anon'});
    expect(editButton.getAttribute('type')).toBe('button');
    fireEvent.click(editButton);
    expect(edit).toHaveBeenCalledOnce();

    fireEvent.click(container.querySelector('[data-slot="item"]') as HTMLElement);
    expect(edit).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', {name: 'Profile actions'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Copy link'})).toBeTruthy();
  });
});

/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import type {Store} from '@app/gen/schemas/store';
import type {ReactNode} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BiolinkCard} from './stores-page';

const clipboard = vi.hoisted(() => ({copy: vi.fn(() => true)}));
const notifications = vi.hoisted(() => ({success: vi.fn()}));

vi.mock('copy-to-clipboard', () => ({default: clipboard.copy}));
vi.mock('@shadcn/toast/toast', () => ({toast: notifications}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, ReactNode>}) => (
    <span>
      {message
        .split(/(:\w+)/g)
        .map(part =>
          part.startsWith(':') ? (values?.[part.slice(1)] ?? part) : part,
        )}
    </span>
  ),
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
    expect(screen.getByText(/clicks/).textContent).toBe('4 clicks');
  });


  it('keeps a stable token border, puts copy beside the URL and styles clicks as a compact pill', () => {
    const {container} = render(
      <BiolinkCard biolink={store} onClick={vi.fn()} onInsights={vi.fn()} />,
    );

    const card = screen.getByRole('listitem');
    expect(card.className).toContain('border-border');
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('rounded-card');
    expect(card.className).toContain('transition-shadow');
    expect(card.className).toContain('duration-100');
    expect(card.className).toContain('motion-reduce:transition-none');
    expect(card.className).not.toContain('cursor-pointer');
    // Shared Item styles contain nested-anchor hover rules; only a subtle
    // shadow changes on card hover, not its background or outline.
    const cardHoverClasses = card.className
      .split(/\s+/)
      .filter(className => className.startsWith('hover:'));
    expect(cardHoverClasses).toEqual(['hover:shadow-sm']);
    const copyButton = screen.getByRole('button', {name: 'Copy link'});
    const urlGroup = container.querySelector('[data-slot="profile-url"]') as HTMLElement;
    expect(urlGroup).toBeTruthy();
    expect(urlGroup.className).toContain('inline-flex');
    expect(urlGroup.className).toContain('w-fit');
    expect(urlGroup.className).toContain('max-w-full');
    expect(urlGroup.className).not.toContain('flex-1');
    expect(copyButton.parentElement).toBe(urlGroup);
    expect(copyButton.closest('[data-slot="item-row"]')).toBeTruthy();
    const actions = container.querySelector('[data-slot="item-actions"]') as HTMLElement;
    expect(actions.contains(copyButton)).toBe(false);
    expect(actions.className).toContain('basis-full');
    expect(actions.className).toContain('justify-end');
    expect(actions.className).not.toContain('justify-between');
    expect(actions.className).toContain('min-[480px]:basis-auto');
    expect(actions.className).toContain('min-[480px]:w-auto');
    expect(actions.className).toContain('min-[480px]:ms-auto');
    expect(actions.className).toContain('gap-1.5');
    const count = screen.getByText(/clicks/).closest('.rounded-full') as HTMLElement;
    expect(count).toBeTruthy();
    expect(count.className).toContain('border-border');
    expect(count.className).toContain('bg-background');
    expect(count.textContent).toBe('4 clicks');
  });


  it('uses larger mobile icon targets while keeping copy and menu distinct', () => {
    const {container} = render(
      <BiolinkCard biolink={store} onClick={vi.fn()} onInsights={vi.fn()} />,
    );
    const copy = screen.getByRole('button', {name: 'Copy link'});
    const menu = screen.getByRole('button', {name: 'Profile actions'});
    const actions = container.querySelector('[data-slot="item-actions"]') as HTMLElement;

    expect(copy.className).toContain('size-10');
    expect(copy.className).toContain('sm:size-8');
    expect(menu.className).toContain('size-10');
    expect(menu.className).toContain('sm:size-8');
    expect(copy.closest('[data-slot="profile-url"]')).toBeTruthy();
    expect(actions.contains(copy)).toBe(false);
    expect(actions.contains(menu)).toBe(true);
  });

  it('does not hide the copy action when the URL needs truncation', () => {
    const longUrl = 'https://linket.example/' + 'very-long-segment-'.repeat(20);
    const {container} = render(
      <BiolinkCard
        biolink={{...store, short_url: longUrl}}
        onClick={vi.fn()}
        onInsights={vi.fn()}
      />,
    );

    const group = container.querySelector('[data-slot="profile-url"]') as HTMLElement;
    const url = group.querySelector('.truncate');
    expect(url?.textContent).toContain('very-long-segment-');
    expect(url?.className).toContain('min-w-0');
    expect(group.className).toContain('max-w-full');
    expect(screen.getByRole('button', {name: 'Copy link'}).parentElement).toBe(group);
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

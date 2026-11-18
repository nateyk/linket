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
  unique_visitors_count: 2,
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
    expect(screen.getByRole('button', {name: '4 clicks'}).textContent).toBe('4');
    expect(screen.queryByText(/unique IPs/)).toBeNull();
  });


  it('keeps unique-IP statistics off the card even when unavailable', () => {
    render(
      <BiolinkCard
        biolink={{...store, unique_visitors_count: undefined}}
        onClick={vi.fn()}
        onInsights={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: '4 clicks'}).textContent).toBe('4');
    expect(screen.queryByText(/unique IPs/)).toBeNull();
  });

  it('keeps the compact card in one row with a clickable URL and token border', () => {
    const {container} = render(
      <BiolinkCard biolink={store} onClick={vi.fn()} onInsights={vi.fn()} />,
    );

    const card = screen.getByRole('listitem');
    expect(card.className).toContain('border-border');
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('rounded-card');
    expect(card.className).toContain('flex-nowrap');
    expect(card.getAttribute('data-size')).toBe('xs');
    expect(card.className).toContain('motion-reduce:transition-none');
    expect(card.className).not.toContain('cursor-pointer');
    const cardHoverClasses = card.className
      .split(/\s+/)
      .filter(className => className.startsWith('hover:'));
    expect(cardHoverClasses).toEqual(['hover:shadow-sm']);

    const url = screen.getByRole('link', {name: 'linket.example/novalife'});
    expect(url.getAttribute('href')).toBe(store.short_url);
    expect(url.getAttribute('target')).toBe('_blank');
    expect(url.getAttribute('rel')).toContain('noopener');
    expect(url.className).toContain('truncate');
    expect(screen.queryByRole('button', {name: 'Copy link'})).toBeNull();

    const actions = container.querySelector('[data-slot="item-actions"]') as HTMLElement;
    expect(actions.className).toContain('shrink-0');
    expect(actions.className).not.toContain('basis-full');
    const count = screen.getByRole('button', {name: '4 clicks'});
    expect(actions.contains(count)).toBe(true);
    expect(count.className).toContain('rounded-full');
    expect(count.className).toContain('border-border');
    expect(count.textContent).toBe('4');
    const menu = screen.getByRole('button', {name: 'Profile actions'});
    expect(actions.contains(menu)).toBe(true);
    expect(menu.className).toContain('size-10');
  });

  it('truncates a long URL without moving the actions below the card', () => {
    const longUrl = 'https://linket.example/' + 'very-long-segment-'.repeat(20);
    const {container} = render(
      <BiolinkCard
        biolink={{...store, short_url: longUrl}}
        onClick={vi.fn()}
        onInsights={vi.fn()}
      />,
    );
    const url = screen.getByRole('link');
    expect(url.getAttribute('href')).toBe(longUrl);
    expect(url.className).toContain('min-w-0');
    expect(url.className).toContain('truncate');
    expect(container.querySelector('[data-slot="item-content"]')?.className).toContain('min-w-0');
    expect(screen.getByRole('button', {name: 'Profile actions'})).toBeTruthy();
  });

  it('opens insights from the click count without opening the editor', () => {
    const edit = vi.fn();
    const insights = vi.fn();
    render(<BiolinkCard biolink={store} onClick={edit} onInsights={insights} />);
    fireEvent.click(screen.getByRole('button', {name: '4 clicks'}));
    expect(insights).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
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

  it('copies the public profile URL from the menu without navigating into the editor', async () => {
    const edit = vi.fn();
    render(
      <BiolinkCard biolink={store} onClick={edit} onInsights={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Profile actions'}));
    fireEvent.click(await screen.findByRole('menuitem', {name: 'Copy link'}));

    expect(clipboard.copy).toHaveBeenCalledWith(store.short_url);
    expect(notifications.success).toHaveBeenCalledOnce();
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
    expect(screen.getByRole('link', {name: 'linket.example/novalife'})).toBeTruthy();
  });
});

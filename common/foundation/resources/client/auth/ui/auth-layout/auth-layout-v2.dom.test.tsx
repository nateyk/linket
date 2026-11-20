/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, test, vi} from 'vitest';
import {AuthLayoutV2} from './auth-layout-v2';

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {
      site_name: 'Linket',
      logo_light: '/brand-light.svg',
      logo_dark: '/brand-dark.svg',
    },
  }),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@common/locale-switcher/locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">Choose language</button>,
}));
afterEach(() => cleanup());

function renderAuth(audience?: 'creator' | 'portal', topAction?: React.ReactNode) {
  return render(
    <AuthLayoutV2 audience={audience} topAction={topAction}>
      <form aria-label="Auth form">
        <input aria-label="Email" type="email" />
        <button type="submit">Continue</button>
      </form>
    </AuthLayoutV2>,
  );
}

test('creator auth keeps its form and locale without duplicate brand logos', () => {
  const {container} = renderAuth();
  expect(screen.getByRole('form', {name: 'Auth form'})).toBeTruthy();
  expect(screen.getByRole('heading', {name: 'A simpler way to sell what you create.'})).toBeTruthy();
  expect(screen.getByText('Your brand. Your storefront. Your business.')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Choose language'})).toBeTruthy();
  expect(container.querySelector('header')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('main')?.className).toContain('min-h-svh');
  expect(container.querySelector('aside')?.className).not.toContain('bg-primary');
  expect(container.querySelector('aside')?.textContent).not.toContain('Linket');
});

test('right hero uses five-layer starfield instead of static grid or store icon', () => {
  const {container} = renderAuth();
  const aside = container.querySelector('aside');
  const stars = aside?.querySelector('[data-slot="starfield"]');
  expect(stars).toBeTruthy();
  expect(stars?.getAttribute('class')).toContain('pointer-events-none');
  expect(stars?.querySelectorAll('.auth-starfield-layer').length).toBe(5);
  expect(stars?.querySelectorAll('circle').length).toBe(90);
  expect(stars?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  expect(aside?.querySelector('header')).toBeNull();
  expect(aside?.className).toContain('bg-muted/35');
  expect(aside?.querySelector('.bg-primary')).toBeTruthy();
});

test('buyer recovery shares the starfield without creator-focused text', () => {
  const {container} = renderAuth('portal');
  expect(screen.getByRole('heading', {name: 'Your purchases, all in one place.'})).toBeTruthy();
  expect(screen.getByText('Your purchases are protected by email verification.')).toBeTruthy();
  expect(screen.queryByText('A simpler way to sell what you create.')).toBeNull();
  expect(container.querySelector('[data-slot="starfield"]')).toBeTruthy();
});

test('optional header action remains accessible without bringing back a logo', () => {
  const {container} = renderAuth('creator', <a href="/help">Help</a>);
  expect(screen.getByRole('link', {name: 'Help'})).toBeTruthy();
  expect(container.querySelector('header')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
});

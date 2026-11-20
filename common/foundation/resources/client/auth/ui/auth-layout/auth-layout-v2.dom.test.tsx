/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {AuthLayoutV2} from './auth-layout-v2';

const brandingState = vi.hoisted(() => ({
  dark: false,
  siteName: 'Linket',
  lightLogo: '/brand-light.svg',
  darkLogo: '/brand-dark.svg',
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {
      site_name: brandingState.siteName,
      logo_light: brandingState.lightLogo,
      logo_dark: brandingState.darkLogo,
    },
  }),
}));
vi.mock('@ui/themes/use-is-dark-mode', () => ({
  useIsDarkMode: () => brandingState.dark,
}));
vi.mock('@ui/utils/urls/get-asset-url', () => ({
  getAssetUrl: (value: string) => value,
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@common/locale-switcher/locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">Choose language</button>,
}));

beforeEach(() => {
  brandingState.dark = false;
  brandingState.siteName = 'Linket';
  brandingState.lightLogo = '/brand-light.svg';
  brandingState.darkLogo = '/brand-dark.svg';
});
afterEach(() => cleanup());

function renderAuth(audience?: 'creator' | 'portal', topAction?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthLayoutV2 audience={audience} topAction={topAction}>
        <form aria-label="Auth form">
          <input aria-label="Email" type="email" />
          <button type="submit">Continue</button>
        </form>
      </AuthLayoutV2>
    </MemoryRouter>,
  );
}

test('creator auth keeps form, brand logo and real locale control in a compact responsive shell', () => {
  const {container} = renderAuth();
  expect(screen.getByRole('form', {name: 'Auth form'})).toBeTruthy();
  expect(screen.getByRole('heading', {name: 'A simpler way to sell what you create.'})).toBeTruthy();
  expect(screen.getByText('Your brand. Your storefront. Your business.')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Choose language'})).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Linket'}).querySelector('img')?.getAttribute('src')).toBe('/brand-dark.svg');
  expect(container.querySelector('main')?.className).toContain('min-h-svh');
  expect(container.querySelector('aside')?.className).toContain('bg-muted/35');
  expect(container.querySelector('aside')?.className).not.toContain('bg-primary');
});

test('buyer recovery layout uses purchase-specific messaging without creator sales copy', () => {
  renderAuth('portal');
  expect(screen.getByRole('heading', {name: 'Your purchases, all in one place.'})).toBeTruthy();
  expect(screen.getByText('Your purchases are protected by email verification.')).toBeTruthy();
  expect(screen.queryByText('A simpler way to sell what you create.')).toBeNull();
});

test('dark theme uses light brand asset and an optional header action', () => {
  brandingState.dark = true;
  renderAuth('creator', <a href="/help">Help</a>);
  expect(screen.getByRole('link', {name: 'Linket'}).querySelector('img')?.getAttribute('src')).toBe('/brand-light.svg');
  expect(screen.getByRole('link', {name: 'Help'})).toBeTruthy();
});

test('brand name replaces missing logo rather than leaving an empty header', () => {
  brandingState.darkLogo = '';
  renderAuth();
  expect(screen.getByRole('link', {name: 'Linket'}).textContent).toBe('Linket');
});

/**
 * @vitest-environment jsdom
 */
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ReactElement} from 'react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {Header} from './header';

function renderWithProviders(ui: ReactElement, initialEntries = ['/']) {
  return render(
    <ColorSchemeContext.Provider
      value={{colorScheme: 'light', setColorScheme: vi.fn()}}
    >
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ColorSchemeContext.Provider>,
  );
}

const authState = vi.hoisted(() => ({
  isLoggedIn: false,
  user: null as null | {id: number; name: string; image?: string | null},
  redirectUri: '/dashboard',
}));

const settingsState = vi.hoisted(() => ({
  registrationDisable: false,
  userChangeTheme: true,
}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({
    isLoggedIn: authState.isLoggedIn,
    user: authState.user,
    getRedirectUri: () => authState.redirectUri,
  }),
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {
      site_name: 'Linket',
      logo_dark: 'images/logo-dark.svg',
      logo_light: 'images/logo-light.svg',
      logo_dark_mobile: 'images/mobile-logo-dark.svg',
      logo_light_mobile: 'images/mobile-logo-light.svg',
    },
    registration: {disable: settingsState.registrationDisable},
    themes: {user_change: settingsState.userChangeTheme},
  }),
}));

vi.mock('@ui/bootstrap-data/bootstrap-data-store', async importOriginal => {
  const actual =
    await importOriginal<
      typeof import('@ui/bootstrap-data/bootstrap-data-store')
    >();
  return {
    ...actual,
    getBootstrapData: () => ({
      settings: {base_url: 'https://linket.test', asset_url: ''},
    }),
  };
});

vi.mock('@common/ui/navigation/navbar/navbar-color-scheme-toggle', () => ({
  NavbarColorSchemeToggle: () => (
    <button type="button" aria-label="Switch to dark mode" />
  ),
}));

vi.mock('@common/ui/navigation/navbar/navbar-auth-user', () => ({
  NavbarAuthUser: () => <button type="button">Account menu</button>,
}));

beforeEach(() => {
  authState.isLoggedIn = false;
  authState.user = null;
  authState.redirectUri = '/dashboard';
  settingsState.registrationDisable = false;
  settingsState.userChangeTheme = true;
});

afterEach(cleanup);

describe('Linket landing Header', () => {
  test('renders structured Product & Resources dropdowns and guest CTAs', () => {
    const sections = [
      {
        name: 'feature-with-screenshot',
        title: "Not just a bio page. Your own corner of the internet.",
        mediaVariant: 'browser',
      },
      {
        name: 'features-grid',
        title: 'Sell more than just downloads',
        presentation: 'catalog',
      },
      {
        name: 'pricing',
        title: 'Start free. Grow at your own pace.',
      },
    ];
    const anchors = ['storefront-corner', 'sell-more', undefined];

    renderWithProviders(<Header sections={sections} anchors={anchors} />, ['/']);

    expect(screen.getByRole('button', {name: /Product/i})).toBeTruthy();
    expect(screen.getByRole('button', {name: /Resources/i})).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Pricing'}).getAttribute('href')).toBe(
      '#pricing-section',
    );
    expect(screen.getByRole('link', {name: 'Contact'}).getAttribute('href')).toBe(
      '/contact',
    );
    expect(
      screen.getByRole('link', {name: /Storefront Builder/i}).getAttribute('href'),
    ).toBe('#storefront-corner');
    expect(
      screen
        .getByRole('link', {name: /Digital Products & Courses/i})
        .getAttribute('href'),
    ).toBe('#sell-more');
    expect(
      screen.getByRole('link', {name: /Help Center/i}).getAttribute('href'),
    ).toBe('/hc');
    expect(screen.getByRole('link', {name: 'Sign in'}).getAttribute('href')).toBe(
      '/login',
    );
    expect(
      screen.getByRole('link', {name: 'Get started'}).getAttribute('href'),
    ).toBe('/register');
    expect(screen.queryByRole('link', {name: 'Dashboard'})).toBeNull();
  });

  test('routes Pricing to /pricing and marks the active route off-landing', () => {
    renderWithProviders(<Header />, ['/pricing']);

    const pricingLink = screen.getByRole('link', {name: 'Pricing'});
    expect(pricingLink.getAttribute('href')).toBe('/pricing');
    expect(pricingLink.getAttribute('aria-current')).toBe('page');
  });

  test('shows Dashboard and user account trigger when authenticated', () => {
    authState.isLoggedIn = true;
    authState.user = {id: 1, name: 'Abebe'};

    renderWithProviders(<Header />, ['/blog']);

    expect(
      screen.getByRole('link', {name: 'Dashboard'}).getAttribute('href'),
    ).toBe('/dashboard');
    expect(screen.getByRole('button', {name: 'Account menu'})).toBeTruthy();
    expect(screen.queryByRole('link', {name: 'Sign in'})).toBeNull();
    expect(screen.queryByRole('link', {name: 'Get started'})).toBeNull();
  });

  test('opens half-width mobile drawer with expanded Product section and no footer extra links', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />, ['/']);

    await user.click(
      screen.getByRole('button', {name: 'Open navigation menu'}),
    );

    const mobileNav = screen.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    expect(mobileNav).toBeTruthy();

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('w-4/5');
    expect(dialog.className).not.toContain('w-full');

    // Product accordion is expanded by default so the mobile drawer is immediately useful.
    const productTrigger = dialog.querySelector(
      'button[data-slot="accordion-trigger"]',
    );
    expect(productTrigger?.getAttribute('aria-expanded')).toBe('true');

    // Secondary legal/extra grid was removed as unnecessary mobile clutter.
    expect(screen.queryByRole('link', {name: 'Privacy Policy'})).toBeNull();
    expect(screen.queryByRole('link', {name: 'Terms of Service'})).toBeNull();
  });
});

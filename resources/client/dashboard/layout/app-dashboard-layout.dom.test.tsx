/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, waitFor} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {createMemoryRouter, RouterProvider} from 'react-router';

vi.mock('@common/workspace/workspace-selector', () => ({
  WorkspaceSelector: () => null,
}));

vi.mock('@ui/settings/use-settings', async importOriginal => ({
  ...(await importOriginal<typeof import('@ui/settings/use-settings')>()),
  useSettings: () => ({
    branding: {logo_dark: '', logo_light: '', favicon: ''},
    billing: null,
    menus: [],
  }),
}));

vi.mock('@app/dashboard/layout/sidenav/usage-meter', () => ({
  UsageMeter: () => null,
}));

vi.mock('@app/dashboard/layout/sidenav/compact-usage-trigger', () => ({
  CompactUsageTrigger: () => null,
}));

vi.mock('@common/auth/use-auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@common/auth/use-auth')>()),
  useAuth: () => ({
    user: {id: 1, email: 'user@example.com'},
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

import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {Component} from './app-dasbboard-layout';

function renderLayout(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: <Component />,
        children: [
          {path: 'stores/:storeId', element: <div>store editor</div>},
          {path: 'my-products', element: <div>products</div>},
        ],
      },
    ],
    {initialEntries: [initialEntry]},
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteConfigContext.Provider value={{notifications: {}, admin: {ads: []}}}>
        <ColorSchemeContext.Provider
          value={{colorScheme: 'light', setColorScheme: () => {}}}
        >
          <RouterProvider router={router} />
        </ColorSchemeContext.Provider>
      </SiteConfigContext.Provider>
    </QueryClientProvider>,
  );
}

function focusables(): Element[] {
  return Array.from(
    document.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
    ),
  );
}

test('editor pages get exactly one labelled main and a skip link (A-10)', async () => {
  renderLayout('/dashboard/stores/5');

  await waitFor(() => {
    expect(document.querySelectorAll('main')).toHaveLength(1);
  });

  const main = document.querySelector('main')!;
  expect(main.getAttribute('id')).toBe('main-content');
  expect(main.getAttribute('aria-label')).toBe('Store editor');
});

test('non-editor pages still get exactly one unlabelled main (A-10)', async () => {
  renderLayout('/dashboard/my-products');

  await waitFor(() => {
    expect(document.querySelectorAll('main')).toHaveLength(1);
  });

  const main = document.querySelector('main')!;
  expect(main.getAttribute('aria-label')).not.toBe('Store editor');
});

test('the skip link is the first focusable element (A-10)', async () => {
  renderLayout('/dashboard/stores/5');
  await screen.findByRole('banner');

  const skip = document.querySelector('a[href$="#main-content"]');
  expect(skip).toBeTruthy();
  expect(skip!.textContent).toContain('Skip to main content');
  expect(focusables()[0]).toBe(skip);
});

test('skip link resolves against the current path, not a <base> tag (A-10)', async () => {
  // The SPA is served with <base href="/">: a bare "#main-content" would
  // resolve to the site root and Enter would leave the dashboard entirely.
  const base = document.createElement('base');
  base.setAttribute('href', 'https://linket.ddev.site/');
  document.head.appendChild(base);
  try {
    renderLayout('/dashboard/stores/5');
    await screen.findByRole('banner');

    const skip = document.querySelector<HTMLAnchorElement>(
      'a[href$="#main-content"]',
    )!;
    expect(skip).toBeTruthy();
    expect(new URL(skip.href).pathname).toBe('/dashboard/stores/5');
  } finally {
    document.head.removeChild(base);
  }
});

test('top bar is the banner landmark (A-10)', async () => {
  renderLayout('/dashboard/stores/5');

  const banner = await screen.findByRole('banner');
  expect(banner).toBeTruthy();
});

test('sidebar renders as a labelled navigation landmark (A-10)', async () => {
  renderLayout('/dashboard/stores/5');

  await screen.findByRole('banner');
  const sidebar = document.querySelector('[data-slot="sidebar"]');
  expect(sidebar).toBeTruthy();
  expect(sidebar!.tagName).toBe('NAV');
  expect(sidebar!.getAttribute('aria-label')).toBeTruthy();
});

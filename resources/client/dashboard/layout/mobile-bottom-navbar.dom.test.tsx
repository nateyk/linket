/**
 * @vitest-environment jsdom
 */
import {render, screen, within} from '@testing-library/react';
import {expect, test, vi} from 'vitest';
import {createMemoryRouter, RouterProvider} from 'react-router';

import {MobileBottomNavbar} from '@app/dashboard/layout/mobile-bottom-navbar';

const {mobileMenu} = vi.hoisted(() => ({
  mobileMenu: {
    id: 1,
    name: 'Dashboard mobile',
    positions: ['dashboard-mobile'],
    items: [
      {
        id: 'dashboard',
        type: 'route',
        order: 0,
        label: 'Dashboard',
        action: '/dashboard',
      },
      {
        id: 'stores',
        type: 'route',
        order: 1,
        label: 'Stores',
        action: '/dashboard/stores',
      },
      {
        id: 'legacy-stores',
        type: 'route',
        order: 1.5,
        label: 'Legacy Store',
        action: '/dashboard/biolinks',
      },
      {
        id: 'products',
        type: 'route',
        order: 2,
        label: 'Products',
        action: '/dashboard/my-products',
      },
      {
        id: 'payouts',
        type: 'route',
        order: 3,
        label: 'Payouts',
        action: '/dashboard/sales-payouts',
      },
      {
        id: 'services',
        type: 'route',
        order: 4,
        label: 'Services',
        action: '/dashboard/services',
      },
    ],
  },
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({menus: [mobileMenu]}),
}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isLoggedIn: false,
    hasPermission: () => true,
    hasRole: () => true,
  }),
}));

vi.mock('@common/ui/navigation/navbar/navbar-auth-menu', () => ({
  NavbarAuthMenu: () => null,
}));

function renderNavbar(initialPath: string) {
  const router = createMemoryRouter(
    [{path: '*', element: <MobileBottomNavbar />}],
    {initialEntries: [initialPath]},
  );
  return render(<RouterProvider router={router} />);
}

test('bottom navbar is a labelled navigation landmark', async () => {
  renderNavbar('/dashboard');

  const nav = await screen.findByRole('navigation', {
    name: 'Mobile navigation',
  });
  expect(within(nav).getAllByRole('link')).toHaveLength(4);
  expect(within(nav).queryByRole('link', {name: 'Stores'})).toBeNull();
  expect(within(nav).queryByRole('link', {name: 'Legacy Store'})).toBeNull();
});

test('store editor remains reachable elsewhere without activating the bottom bar', async () => {
  renderNavbar('/dashboard/stores/3006');

  const current = document.querySelectorAll('[aria-current="page"]');
  expect([...current].map(link => link.getAttribute('href'))).toEqual([]);
});

test('dashboard link is the only aria-current on the home route', async () => {
  renderNavbar('/dashboard');

  const current = document.querySelectorAll('[aria-current="page"]');
  expect([...current].map(link => link.getAttribute('href'))).toEqual([
    '/dashboard',
  ]);
});

test('remaining destinations share the bar and keep visible focus', async () => {
  // Four route items plus Account fit at equal widths on compact phones.
  // Titles may wrap at spaces but are not clipped mid-word.
  renderNavbar('/dashboard');
  const nav = await screen.findByRole('navigation', {
    name: 'Mobile navigation',
  });

  expect(nav.className).not.toContain('gap-7.5');
  expect(nav.className).toContain('px-2');
  expect(nav.className).toContain('items-start');
  expect(nav.className).toContain('shrink-0');
  expect(nav.className).toContain('bg-background');
  for (const item of nav.querySelectorAll('a, button')) {
    expect(item.className).not.toContain('whitespace-nowrap');
    expect(item.className).not.toContain('shrink-0');
    expect(item.className).toContain('min-w-0');
    expect(item.className).toContain('flex-1');
    expect(item.className).toContain('text-center');
    expect(item.className).toContain('focus-visible:outline-2');
  }
});

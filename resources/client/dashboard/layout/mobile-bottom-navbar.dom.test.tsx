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
});

test('only the current section gets aria-current on nested routes', async () => {
  renderNavbar('/dashboard/stores/3006');

  const current = document.querySelectorAll('[aria-current="page"]');
  expect([...current].map(link => link.getAttribute('href'))).toEqual([
    '/dashboard/stores',
  ]);
});

test('dashboard link is the only aria-current on the home route', async () => {
  renderNavbar('/dashboard');

  const current = document.querySelectorAll('[aria-current="page"]');
  expect([...current].map(link => link.getAttribute('href'))).toEqual([
    '/dashboard',
  ]);
});

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

test('labels wrap to two lines instead of shrinking to clipped stubs', async () => {
  // Six menu labels (~367px) can't fit one line in a 360px bar at any
  // padding: nowrap + shrink-0 let flex squeeze each item below its text
  // width and overflow-hidden center-clipped it ("My Store" -> "Sto",
  // "Home" -> "om"). Wrapping floors each item at its longest word, so
  // nothing is ever cut mid-word; text-center keeps wrapped lines under
  // the icon; items-start keeps the icon row aligned across items whose
  // labels wrapped or didn't.
  renderNavbar('/dashboard');
  const nav = await screen.findByRole('navigation', {
    name: 'Mobile navigation',
  });

  expect(nav.className).not.toContain('gap-7.5');
  expect(nav.className).toContain('px-4');
  expect(nav.className).toContain('items-start');
  for (const item of nav.querySelectorAll('a, button')) {
    expect(item.className).not.toContain('whitespace-nowrap');
    expect(item.className).not.toContain('shrink-0');
    expect(item.className).toContain('text-center');
  }
});

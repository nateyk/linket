/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, within} from '@testing-library/react';
import {type ReactNode, useState} from 'react';
import {Link, MemoryRouter, useLocation} from 'react-router';
import {expect, test, vi} from 'vitest';
import {
  DashboardLayoutContext,
  type DashboardSidebarStatus,
} from './dashboard-layout-context';
import {Sidebar} from './sidebar';

// Drawer animation and pointer behavior are covered by the isolated Chromium
// suite. Here the controlled drawer exposes its open state without transitions.
vi.mock('@shadcn/drawer/drawer', () => ({
  Drawer: {
    Root: ({open, children}: {open: boolean; children: ReactNode}) => (
      <div data-testid="drawer" data-open={String(open)}>{children}</div>
    ),
    Portal: ({children}: {children: ReactNode}) => <>{children}</>,
    Backdrop: () => null,
    Content: ({children}: {children: ReactNode}) => <>{children}</>,
  },
}));

vi.mock('@common/menus/use-custom-menu', () => ({
  useCustomMenu: () => ({
    items: [
      {id: 'support', label: 'Support', action: '/admin/support'},
      {id: 'help', label: 'Help center', action: '/admin/help'},
    ],
  }),
}));

function MobileSidebar({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<DashboardSidebarStatus>('expanded');
  const sidebar = {status, setStatus, toggleStatus: () => {
    setStatus(current => current === 'expanded' ? 'collapsed' : 'expanded');
  }};

  return (
    <DashboardLayoutContext.Provider value={{
      name: 'sidebar-navigation-test',
      isMobileMode: true,
      leftSidebar: sidebar,
      rightSidebar: sidebar,
      defaultSectionVariant: 'floating',
    }}>
      <Sidebar.Root>{children}</Sidebar.Root>
      <button onClick={() => setStatus('expanded')}>Reopen navigation</button>
    </DashboardLayoutContext.Provider>
  );
}

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

test('mobile sidebar closes after a committed route change, not on initial render', () => {
  render(
    <MemoryRouter initialEntries={['/agent/conversations?viewId=all']}>
      <MobileSidebar>
        <Sidebar.MenuFromConfig
          position="admin-sidebar"
          activeOverride={item => item.action === '/admin/support'}
        />
      </MobileSidebar>
      <CurrentLocation />
    </MemoryRouter>,
  );

  const drawer = screen.getByTestId('drawer');
  const nav = within(screen.getByRole('navigation', {name: 'Main navigation'}));
  const support = nav.getByRole('link', {name: 'Support'});
  expect(drawer.getAttribute('data-open')).toBe('true');
  expect(support.getAttribute('aria-current')).toBe('page');
  expect(nav.getByRole('link', {name: 'Help center'}).getAttribute('aria-current')).toBeNull();

  fireEvent.click(support);
  expect(screen.getByTestId('location').textContent).toBe('/admin/support');
  expect(drawer.getAttribute('data-open')).toBe('false');

  fireEvent.click(screen.getByRole('button', {name: 'Reopen navigation'}));
  expect(drawer.getAttribute('data-open')).toBe('true');

  fireEvent.click(nav.getByRole('link', {name: 'Help center'}));
  expect(screen.getByTestId('location').textContent).toBe('/admin/help');
  expect(drawer.getAttribute('data-open')).toBe('false');
});

test('mobile sidebar does not dismiss for an intercepted navigation link', () => {
  render(
    <MemoryRouter initialEntries={['/agent/conversations']}>
      <MobileSidebar>
        <Link to="/admin/support" onClick={event => event.preventDefault()}>
          Intercepted link
        </Link>
      </MobileSidebar>
      <CurrentLocation />
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('link', {name: 'Intercepted link'}));
  expect(screen.getByTestId('location').textContent).toBe('/agent/conversations');
  expect(screen.getByTestId('drawer').getAttribute('data-open')).toBe('true');
});

test('mobile sidebar works without a router and preserves expandable controls', () => {
  render(
    <MobileSidebar>
      <button data-slot="collapsible-trigger">Expand group</button>
      <button data-slot="sidebar-trigger">Toggle navigation</button>
      <button aria-haspopup="menu">Open menu</button>
      <button>Finish action</button>
    </MobileSidebar>,
  );

  const drawer = screen.getByTestId('drawer');
  for (const name of ['Expand group', 'Toggle navigation', 'Open menu']) {
    fireEvent.click(screen.getByRole('button', {name}));
    expect(drawer.getAttribute('data-open')).toBe('true');
  }
  fireEvent.click(screen.getByRole('button', {name: 'Finish action'}));
  expect(drawer.getAttribute('data-open')).toBe('false');
});

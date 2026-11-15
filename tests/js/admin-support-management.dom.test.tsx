/** @vitest-environment jsdom */

import {cleanup, render, screen, within} from '@testing-library/react';
import {cloneElement, type ReactElement, type ReactNode} from 'react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Component} from '@app/admin/support/admin-support-management-page';

const access = vi.hoisted(() => ({allowed: new Set<string>()}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({
    hasPermission: (permission: string) => access.allowed.has(permission),
  }),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/seo/static-page-title', () => ({
  StaticPageTitle: () => null,
}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({
  DashboardLayout: {
    MainSection: ({children}: {children: ReactNode}) => <main>{children}</main>,
    SectionHeader: ({children}: {children: ReactNode}) => <header>{children}</header>,
    SidebarToggle: () => null,
    SectionTitle: ({children}: {children: ReactNode}) => <h1>{children}</h1>,
    SectionContent: ({children}: {children: ReactNode}) => <div>{children}</div>,
  },
}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({
    children,
    render: link,
  }: {
    children: ReactNode;
    render?: ReactElement<{children?: ReactNode}>;
  }) => (link ? cloneElement(link, {}, children) : <button>{children}</button>),
}));

function renderSupport(...permissions: string[]) {
  access.allowed = new Set(permissions);
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

beforeEach(() => access.allowed.clear());
afterEach(() => {
  cleanup();
  access.allowed.clear();
});

describe('admin Support hub DOM authorization', () => {
  it('renders an accessible empty state without leaking restricted actions', () => {
    renderSupport();

    expect(screen.getByRole('heading', {name: 'Support'})).toBeTruthy();
    expect(
      screen.getByText('Your account does not have access to support management tools.'),
    ).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows agent workflows but no customer, team, or report privileges', () => {
    renderSupport('conversations.update');

    const inbox = screen.getByRole('navigation', {
      name: 'Inbox and conversations',
    });
    expect(within(inbox).getAllByRole('link')).toHaveLength(3);
    expect(
      within(inbox).getByRole('link', {name: /All conversations/}).getAttribute('href'),
    ).toBe('/agent/conversations?viewId=all');
    expect(
      screen.getByRole('button', {name: /Open inbox/}).getAttribute('href'),
    ).toBe('/agent/conversations?viewId=all');
    expect(screen.getByRole('link', {name: /Saved replies/})).toBeTruthy();
    expect(screen.queryByRole('link', {name: /Support reports/})).toBeNull();
    expect(screen.queryByRole('link', {name: /Agents and groups/})).toBeNull();
    expect(screen.queryByRole('link', {name: /^Customers/})).toBeNull();
  });

  it('renders report access alone without granting a conversation inbox', () => {
    renderSupport('reports.view');

    const management = screen.getByRole('navigation', {name: 'Manage support'});
    expect(within(management).getAllByRole('link')).toHaveLength(1);
    expect(
      within(management).getByRole('link', {name: /Support reports/}).getAttribute('href'),
    ).toBe('/agent/reports');
    expect(screen.queryByRole('navigation', {name: 'Inbox and conversations'})).toBeNull();
    expect(screen.queryByRole('button', {name: /Open inbox/})).toBeNull();
  });

  it('shows the complete management navigation when every permission is granted', () => {
    renderSupport(
      'conversations.update',
      'articles.update',
      'users.update',
      'agents.update',
      'views.update',
      'reports.view',
      'settings.update',
    );

    expect(
      within(screen.getByRole('navigation', {name: 'Manage support'})).getAllByRole('link'),
    ).toHaveLength(7);
    expect(screen.getByRole('link', {name: /Help Center/}).getAttribute('href')).toBe('/admin/help');
    expect(screen.getByRole('link', {name: /Live chat settings/}).getAttribute('href'))
      .toBe('/admin/settings/livechat');
  });
});

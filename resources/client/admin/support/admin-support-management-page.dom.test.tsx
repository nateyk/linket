/** @vitest-environment jsdom */
import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cloneElement, type ReactElement, type ReactNode} from 'react';
import {Component as AdminSupportManagementPage} from './admin-support-management-page';

const fixture = vi.hoisted(() => ({
  hasPermission: vi.fn<(permission: string) => boolean>(),
}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({hasPermission: fixture.hasPermission}),
}));

vi.mock('@common/seo/static-page-title', () => ({
  StaticPageTitle: () => null,
}));

vi.mock('@common/ui/dashboard/dashboard-layout', () => {
  const Wrapper = ({children}: {children?: ReactNode}) => <div>{children}</div>;
  return {
    DashboardLayout: {
      MainSection: Wrapper,
      SectionHeader: Wrapper,
      SidebarToggle: () => <button aria-label="Toggle sidebar" />,
      SectionTitle: ({children}: {children: ReactNode}) => <h1>{children}</h1>,
      SectionContent: Wrapper,
    },
  };
});

vi.mock('@shadcn/button/button', () => ({
  Button: ({children, render}: {children: ReactNode; render?: ReactElement}) =>
    render ? cloneElement(render, {children} as any) : <button>{children}</button>,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));

vi.mock('react-router', () => ({
  Link: ({to, children, ...props}: {to: string; children: ReactNode}) =>
    <a href={to} {...props}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin Support management page', () => {
  it('renders the admin landing, inbox shortcuts, and direct management links', () => {
    fixture.hasPermission.mockReturnValue(true);
    render(<AdminSupportManagementPage />);

    expect(screen.getByRole('heading', {name: 'Support'})).toBeTruthy();
    const inbox = screen.getByRole('navigation', {name: 'Inbox and conversations'});
    expect(within(inbox).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', {name: /All conversations/}).getAttribute('href'))
      .toBe('/agent/conversations?viewId=all');
    expect(screen.getByRole('link', {name: /Assigned to me/}).getAttribute('href'))
      .toBe('/agent/conversations?viewId=mine');
    expect(screen.getByRole('link', {name: /Search conversations/}).getAttribute('href'))
      .toBe('/agent/conversations/search');

    const management = screen.getByRole('navigation', {name: 'Manage support'});
    expect(within(management).getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('link', {name: /Help Center/}).getAttribute('href'))
      .toBe('/admin/help');
    expect(screen.getByRole('link', {name: /Support reports/}).getAttribute('href'))
      .toBe('/agent/reports');
    expect(screen.getByRole('link', {name: /Live chat settings/}).getAttribute('href'))
      .toBe('/admin/settings/livechat');
  });

  it('keeps inbox controls hidden when support conversation access is denied', () => {
    fixture.hasPermission.mockImplementation(permission => permission === 'articles.update');
    render(<AdminSupportManagementPage />);

    expect(screen.queryByRole('navigation', {name: 'Inbox and conversations'})).toBeNull();
    expect(screen.queryByRole('link', {name: 'Open inbox'})).toBeNull();
    const management = screen.getByRole('navigation', {name: 'Manage support'});
    expect(within(management).getAllByRole('link')).toHaveLength(1);
    expect(within(management).getByRole('link', {name: /Help Center/})).toBeTruthy();
  });

  it('shows the empty-permissions explanation instead of unauthorized navigation', () => {
    fixture.hasPermission.mockReturnValue(false);
    render(<AdminSupportManagementPage />);

    expect(screen.queryAllByRole('navigation')).toHaveLength(0);
    expect(screen.queryByRole('link', {name: /inbox/i})).toBeNull();
    expect(screen.getByText('Your account does not have access to support management tools.'))
      .toBeTruthy();
  });

  it('renders the inbox and saved replies without admin-only management links', () => {
    fixture.hasPermission.mockImplementation(permission => permission === 'conversations.update');
    render(<AdminSupportManagementPage />);

    expect(screen.getByRole('link', {name: /All conversations/})).toBeTruthy();
    expect(screen.getByRole('link', {name: /Saved replies/})).toBeTruthy();
    expect(screen.queryByRole('link', {name: /Help Center/})).toBeNull();
    expect(screen.queryByRole('link', {name: /Agents and groups/})).toBeNull();
  });
});

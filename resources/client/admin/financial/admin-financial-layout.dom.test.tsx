/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component as AdminFinancialLayout} from './admin-financial-layout';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@common/seo/static-page-title', () => ({
  StaticPageTitle: ({children}: any) => <>{children}</>,
}));

vi.mock('@ui/utils/hooks/is-mobile-media-query', () => ({
  useIsMobileMediaQuery: () => false,
}));

let currentPath = '/admin/financial/general';

vi.mock('react-router', () => ({
  useLocation: () => ({pathname: currentPath}),
  useNavigate: () => vi.fn(),
  NavLink: ({to, children, className}: any) => {
    const isActive = to === currentPath;
    const computedClass = typeof className === 'function' ? className({isActive}) : className;
    return (
      <a href={to} data-active={isActive} className={computedClass}>
        {children}
      </a>
    );
  },
  Outlet: () => <div data-testid="financial-outlet">Child Content</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  currentPath = '/admin/financial/general';
});

describe('AdminFinancialLayout', () => {
  const renderLayout = () =>
    render(
      <DashboardLayoutContextProvider name="admin">
        {() => <AdminFinancialLayout />}
      </DashboardLayoutContextProvider>,
    );

  it('renders the secondary sidebar with all financial sub-navigation items and child outlet', () => {
    renderLayout();

    // Section title
    expect(screen.getAllByText('Financial').length).toBeGreaterThanOrEqual(1);

    // Secondary navigation items
    expect(screen.getByText('General defaults')).toBeTruthy();
    expect(screen.getByText('Payment gateways')).toBeTruthy();
    expect(screen.getByText('Receiving accounts')).toBeTruthy();
    expect(screen.getByText('Withdrawals')).toBeTruthy();
    expect(screen.getByText('Payment activity')).toBeTruthy();
    expect(screen.getByText('Withdrawal methods')).toBeTruthy();
    expect(screen.getByText('Ledger & reconciliation')).toBeTruthy();

    // Child content rendered in outlet
    expect(screen.getByTestId('financial-outlet')).toBeTruthy();
  });

  it('highlights the active navigation link based on current path', () => {
    currentPath = '/admin/financial/payment-gateways';
    renderLayout();

    const gatewaysLink = screen.getByText('Payment gateways').closest('a');
    expect(gatewaysLink).toBeTruthy();
    expect(gatewaysLink?.getAttribute('data-active')).toBe('true');

    const generalLink = screen.getByText('General defaults').closest('a');
    expect(generalLink?.getAttribute('data-active')).toBe('false');
  });
});

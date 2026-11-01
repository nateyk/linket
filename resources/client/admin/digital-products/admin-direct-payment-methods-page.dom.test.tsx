/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Component} from './admin-direct-payment-methods-page';

const navigate = vi.hoisted(() => vi.fn());
let params = new URLSearchParams();

vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({DashboardLayout: {MainSection: 'main', SectionHeader: 'header', SidebarToggle: 'span', SectionTitle: 'h1', SectionContent: 'section'}}));
vi.mock('react-router', () => ({
  useSearchParams: () => [params, vi.fn()],
  useNavigate: () => navigate,
}));
vi.mock('./verify-et-settings-panel', () => ({VerifyEtSettingsPanel: () => <div>Verify.et connection</div>}));
vi.mock('./verify-et-method-catalog', () => ({VerifyEtMethodCatalog: () => <div>Methods catalog</div>}));

afterEach(() => { cleanup(); vi.clearAllMocks(); params = new URLSearchParams(); });

describe('admin payment gateways page', () => {
  it('shows payment method configuration without a receiving-account reviews tab', async () => {
    render(<Component />);
    expect(await screen.findByText('Payment gateways')).toBeTruthy();
    expect(screen.getByText('Methods catalog')).toBeTruthy();
    expect(screen.getByText('Verify.et connection')).toBeTruthy();
    expect(screen.queryByText('Receiving account reviews')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects legacy review links to creators and keeps search and lifecycle', () => {
    params = new URLSearchParams('search=admin%40admin.com&lifecycle=pending_ownership_review');
    render(<Component />);
    expect(navigate).toHaveBeenCalledWith(
      '/admin/financial/withdrawal-methods?search=admin%40admin.com&lifecycle=pending_ownership_review',
      {replace: true},
    );
  });
});

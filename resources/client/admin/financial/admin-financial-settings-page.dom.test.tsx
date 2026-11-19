/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component} from './admin-financial-settings-page';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn(), put: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => <span>{message}</span>}));
vi.mock('@ui/i18n/format-money', () => ({formatMoney: (cents: number) => String(cents / 100)}));
vi.mock('react-router', () => ({Link: ({to, children}: any) => <a href={to}>{children}</a>}));

const merchant = {
  active_mode: 'test', api_version: 'v1', checkout_enabled: true,
  live_switch_allowed: true, live_payouts_enabled: false,
  profiles: {
    test: {mode: 'test', configured: true, webhook_configured: true, approval_configured: true, public_key_masked: '••••1234'},
    live: {mode: 'live', configured: true, webhook_configured: true, approval_configured: true, public_key_masked: '••••5678'},
  },
  in_flight: {storefront_orders: 0, provider_payouts: 0},
  webhook_url: 'https://example.test/billing/chapa/webhook',
  transfer_approval_url: 'https://example.test/api/v1/chapa/transfer-approval',
};

describe('Admin Chapa environment controls', () => {
  beforeEach(() => {
    api.get.mockImplementation((url: string) => {
      if (url.endsWith('/chapa/environments')) return Promise.resolve({data: {data: merchant}});
      if (url.endsWith('/chapa-payout-readiness')) return Promise.resolve({data: {data: {
        mode: 'test', enabled: true, approval_configured: true, webhook_configured: true,
        approval_url: merchant.transfer_approval_url, admin_step_up_required: false,
      }}});
      if (url.endsWith('/withdrawal-methods')) return Promise.resolve({data: {data: []}});
      if (url.endsWith('/payout-policy')) return Promise.resolve({data: {data: {payout_hold_days: 0, minimum_payout_cents: 100}}});
      if (url.endsWith('/financial-summary')) return Promise.resolve({data: {data: {
        ledger_audit: {is_balanced: true, total_debits_cents: 0, total_credits_cents: 0,
          clearing_balance_cents: 0, total_creator_liabilities_cents: 0,
          platform_commission_cents: 0, total_disbursed_cents: 0,
          negative_balances_count: 0, issues_count: 0},
        pending_action_counts: {stale_payment_attempts: 0, stale_payout_intents: 0,
          matured_escrow_orders: 0, deficit_creators: 0},
      }}});
      throw Error('Unexpected request ' + url);
    });
    api.put.mockImplementation((url: string, payload: unknown) => Promise.resolve({data: {data: url.endsWith('/payout-policy') ? payload : merchant}}));
    api.post.mockResolvedValue({data: {data: merchant}});
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  const view = () => render(<DashboardLayoutContextProvider name="admin">{() => <Component />}</DashboardLayoutContextProvider>);

  it('renders separate TEST and LIVE credentials and a paused/live safety explanation', async () => {
    view();
    expect(await screen.findByText('Platform Chapa environments')).toBeTruthy();
    expect(screen.getByRole('button', {name: /TEST \(active\)/})).toBeTruthy();
    expect(screen.getByText('Controlled checkout activation')).toBeTruthy();
    expect(screen.getByText('Payment webhook URL')).toBeTruthy();
  });

  it('selects LIVE without activating checkout, and requires typed confirmation', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('button', {name: 'LIVE'}));
    expect(screen.getByRole('button', {name: 'Save LIVE configuration'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Switch to LIVE'}));
    expect(screen.getByText(/Type/).textContent).toContain('SWITCH TO LIVE');
    expect(screen.getByRole('button', {name: 'Confirm'}).hasAttribute('disabled')).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });


  it('saves only entered LIVE credentials and clears secret inputs after success', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('button', {name: 'LIVE'}));
    fireEvent.change(screen.getByLabelText('Public key'), {target: {value: 'CHAPUBK-fixture-live'}});
    fireEvent.change(screen.getByLabelText('Merchant secret key'), {target: {value: 'CHASECK-fixture-live'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save LIVE configuration'}));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/api/v1/admin/billing/chapa/environments/live',
      {public_key: 'CHAPUBK-fixture-live', secret_key: 'CHASECK-fixture-live'},
    ));
    expect(await screen.findByText(/credentials stored securely/)).toBeTruthy();
    expect((screen.getByLabelText('Merchant secret key') as HTMLInputElement).value).toBe('');
  });

  it('pauses enabled checkout without changing merchant environment', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('button', {name: 'Pause checkout'}));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/admin/billing/chapa/pause'));
    expect(await screen.findByText(/Existing orders and payouts were not modified/)).toBeTruthy();
  });

  it('does not switch merchant mode until password and typed phrase match', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('button', {name: 'LIVE'}));
    fireEvent.click(screen.getByRole('button', {name: 'Switch to LIVE'}));
    fireEvent.change(screen.getByLabelText('Confirmation phrase'), {target: {value: 'SWITCH TO LIVE'}});
    expect(screen.getByRole('button', {name: 'Confirm'}).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Administrator password'), {target: {value: 'unit-admin-password'}});
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/billing/chapa/activate',
      {mode: 'live', confirmation: 'SWITCH TO LIVE', admin_password: 'unit-admin-password'},
    ));
    expect(await screen.findByText(/Checkout is paused until separately enabled/)).toBeTruthy();
  });

  it('loads and saves actual payout hold days and minimum withdrawal amount', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('tab', {name: /Commissions & policy/}));
    const hold = await screen.findByLabelText('Earnings hold (days)') as HTMLInputElement;
    const minimum = screen.getByLabelText('Minimum withdrawal (ETB)') as HTMLInputElement;
    expect(hold.value).toBe('0');
    expect(minimum.value).toBe('1.00');
    fireEvent.change(hold, {target: {value: '2'}});
    fireEvent.change(minimum, {target: {value: '50'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save payout policy'}));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      '/api/v1/admin/marketplace/payout-policy', {payout_hold_days: 2, minimum_payout_cents: 5000},
    ));
  });

  it('preserves the financial reconciliation panel', async () => {
    view();
    await screen.findByText('Platform Chapa environments');
    fireEvent.click(screen.getByRole('tab', {name: /Ledger audit & reconciliation/}));
    expect(await screen.findByText('Double-entry ledger integrity audit')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: /Run reconciliation/}));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/marketplace/reconcile', {dry_run: false},
    ));
  });
});

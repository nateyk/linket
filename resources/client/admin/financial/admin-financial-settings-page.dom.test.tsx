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
    api.put.mockResolvedValue({data: {data: merchant}});
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

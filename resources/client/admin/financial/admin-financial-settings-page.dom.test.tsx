/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component as AdminFinancialSettingsPage} from './admin-financial-settings-page';

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({
  apiClient: mockApiClient,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, string | number>}) => {
    let result = message;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(`:${k}`, String(v));
      }
    }
    return <span>{result}</span>;
  },
}));

vi.mock('@ui/i18n/format-money', () => ({
  formatMoney: (amountCents: number, currency: string) =>
    `${(amountCents / 100).toFixed(2)} ${currency}`,
}));

vi.mock('react-router', () => ({
  Link: ({to, children, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

describe('AdminFinancialSettingsPage', () => {
  const baseGatewayConfig = {
    gateway: 'chapa',
    secret_configured: true,
    public_key_masked: 'CHAPUBK_TEST-abc...xyz',
    webhook_secret_configured: true,
    webhook_url: 'https://linket.test/api/v1/billing/gateways/chapa/webhook',
  };

  const baseWithdrawalMethods = [
    {
      id: 1,
      name: 'Commercial Bank of Ethiopia (CBE)',
      code: 'cbe',
      destination_label: 'Account Number',
      minimum_amount_cents: 10000,
      maximum_amount_cents: 50000000,
      is_active: true,
    },
    {
      id: 2,
      name: 'Telebirr',
      code: 'telebirr',
      destination_label: 'Phone Number',
      minimum_amount_cents: 10000,
      maximum_amount_cents: 10000000,
      is_active: true,
    },
  ];

  const baseReconciliationSummary = {
    ledger_audit: {
      is_balanced: true,
      total_debits_cents: 5000000,
      total_credits_cents: 5000000,
      clearing_balance_cents: 200000,
      total_creator_liabilities_cents: 150000,
      platform_commission_cents: 50000,
      total_disbursed_cents: 4800000,
      negative_balances_count: 0,
      issues_count: 0,
    },
    pending_action_counts: {
      stale_payment_attempts: 0,
      stale_payout_intents: 1,
      matured_escrow_orders: 3,
      deficit_creators: 0,
    },
  };

  beforeEach(() => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/admin/billing/subscription-gateway') {
        return Promise.resolve({data: {data: baseGatewayConfig}});
      }
      if (url.includes('/api/v1/admin/financial/withdrawal-methods')) {
        return Promise.resolve({data: {data: baseWithdrawalMethods}});
      }
      if (url === '/api/v1/admin/marketplace/financial-summary') {
        return Promise.resolve({data: {data: baseReconciliationSummary}});
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    mockApiClient.put.mockResolvedValue({
      data: {
        data: {
          ...baseGatewayConfig,
          public_key_masked: 'CHAPUBK_TEST-new...999',
        },
      },
    });

    mockApiClient.post.mockResolvedValue({
      data: {
        data: {
          dry_run: false,
          matured_orders_count: 3,
          reconciled_payments_count: 5,
          reconciled_payouts_count: 1,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <DashboardLayoutContextProvider name="admin">
        {() => <AdminFinancialSettingsPage />}
      </DashboardLayoutContextProvider>,
    );

  it('renders page header and platform Chapa gateway configuration tab by default', async () => {
    renderComponent();

    expect(screen.getByText('Financial settings & operations')).toBeTruthy();
    expect(screen.getByText('Withdrawals dashboard')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    expect(screen.getByText('Connected')).toBeTruthy();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/admin/billing/subscription-gateway');
    expect(
      screen.getByDisplayValue('https://linket.test/api/v1/billing/gateways/chapa/webhook'),
    ).toBeTruthy();
  });

  it('submits updated Chapa credentials and displays success alert', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    const inputs = screen.getAllByRole('textbox');
    // Public key input
    fireEvent.change(inputs[0], {target: {value: 'CHAPA_TEST_validkey123'}});

    const secretInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(secretInput, {target: {value: 'CHAPA_TEST_validsecret456'}});

    const submitBtn = screen.getByRole('button', {name: /Save Chapa credentials/i});
    expect(submitBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/v1/admin/billing/subscription-gateway',
        expect.objectContaining({
          gateway: 'chapa',
          public_key: 'CHAPA_TEST_validkey123',
          secret_key: 'CHAPA_TEST_validsecret456',
        }),
      );
    });

    expect(await screen.findByText('Chapa credentials validated and saved.')).toBeTruthy();
  });

  it('does not send a public key without the matching secret key', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], {target: {value: 'CHAPUBK_TEST-onlypublic'}});

    const submitBtn = screen.getByRole('button', {name: /Save Chapa credentials/i});
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  it('explains that CHAPUBK and CHASECK keys are Chapa v1 keys and does not submit them', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], {target: {value: 'CHAPUBK_TEST-examplepublic'}});
    const secretInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    fireEvent.change(secretInput, {target: {value: 'CHASECK_TEST-examplesecret'}});

    fireEvent.click(screen.getByRole('button', {name: /Save Chapa credentials/i}));

    expect(await screen.findByText(/These are Chapa v1 keys/)).toBeTruthy();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  it('switches to payout methods tab and lists supported banks and limits', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', {name: /Payout methods/i}));

    await waitFor(() => {
      expect(screen.getByText('Supported withdrawal methods')).toBeTruthy();
    });

    expect(screen.getByText('Commercial Bank of Ethiopia (CBE)')).toBeTruthy();
    expect(screen.getByText('Telebirr')).toBeTruthy();
    expect(screen.getByText('cbe')).toBeTruthy();
    expect(screen.getByText('telebirr')).toBeTruthy();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('switches to commissions & policy tab and renders marketplace rules', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', {name: /Commissions & policy/i}));

    expect(screen.getByText('Marketplace commission & settlement policy')).toBeTruthy();
    expect(screen.getByText('Escrow hold period')).toBeTruthy();
    expect(screen.getByText('Minimum withdrawal')).toBeTruthy();
    expect(screen.getByText('Single-Profile Marketplace Principles')).toBeTruthy();
    expect(
      screen.getByText('Zero seller gateway keys: creators never provide personal Chapa API secrets.'),
    ).toBeTruthy();
  });

  it('switches to reconciliation tab, audits ledger integrity, and runs reconciliation', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Platform Chapa Merchant Gateway')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', {name: /Ledger audit & reconciliation/i}));

    await waitFor(() => {
      expect(screen.getByText('Double-entry ledger integrity audit')).toBeTruthy();
    });

    expect(screen.getByText('Balanced (Debits = Credits)')).toBeTruthy();
    expect(screen.getByText('2000.00 ETB')).toBeTruthy(); // platform clearing
    expect(screen.getByText('1500.00 ETB')).toBeTruthy(); // creator liabilities
    expect(screen.getByText('500.00 ETB')).toBeTruthy(); // commission
    expect(screen.getByText('48000.00 ETB')).toBeTruthy(); // disbursed

    // Actionable items
    expect(screen.getByText('Matured escrow:')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    const reconcileBtn = screen.getByRole('button', {name: /Run reconciliation/i});
    fireEvent.click(reconcileBtn);

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/admin/marketplace/financial-summary');
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/marketplace/reconcile', {
        dry_run: false,
      });
    });

    expect(
      await screen.findByText(
        'Reconciliation complete (Applied): 3 matured orders, 5 payments, 1 payouts processed.',
      ),
    ).toBeTruthy();
  });
});

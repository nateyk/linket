/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component as CreatorWithdrawalsPage} from './creator-withdrawals-page';

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({
  apiClient: mockApiClient,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@ui/i18n/formatted-currency', () => ({
  FormattedCurrency: ({value, currency}: {value: number; currency: string}) => (
    <span>{value.toFixed(2)} {currency}</span>
  ),
}));

vi.mock('@ui/i18n/formatted-date', () => ({
  FormattedDate: ({date}: {date: string}) => <span>{date}</span>,
}));

vi.mock('react-router', () => ({
  Link: ({to, children, ...props}: any) => <a href={to} {...props}>{children}</a>,
}));

describe('CreatorWithdrawalsPage', () => {
  const mockSummary = {
    gross_sales_cents: 100000,
    creator_earnings_cents: 90000,
    available_for_payout_cents: 50000,
    held_earnings_cents: 20000,
    reserved_payout_cents: 10000,
    paid_out_cents: 15000,
    lifetime_earnings_cents: 90000,
    minimum_withdrawal_cents: 100,
    payout_hold_days: 0,
    currency: 'ETB',
  };

  const mockPayouts = [
    {
      id: 101,
      amount_cents: 12000,
      currency: 'ETB',
      status: 'requested',
      payout_method_label: 'Telebirr (•••• 1234)',
      withdrawal_method_name: 'Telebirr',
      created_at: '2026-11-15T12:00:00Z',
      paid_at: null,
      rejection_reason: null,
      activities: [
        {id: 1, action: 'requested', note: 'Created withdrawal request', created_at: '2026-11-15T12:00:00Z'},
      ],
    },
    {
      id: 100,
      amount_cents: 25000,
      currency: 'ETB',
      status: 'paid',
      payout_method_label: 'CBE (•••• 5678)',
      withdrawal_method_name: 'Commercial Bank of Ethiopia',
      created_at: '2026-11-10T10:00:00Z',
      paid_at: '2026-11-11T14:00:00Z',
      rejection_reason: null,
    },
  ];

  const mockDestinations = [
    {
      id: 1,
      type: 'telebirr',
      bank_code: 'telebirr',
      bank_enabled: true,
      bank_name: 'Telebirr',
      account_holder: 'Nathnael',
      destination: '+251911223344',
      account_number_last_four: '3344',
      display_label: 'Telebirr (•••• 3344)',
      status: 'active',
      approved_at: '2026-11-15T12:00:00Z',
      withdrawal_method: {code: 'telebirr', is_active: true, minimum_amount_cents: 0, maximum_amount_cents: 30000},
      is_active: true,
      is_default: true,
    },
    {
      id: 2,
      type: 'cbe',
      bank_code: 'cbe',
      bank_enabled: true,
      bank_name: 'Commercial Bank of Ethiopia',
      account_holder: 'Nathnael',
      destination: '1000123456789',
      account_number_last_four: '6789',
      display_label: 'CBE (•••• 6789)',
      status: 'active',
      approved_at: '2026-11-15T12:00:00Z',
      withdrawal_method: {code: 'bank_transfer', is_active: true, minimum_amount_cents: 15000, maximum_amount_cents: 18000},
      is_active: true,
      is_default: false,
    },
  ];

  beforeEach(() => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') {
        return Promise.resolve({data: {summary: mockSummary}});
      }
      if (url.startsWith('/api/v1/items/payout-requests')) {
        return Promise.resolve({data: {data: mockPayouts, total: 2, per_page: 25, current_page: 1}});
      }
      if (url === '/api/v1/items/payout-methods') {
        return Promise.resolve({data: {data: mockDestinations}});
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });
    mockApiClient.post.mockResolvedValue({data: {status: 'success'}});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <DashboardLayoutContextProvider name="test">
        {() => <CreatorWithdrawalsPage />}
      </DashboardLayoutContextProvider>,
    );

  it('renders metric cards with correct monetary values and labels', async () => {
    renderPage();

    expect(await screen.findByText('Available Balance')).toBeTruthy();
    expect(screen.getByText('500.00 ETB')).toBeTruthy();

    expect(screen.getByText('Held earnings')).toBeTruthy();
    expect(screen.getByText('200.00 ETB')).toBeTruthy();

    expect(screen.getByText('Pending withdrawals')).toBeTruthy();
    expect(screen.getByText('100.00 ETB')).toBeTruthy();

    expect(screen.getByText('Paid out')).toBeTruthy();
    expect(screen.getByText('150.00 ETB')).toBeTruthy();
  });

  it('explains a reconciliation mismatch without enabling a zero-balance withdrawal', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') {
        return Promise.resolve({data: {summary: {
          ...mockSummary,
          available_for_payout_cents: 0,
          balance_reconciliation_required: true,
        }}});
      }
      if (url.includes('/api/v1/items/payout-requests')) {
        return Promise.resolve({data: {data: mockPayouts}});
      }
      if (url === '/api/v1/items/payout-methods') {
        return Promise.resolve({data: {data: mockDestinations}});
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });
    renderPage();
    expect(await screen.findByText(/Some historical earnings or pending withdrawals still need ledger reconciliation/)).toBeTruthy();
    expect(screen.getByText('0.00 ETB')).toBeTruthy();
    expect(screen.getByRole('button', {name: /Request withdrawal/i})).toHaveProperty('disabled', false);
  });

  it('explains held earnings and permits inspecting withdrawal readiness without submitting zero funds', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') {
        return Promise.resolve({data: {summary: {
          ...mockSummary,
          available_for_payout_cents: 0,
          held_earnings_cents: 90000,
        }}});
      }
      if (url.startsWith('/api/v1/items/payout-requests')) {
        return Promise.resolve({data: {data: []}});
      }
      if (url === '/api/v1/items/payout-methods') {
        return Promise.resolve({data: {data: mockDestinations}});
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    renderPage();
    expect(await screen.findByText('Held earnings')).toBeTruthy();
    expect(screen.getByText('900.00 ETB')).toBeTruthy();
    expect(screen.getByText(/Your verified earnings are currently held/)).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Review Orders & Sales'}).getAttribute('href'))
      .toBe('/dashboard/orders');

    fireEvent.click(screen.getByRole('button', {name: /Request withdrawal/i}));
    expect(await screen.findByText('No withdrawable balance')).toBeTruthy();
    expect(screen.getByRole('button', {name: /Confirm withdrawal/i})).toHaveProperty('disabled', true);
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('explains that a default Telebirr account still needs administrator approval', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') {
        return Promise.resolve({data: {summary: mockSummary}});
      }
      if (url.startsWith('/api/v1/items/payout-requests')) {
        return Promise.resolve({data: {data: []}});
      }
      if (url === '/api/v1/items/payout-methods') {
        return Promise.resolve({data: {data: [{
          ...mockDestinations[0],
          status: 'pending_verification',
          approved_at: null,
        }]}});
      }
      return Promise.reject(new Error('Unexpected endpoint'));
    });

    renderPage();
    expect(await screen.findByText(/Default does not mean approved/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: /Request withdrawal/i}));
    expect(await screen.findByText('No approved payout account')).toBeTruthy();
    expect(screen.queryByRole('button', {name: /Confirm withdrawal/i})).toBeNull();
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('honors the configured platform minimum even when a method allows less', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') return Promise.resolve({data: {summary: {...mockSummary, available_for_payout_cents: 3000, minimum_withdrawal_cents: 5000}}});
      if (url.includes('/api/v1/items/payout-requests')) return Promise.resolve({data: {data: []}});
      if (url === '/api/v1/items/payout-methods') return Promise.resolve({data: {data: mockDestinations}});
      return Promise.reject(new Error('Unexpected endpoint'));
    });
    renderPage();
    expect(await screen.findByText(/below the platform minimum withdrawal/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: /Request withdrawal/i}));
    expect((screen.getByLabelText(/Withdrawal amount/i) as HTMLInputElement).min).toBe('50');
    expect(screen.getByRole('button', {name: /Confirm withdrawal/i})).toHaveProperty('disabled', true);
  });

  it('renders withdrawal history with status badges and destination labels', async () => {
    renderPage();

    expect(await screen.findByText('#101')).toBeTruthy();
    expect(screen.getByText('Telebirr (•••• 1234)')).toBeTruthy();
    expect(screen.getByText('Requested')).toBeTruthy();

    expect(screen.getByText('#100')).toBeTruthy();
    expect(screen.getByText('CBE (•••• 5678)')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
  });

  it('opens request withdrawal modal and submits request', async () => {
    renderPage();

    const requestBtn = await screen.findByRole('button', {name: /Request withdrawal/i});
    fireEvent.click(requestBtn);

    expect(screen.getByText('Minimum withdrawal')).toBeTruthy();
    const minField = screen.getByLabelText(/Withdrawal amount/i) as HTMLInputElement;
    expect(minField.min).toBe('1');
    expect(minField.max).toBe('300');

    const destinationSelect = screen.getByLabelText(/Destination account/i) as HTMLSelectElement;
    expect(destinationSelect.value).toBe('1');

    const amountInput = screen.getByLabelText(/Withdrawal amount/i) as HTMLInputElement;
    fireEvent.change(amountInput, {target: {value: '200'}});

    const submitBtn = screen.getByRole('button', {name: /Confirm withdrawal/i});
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/items/payout-requests', {
        amount_cents: 20000,
        payout_method_id: 1,
      });
    });
  });

  it('selects the approved default Dashen account and also offers the enabled wallet', async () => {
    const dashen = {
      ...mockDestinations[1], bank_code: 'dashen', display_label: 'Dashen Bank (•••• 0011)', is_default: true,
    };
    mockApiClient.get
      .mockResolvedValueOnce({data: {summary: mockSummary}})
      .mockResolvedValueOnce({data: {data: []}})
      .mockResolvedValueOnce({data: {data: [
        {...mockDestinations[0], is_default: false},
        dashen,
        {...mockDestinations[1], id: 3, bank_enabled: false},
      ]}});

    renderPage();
    fireEvent.click(await screen.findByRole('button', {name: /Request withdrawal/i}));
    const select = screen.getByRole('combobox', {name: 'Destination account'}) as HTMLSelectElement;
    expect(Array.from(select.options, option => option.value)).toEqual(['1', '2']);
    expect(select.selectedOptions[0].textContent).toContain('Dashen Bank');
    fireEvent.click(screen.getByRole('button', {name: /Confirm withdrawal/i}));
    await waitFor(() => expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/items/payout-requests', {
      amount_cents: 18000, payout_method_id: dashen.id,
    }));
  });

  it('enforces the selected approved bank method limits and caps Max accordingly', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', {name: /Request withdrawal/i}));
    const select = screen.getByLabelText(/Destination account/i) as HTMLSelectElement;
    fireEvent.change(select, {target: {value: '2'}});

    const amountInput = screen.getByLabelText(/Withdrawal amount/i) as HTMLInputElement;
    expect(amountInput.min).toBe('150');
    expect(amountInput.max).toBe('180');
    fireEvent.change(amountInput, {target: {value: '100'}});
    expect((screen.getByRole('button', {name: /Confirm withdrawal/i}) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', {name: 'Max'}));
    expect(amountInput.value).toBe('180.00');
    fireEvent.click(screen.getByRole('button', {name: /Confirm withdrawal/i}));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/items/payout-requests', {
        amount_cents: 18000,
        payout_method_id: 2,
      });
    });
  });

  it('allows cancelling a request in requested status', async () => {
    renderPage();

    const cancelBtn = await screen.findByRole('button', {name: /Cancel/i});
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/items/payout-requests/101/cancel');
    });
  });

  it('displays empty state with link to configure payout accounts when none exist', async () => {
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/v1/items/sales') {
        return Promise.resolve({data: {summary: mockSummary}});
      }
      if (url.startsWith('/api/v1/items/payout-requests')) {
        return Promise.resolve({data: {data: [], total: 0, per_page: 25, current_page: 1}});
      }
      if (url === '/api/v1/items/payout-methods') {
        return Promise.resolve({data: {data: []}});
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    renderPage();

    expect(await screen.findByText('You do not have any withdrawals')).toBeTruthy();
    expect(screen.getByText('When you have withdrawal requests, you will be able to see them here.')).toBeTruthy();

    const requestBtn = await screen.findByRole('button', {name: /Request withdrawal/i});
    fireEvent.click(requestBtn);

    expect(await screen.findByText('No approved payout account')).toBeTruthy();
    const configureLink = screen.getByRole('button', {name: /Configure payout accounts/i});
    expect(configureLink.getAttribute('href')).toBe('/account-settings/receiving-accounts');
  });

  it('opens details dialog when viewing a withdrawal', async () => {
    renderPage();

    const viewButtons = await screen.findAllByRole('button', {name: /View details/i});
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText('Withdrawal request details')).toBeTruthy();
    expect(screen.getByText('Activity timeline')).toBeTruthy();
    expect(screen.getByText('Created withdrawal request')).toBeTruthy();
  });
});

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
      bank_name: 'Telebirr',
      account_holder: 'Nathnael',
      destination: '+251911223344',
      account_number_last_four: '3344',
      display_label: 'Telebirr (•••• 3344)',
      status: 'active',
      approved_at: '2026-11-15T12:00:00Z',
      withdrawal_method: {code: 'telebirr', is_active: true},
      is_active: true,
      is_default: true,
    },
    {
      id: 2,
      type: 'cbe',
      bank_code: 'cbe',
      bank_name: 'Commercial Bank of Ethiopia',
      account_holder: 'Nathnael',
      destination: '1000123456789',
      account_number_last_four: '6789',
      display_label: 'CBE (•••• 6789)',
      status: 'active',
      approved_at: '2026-11-15T12:00:00Z',
      withdrawal_method: {code: 'bank_transfer', is_active: true},
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
      if (url === '/api/items/payout-methods') {
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

    expect(screen.getByText('Pending Withdrawn')).toBeTruthy();
    expect(screen.getByText('100.00 ETB')).toBeTruthy();

    expect(screen.getByText('Total Withdraw')).toBeTruthy();
    expect(screen.getByText('150.00 ETB')).toBeTruthy();
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

    expect(screen.getByText('Minimum withdrawal is 100.00 ETB.')).toBeTruthy();

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
      if (url === '/api/items/payout-methods') {
        return Promise.resolve({data: {data: []}});
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    renderPage();

    expect(await screen.findByText('You do not have any withdrawals')).toBeTruthy();
    expect(screen.getByText('When you have withdrawal requests, you will be able to see them here.')).toBeTruthy();

    const requestBtn = await screen.findByRole('button', {name: /Request withdrawal/i});
    fireEvent.click(requestBtn);

    expect(await screen.findByText('No payout account configured')).toBeTruthy();
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

/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component as AdminWithdrawalReviewPage} from './admin-withdrawal-review-page';

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
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
  useParams: () => ({withdrawalId: '123'}),
}));

describe('AdminWithdrawalReviewPage', () => {
  const basePayout = {
    id: 123,
    amount_cents: 50000,
    currency: 'ETB',
    status: 'requested',
    payout_method_label: 'Telebirr (•••• 4321)',
    withdrawal_method_name: 'Telebirr',
    payout_destination: '+251911223344',
    created_at: '2026-11-15T10:00:00Z',
    creator: {id: 42, name: 'Abebe Bikila', email: 'abebe@example.test'},
    activities: [
      {id: 1, action: 'requested', note: 'Creator requested withdrawal', created_at: '2026-11-15T10:00:00Z'},
    ],
  };

  beforeEach(() => {
    mockApiClient.get.mockResolvedValue({data: {data: basePayout}});
    mockApiClient.post.mockResolvedValue({data: {message: 'Action completed successfully.'}});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <DashboardLayoutContextProvider name="test">
        {() => <AdminWithdrawalReviewPage />}
      </DashboardLayoutContextProvider>,
    );

  it('renders withdrawal request details, creator info, and activity log', async () => {
    renderPage();

    expect(await screen.findByText('Withdrawal request #123')).toBeTruthy();
    expect(screen.getByText('500.00 ETB')).toBeTruthy();
    expect(screen.getByText('Abebe Bikila')).toBeTruthy();
    expect(screen.getByText('+251911223344')).toBeTruthy();
    expect(screen.getByText('Telebirr')).toBeTruthy();
    expect(screen.getByText('Activity timeline')).toBeTruthy();
    expect(screen.getByText('Creator requested withdrawal')).toBeTruthy();
  });

  it('approves a requested withdrawal (Stage 1)', async () => {
    renderPage();

    const approveBtn = await screen.findByRole('button', {name: /Approve & start processing/i});
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/review', {
        status: 'processing',
      });
    });
  });

  it('submits an automated transfer to Chapa (Stage 2)', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          ...basePayout,
          status: 'processing',
        },
      },
    });

    renderPage();

    const submitBtn = await screen.findByRole('button', {name: /Submit transfer to Chapa/i});
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/submit-transfer');
    });
  });

  it('verifies settlement with Chapa (Stage 3)', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          ...basePayout,
          status: 'processing',
          latest_payout_intent: {
            id: 88,
            merchant_reference: 'payout-intent-88',
            status: 'pending',
            chapa_reference: 'CHP-8899',
          },
        },
      },
    });

    renderPage();

    expect(await screen.findByText('payout-intent-88')).toBeTruthy();
    const verifyBtn = screen.getByRole('button', {name: /Verify settlement with Chapa/i});
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/verify-settlement');
    });
  });

  it('records manual settlement with transfer reference (Stage 3 manual)', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          ...basePayout,
          status: 'processing',
        },
      },
    });

    renderPage();

    const recordBtn = await screen.findByRole('button', {name: /Record manual settlement/i});
    fireEvent.click(recordBtn);

    const refInput = screen.getByLabelText(/Manual transfer reference/i);
    fireEvent.change(refInput, {target: {value: 'CBE-TX-12345678'}});

    const confirmBtn = screen.getByRole('button', {name: /Confirm manual settlement/i});
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/review', {
        status: 'paid',
        transfer_reference: 'CBE-TX-12345678',
        note: undefined,
      });
    });
  });

  it('opens rejection dialog and submits rejection reason', async () => {
    renderPage();

    const rejectBtn = await screen.findByRole('button', {name: /Reject request/i});
    fireEvent.click(rejectBtn);

    expect(await screen.findByText('Reject withdrawal request')).toBeTruthy();

    const reasonInput = screen.getByLabelText(/Rejection reason/i);
    fireEvent.change(reasonInput, {target: {value: 'Account holder name does not match Telebirr KYC.'}});

    const confirmRejectBtn = screen.getByRole('button', {name: /Confirm rejection/i});
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/review', {
        status: 'rejected',
        reason: 'Account holder name does not match Telebirr KYC.',
        note: undefined,
      });
    });
  });
});

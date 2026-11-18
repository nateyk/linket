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
    payout_mode: {mode: 'test', enabled: true, approval_configured: true, test_only: true},
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

  it('shows a recoverable error and retry when withdrawal details cannot load', async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error('temporary failure'));
    renderPage();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Try again'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Try again'}));

    await waitFor(() => expect(mockApiClient.get).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Withdrawal request #123')).toBeTruthy();
  });

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

  it('requires Linket admin password for configured step-up before sending the exact transfer', async () => {
    mockApiClient.get.mockResolvedValue({data: {data: {
      ...basePayout,
      status: 'processing',
      admin_step_up_required: true,
    }}});
    renderPage();
    fireEvent.click(await screen.findByRole('button', {name: /Submit transfer to Chapa/i}));
    expect(mockApiClient.post).not.toHaveBeenCalled();
    expect(await screen.findByText('Confirm Chapa transfer')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Linket admin password'), {target: {value: 'correct-admin-password'}});
    fireEvent.click(screen.getByRole('button', {name: /Confirm and submit transfer/i}));
    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/admin/withdrawals/123/submit-transfer', {
        admin_password: 'correct-admin-password',
        confirmation_id: 123,
        confirmation_amount_cents: 50000,
        confirmation_currency: 'ETB',
        confirmation_destination_label: 'Telebirr (•••• 4321)',
      });
    });
  });

  it('blocks test transfer until the approval secret is configured', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {data: {
        ...basePayout,
        status: 'processing',
        payout_mode: {mode: 'test', enabled: true, approval_configured: false, test_only: true},
      }},
    });
    renderPage();

    const submit = await screen.findByRole('button', {name: /Submit transfer to Chapa/i});
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Configure test credentials and the transfer approval secret/)).toBeTruthy();
    expect(screen.getByText(/Chapa test mode/)).toBeTruthy();
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('does not activate live disbursements with sandbox-only toggle', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {data: {
        ...basePayout,
        status: 'processing',
        payout_mode: {mode: 'live', enabled: false, approval_configured: true, test_only: false},
      }},
    });
    renderPage();
    expect((await screen.findByRole('button', {name: /Submit transfer to Chapa/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(mockApiClient.post).not.toHaveBeenCalled();
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
            status: 'provider_pending',
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

  it('keeps an uncertain Chapa submission available for verification but never resends it', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {data: {
        ...basePayout,
        status: 'processing',
        withdrawalMethod: {name: 'Telebirr', code: 'telebirr'},
        latest_payout_intent: {
          id: 99,
          merchant_reference: 'lk-po-uncertain',
          status: 'submitted',
          last_error: 'Submission not confirmed. Verify this reference with Chapa.',
        },
      }},
    });

    renderPage();

    expect(await screen.findByText('Submission unconfirmed')).toBeTruthy();
    expect(screen.getByText(/Transfer outcome is uncertain/)).toBeTruthy();
    expect(screen.queryByRole('button', {name: /Submit transfer to Chapa/i})).toBeNull();
    expect(screen.getByRole('button', {name: /Verify settlement with Chapa/i})).toBeTruthy();
  });

  it('does not permit a repeat verification or transfer after confirmed settlement', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {data: {
        ...basePayout,
        status: 'paid',
        withdrawalMethod: {name: 'Telebirr', code: 'telebirr'},
        latest_payout_intent: {
          id: 100,
          merchant_reference: 'lk-po-settled',
          status: 'successful',
        },
      }},
    });

    renderPage();

    expect(await screen.findByText('This withdrawal was settled and marked as paid.')).toBeTruthy();
    expect(screen.queryByRole('button', {name: /Verify settlement with Chapa/i})).toBeNull();
    expect(screen.queryByRole('button', {name: /Submit transfer to Chapa/i})).toBeNull();
  });

  it('keeps legacy manual payouts separate from Chapa submission', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {data: {
        ...basePayout,
        status: 'processing',
        withdrawalMethod: {name: 'Custom manual transfer', code: 'other'},
      }},
    });

    renderPage();

    expect(await screen.findByRole('button', {name: /Record manual settlement/i})).toBeTruthy();
    expect(screen.queryByRole('button', {name: /Submit transfer to Chapa/i})).toBeNull();
  });

  it('records manual settlement with transfer reference (Stage 3 manual)', async () => {
    mockApiClient.get.mockResolvedValue({
      data: {
        data: {
          ...basePayout,
          status: 'processing',
          withdrawalMethod: {name: 'Custom manual transfer', code: 'other'},
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

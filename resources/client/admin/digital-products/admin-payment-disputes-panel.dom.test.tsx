/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {AdminPaymentDisputesPanel} from './admin-payment-disputes-panel';

const api = vi.hoisted(() => ({get: vi.fn(), patch: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@common/http/errors/parsed-api-error', () => ({
  getApiErrorMessage: () => 'Request failed',
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@shadcn/card/card', () => ({
  Card: {
    Root: 'div',
    Header: 'div',
    Title: 'h2',
    Content: 'div',
    Description: 'div',
  },
}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/button/button', () => ({Button: 'button'}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminPaymentDisputesPanel', () => {
  it('lists disputes and closes a resolved dispute', async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          disputes: [
            {
              id: 'disp-1',
              reason: 'wrong_reference',
              reason_label: 'Wrong payment reference',
              status: 'Resolved',
              lifecycle_status: 'resolved',
              buyer_email: 'buyer@example.test',
              order_id: 'ord-1',
              payment_evidence: {status: 'success'},
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          disputes: [
            {
              id: 'disp-1',
              reason: 'wrong_reference',
              reason_label: 'Wrong payment reference',
              status: 'Closed',
              lifecycle_status: 'closed',
              buyer_email: 'buyer@example.test',
              order_id: 'ord-1',
            },
          ],
        },
      });
    api.patch.mockResolvedValue({data: {dispute: {lifecycle_status: 'closed'}}});

    render(<AdminPaymentDisputesPanel />);

    expect(await screen.findByText('Wrong payment reference')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Close'}));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/v1/admin/storefront/payment-disputes/disp-1',
        expect.objectContaining({status: 'closed'}),
      );
    });
  });
});

/** @vitest-environment jsdom */
import {render, screen, cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PaymentStatusLabel} from './payment-status-badge';

vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
afterEach(cleanup);

describe('payment status label', () => {
  it.each([
    ['pending', 'Pending'],
    ['pending_payment', 'Pending'],
    ['verifying', 'Verifying'],
    ['paid', 'Paid'],
    ['completed', 'Paid'],
    ['fulfilled', 'Paid'],
    ['failed_verification', 'Rejected'],
    ['manual_review', 'Review'],
    ['expired', 'Expired'],
  ])('renders %s', (status, label) => {
    render(<PaymentStatusLabel status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

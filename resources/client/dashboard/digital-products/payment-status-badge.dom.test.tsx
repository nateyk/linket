/** @vitest-environment jsdom */
import {render, screen, cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PaymentStatusLabel} from './payment-status-badge';

vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
afterEach(cleanup);

describe('payment status label', () => {
  it.each([['pending_payment', 'Payment pending'], ['verifying', 'Awaiting provider verification'], ['paid', 'Payment verified'], ['failed_verification', 'Verification rejected'], ['manual_review', 'Manual review needed']])('renders %s', (status, label) => {
    render(<PaymentStatusLabel status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

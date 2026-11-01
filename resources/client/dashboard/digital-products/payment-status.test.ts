import {describe, expect, it} from 'vitest';
import {paymentStatusLabel} from './payment-status';

describe('direct payment status', () => {
  it.each([
    ['pending', 'Payment pending'],
    ['pending_payment', 'Payment pending'],
    ['verifying', 'Awaiting provider verification'],
    ['paid', 'Payment verified'],
    ['completed', 'Payment verified'],
    ['fulfilled', 'Payment verified'],
    ['failed_verification', 'Verification rejected'],
    ['manual_review', 'Manual review needed'],
  ])('labels %s as %s', (status, label) => {
    expect(paymentStatusLabel(status)).toBe(label);
  });

  it('does not label unknown statuses as paid', () => {
    expect(paymentStatusLabel('unknown')).toBeNull();
  });
});

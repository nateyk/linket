import {describe, expect, it} from 'vitest';
import {paymentStatusLabel} from './payment-status';

describe('direct payment status', () => {
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
  ])('labels %s as %s', (status, label) => {
    expect(paymentStatusLabel(status)).toBe(label);
  });

  it('does not label unknown statuses as paid', () => {
    expect(paymentStatusLabel('unknown')).toBeNull();
  });
});

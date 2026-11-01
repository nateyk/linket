export function paymentStatusLabel(status: string): string | null {
  switch (status) {
    case 'pending':
    case 'pending_payment': return 'Payment pending';
    case 'verifying': return 'Awaiting provider verification';
    case 'paid':
    case 'completed':
    case 'fulfilled': return 'Payment verified';
    case 'failed_verification': return 'Verification rejected';
    case 'manual_review': return 'Manual review needed';
    case 'expired': return 'Payment expired';
    default: return null;
  }
}

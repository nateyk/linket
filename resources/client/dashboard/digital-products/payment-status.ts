export function paymentStatusLabel(status: string): string | null {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return 'Pending';
    case 'verifying':
      return 'Verifying';
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return 'Paid';
    case 'failed_verification':
      return 'Rejected';
    case 'manual_review':
      return 'Review';
    case 'expired':
      return 'Expired';
    default:
      return null;
  }
}

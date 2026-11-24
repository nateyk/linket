import {Trans} from '@ui/i18n/trans';

export function PaymentStatusLabel({status}: {status: string}) {
  switch (status) {
    case 'pending':
    case 'pending_payment':
      return <Trans message="Pending" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return <Trans message="Paid" />;
    case 'failed_verification':
      return <Trans message="Rejected" />;
    case 'manual_review':
      return <Trans message="Review" />;
    case 'expired':
      return <Trans message="Expired" />;
    default:
      return null;
  }
}

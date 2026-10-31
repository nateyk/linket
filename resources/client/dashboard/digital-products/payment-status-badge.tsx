import {Trans} from '@ui/i18n/trans';

export function PaymentStatusLabel({status}: {status: string}) {
  switch (status) {
    case 'pending_payment': return <Trans message="Payment pending" />;
    case 'verifying': return <Trans message="Awaiting provider verification" />;
    case 'paid':
    case 'fulfilled': return <Trans message="Payment verified" />;
    case 'failed_verification': return <Trans message="Verification rejected" />;
    case 'manual_review': return <Trans message="Manual review needed" />;
    case 'expired': return <Trans message="Payment expired" />;
    default: return null;
  }
}

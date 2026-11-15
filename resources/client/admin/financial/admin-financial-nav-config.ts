import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {
  CoinsIcon,
  CreditCardIcon,
  LandmarkIcon,
  ScaleIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import {ComponentType} from 'react';

export interface FinancialNavItem {
  label: MessageDescriptor;
  description?: MessageDescriptor;
  to: string;
  icon: ComponentType<{className?: string}>;
}

export const financialNavItems: FinancialNavItem[] = [
  {
    label: message('General defaults'),
    description: message('Currency, platform Chapa & policies'),
    to: '/admin/financial/general',
    icon: SlidersHorizontalIcon,
  },
  {
    label: message('Payment gateways'),
    description: message('Verify.et connection & direct buyer methods'),
    to: '/admin/financial/payment-gateways',
    icon: LandmarkIcon,
  },
  {
    label: message('Receiving accounts'),
    description: message('Creator bank & mobile wallet reviews'),
    to: '/admin/financial/withdrawal-methods',
    icon: CoinsIcon,
  },
  {
    label: message('Withdrawal methods'),
    description: message('Payout limits & legacy method rules'),
    to: '/admin/financial/withdrawal-methods/legacy',
    icon: CreditCardIcon,
  },
  {
    label: message('Ledger & reconciliation'),
    description: message('Audit double-entry ledger & integrity'),
    to: '/admin/financial/reconciliation',
    icon: ScaleIcon,
  },
];

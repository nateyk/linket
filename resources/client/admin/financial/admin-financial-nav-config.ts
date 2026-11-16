import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {
  CircleDollarSignIcon,
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
    label: message('Withdrawals'),
    description: message('Creator payout requests & settlements'),
    to: '/admin/financial/withdrawals',
    icon: CreditCardIcon,
  },
  {
    label: message('Payment activity'),
    description: message('Storefront transactions & buyer payments'),
    to: '/admin/financial/payment-activity',
    icon: CircleDollarSignIcon,
  },
  {
    label: message('Withdrawal methods'),
    description: message('Payout limits & legacy method rules'),
    to: '/admin/financial/withdrawal-methods/legacy',
    icon: LandmarkIcon,
  },
  {
    label: message('Ledger & reconciliation'),
    description: message('Audit double-entry ledger & integrity'),
    to: '/admin/financial/reconciliation',
    icon: ScaleIcon,
  },
];

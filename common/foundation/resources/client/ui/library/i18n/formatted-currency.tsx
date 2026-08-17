import {formatMoney} from '@ui/i18n/format-money';
import {memo} from 'react';

interface FormattedCurrencyProps {
  value?: number;
  valueInCents?: number;
  currency: string;
}
export const FormattedCurrency = memo(
  ({value, valueInCents, currency}: FormattedCurrencyProps) => {
    const cents = valueInCents != null ? valueInCents : (value ?? 0) * 100;
    return <>{formatMoney(cents, currency)}</>;
  },
);
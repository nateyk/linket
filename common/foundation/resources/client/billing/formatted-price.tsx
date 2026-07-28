import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';

interface FormattedPriceProps {
  price?: {
    amount: number;
    currency: string;
    interval: string;
    interval_count: number;
  };
  variant?: 'slash' | 'separateLine';
  className?: string;
  priceClassName?: string;
  periodClassName?: string;
}
export function FormattedPrice({
  price,
  variant = 'slash',
  className,
  priceClassName,
  periodClassName,
}: FormattedPriceProps) {
  if (!price) return null;

  const translatedInterval = <Trans message={price.interval} />;

  return (
    <div className={clsx('flex items-center gap-1.5', className)}>
      <div className={priceClassName}>
        <FormattedCurrency
          value={price.amount / (price.interval_count ?? 1)}
          currency={price.currency}
        />
      </div>
      {variant === 'slash' ? (
        <div className={periodClassName}> / {translatedInterval}</div>
      ) : (
        <div className={periodClassName}>
          <Trans message="per" /> <br /> {translatedInterval}
        </div>
      )}
    </div>
  );
}

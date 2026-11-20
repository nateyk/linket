import {Product} from '@app/gen/schemas/product';
import {Trans} from '@ui/i18n/trans';
import {memo} from 'react';
import {findBestPrice} from './find-best-price';

interface UpsellLabelProps {
  products?: Product[];
}

type Price = NonNullable<Product['prices']>[number];

// Show the highest actual discount across products with monthly and annual prices.
export const UpsellLabel = memo(({products}: UpsellLabelProps) => {
  const upsellPercentage = calcHighestUpsellPercentage(products);

  if (upsellPercentage <= 0) {
    return null;
  }

  return (
    <span className="font-medium text-positive">
      <Trans
        message="Save up to :percentage%"
        values={{percentage: upsellPercentage}}
      />
    </span>
  );
});

function monthlyEquivalent(price: Price): number | null {
  if (price.interval_count <= 0) return null;

  if (price.interval === 'month') {
    return price.amount / price.interval_count;
  }
  if (price.interval === 'year') {
    return price.amount / (12 * price.interval_count);
  }
  if (price.interval === 'day') {
    return (price.amount * 30) / price.interval_count;
  }
  return null;
}

function calcHighestUpsellPercentage(products?: Product[]) {
  if (!products?.length) return 0;

  return products.reduce((best, product) => {
    if (product.hidden || !product.prices) return best;

    const monthly = findBestPrice('monthly', product.prices);
    const yearly = findBestPrice('yearly', product.prices);

    // No discount unless a distinct monthly/annual pair really exists.
    if (!monthly || !yearly || monthly.id === yearly.id) return best;
    const hasMonthlyTerm =
      (monthly.interval === 'month' && monthly.interval_count === 1) ||
      (monthly.interval === 'day' && monthly.interval_count >= 30);
    const hasAnnualTerm =
      (yearly.interval === 'month' && yearly.interval_count >= 12) ||
      (yearly.interval === 'year' && yearly.interval_count >= 1);
    if (!hasMonthlyTerm || !hasAnnualTerm) return best;
    if (monthly.currency !== yearly.currency) return best;

    const monthlyAmount = monthlyEquivalent(monthly);
    const yearlyAmount = monthlyEquivalent(yearly);
    if (
      monthlyAmount == null ||
      yearlyAmount == null ||
      monthlyAmount <= 0 ||
      yearlyAmount <= 0
    ) {
      return best;
    }

    const percentage = Math.round(
      ((monthlyAmount - yearlyAmount) / monthlyAmount) * 100,
    );
    return percentage > 0 && percentage < 100
      ? Math.max(best, percentage)
      : best;
  }, 0);
}

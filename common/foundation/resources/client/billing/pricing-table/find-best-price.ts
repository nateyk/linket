import {Product} from '@app/gen/schemas/product';

export type UpsellBillingCycle = 'monthly' | 'yearly';

type Price = NonNullable<Product['prices']>[number];

export function findBestPrice(
  token: UpsellBillingCycle,
  prices: Price[],
): Price | undefined {
  if (token === 'monthly') {
    const match = findMonthlyPrice(prices);
    if (match) return match;
  }

  if (token === 'yearly') {
    const match = findYearlyPrice(prices);
    if (match) return match;
  }

  return prices[0];
}

function findYearlyPrice(prices: Price[]) {
  return prices.find(price => {
    if (price.interval === 'month' && price.interval_count >= 12) {
      return price;
    }
    if (price.interval === 'year' && price.interval_count >= 1) {
      return price;
    }
  });
}

function findMonthlyPrice(prices: Price[]) {
  // Prefer the actual one-month price even when the annual record is
  // returned first (annual prices can also use interval="month").
  const oneMonth = prices.find(
    price => price.interval === 'month' && price.interval_count === 1,
  );
  if (oneMonth) return oneMonth;

  return prices.find(price => {
    if (price.interval === 'day' && price.interval_count >= 30) {
      return price;
    }
    if (price.interval === 'month' && price.interval_count >= 1) {
      return price;
    }
  });
}

import {formatMoney} from '@ui/i18n/format-money';

export function serviceStartingPrice(service: {
  starting_price_cents?: number | null;
  currency?: string;
}): string | null {
  if (service.starting_price_cents == null) {
    return null;
  }

  return formatMoney(service.starting_price_cents, service.currency ?? 'ETB');
}

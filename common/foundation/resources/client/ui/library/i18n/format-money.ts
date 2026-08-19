import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {useSettings} from '@ui/settings/use-settings';
import {useCallback} from 'react';

export interface MoneyFormatOptions {
  currency?: string;
  symbol?: string;
  symbolPosition?: 'before' | 'after';
}

export function getSiteCurrency(): string {
  return getBootstrapData()?.settings?.billing?.currency ?? 'ETB';
}

export function formatMoney(
  cents: number,
  currency?: string,
  options?: MoneyFormatOptions,
): string {
  const settings = getBootstrapData()?.settings;
  const effectiveOptions: MoneyFormatOptions = {
    currency: options?.currency ?? currency ?? settings?.billing?.currency ?? 'ETB',
    symbol: options?.symbol ?? settings?.billing?.currency_symbol ?? 'Br',
    symbolPosition:
      options?.symbolPosition ??
      settings?.billing?.currency_symbol_position ??
      'after',
  };
  return formatMoneyWithOptions(cents, effectiveOptions);
}

export function formatMoneyWithOptions(
  cents: number,
  options: MoneyFormatOptions,
): string {
  const currency = (options.currency ?? 'ETB').toUpperCase();
  const amount = sanitizeAmount(cents / 100);

  if (currency === 'ETB') {
    const number = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    const symbol = options.symbol ?? 'Br';
    return options.symbolPosition === 'before'
      ? `${symbol} ${number}`
      : `${number} ${symbol}`;
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function useMoneyFormatter() {
  const settings = useSettings();
  return useCallback(
    (cents: number, currency?: string) => formatMoney(cents, currency),
    // settings only change on page load, formatter does not need to re-create
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings],
  );
}

function sanitizeAmount(value: number): number {
  return isNaN(value) ? 0 : value;
}
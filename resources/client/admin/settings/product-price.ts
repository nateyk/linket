export function centsToEtb(
  cents: string | number | null | undefined,
): number | null {
  if (cents === '' || cents === null || cents === undefined) {
    return null;
  }
  const parsed = Number(cents);
  return Number.isFinite(parsed) ? parsed / 100 : null;
}

export function etbToCents(
  etb: string | number | null | undefined,
): string {
  if (etb === '' || etb === null || etb === undefined) {
    return '';
  }
  const parsed = typeof etb === 'string' ? Number(etb) : etb;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return '';
  }
  return String(Math.round(parsed * 100));
}

export function settingsBooleanToSwitch(
  value: string | number | boolean | null | undefined,
): boolean {
  return value === true || value === 1 || value === '1';
}

export function switchToSettingsBoolean(checked: boolean): string {
  return checked ? '1' : '0';
}

import {convertColorToFormat} from '@ui/themes/utils/convert-color-to-format';

export function themeValueToHex(value: string): string {
  return convertColorToFormat(value, 'hex');
}

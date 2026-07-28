import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {use} from 'react';

export function useIsDarkMode(): boolean {
  const {colorScheme} = use(ColorSchemeContext);
  return colorScheme === 'dark';
}

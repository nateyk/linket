import {FontConfig} from '@ui/fonts/font-picker/font-config';

export interface CssTheme {
  id: number;
  name: string;
  is_dark?: boolean;
  default_dark?: boolean;
  default_light?: boolean;
  values: CssThemeColors;
  font?: FontConfig;
  radius?: 'none' | 'sm' | 'md' | 'default';
  type: string;
}

export interface CssThemeColors {
  [key: string]: string;
}

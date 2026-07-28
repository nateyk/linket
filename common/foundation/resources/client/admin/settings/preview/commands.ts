import {To} from 'react-router';

import {AdminSettings} from '@common/admin/settings/admin-settings';
import {FontConfig} from '@ui/fonts/font-picker/font-config';
import {CssTheme} from '@ui/themes/css-theme';

export interface AppearanceCommand {
  source: 'be-settings-editor';
  type: string;
}

export interface Navigate {
  type: 'navigate';
  to: To;
}

export interface SetAppearanceValues {
  type: 'setValues';
  values: Partial<AdminSettings>;
  options: {merge?: boolean};
}

export interface SetThemeValue {
  type: 'setThemeValue';
  name: string;
  value: string;
}

export interface SetActiveTheme {
  type: 'setActiveTheme';
  theme: CssTheme | null;
}

export interface SetCustomCode {
  type: 'setCustomCode';
  mode: 'css' | 'html';
  value?: string;
}

export interface SetThemeFont {
  type: 'setThemeFont';
  value: FontConfig | null;
}

export interface SetThemeRadius {
  type: 'setThemeRadius';
  value: 'none' | 'sm' | 'md' | 'default';
}

export type AllCommands =
  | SetAppearanceValues
  | SetThemeValue
  | SetThemeFont
  | SetActiveTheme
  | SetCustomCode
  | SetThemeRadius;

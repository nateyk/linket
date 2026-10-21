import {FontConfig} from '@ui/fonts/font-picker/font-config';

export const BrowserSafeFonts: FontConfig[] = [
  {
    family:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  },
  {family: 'Arial, Helvetica Neue, Helvetica, sans-serif'},
  {family: '"Andele Mono", monospace, sans-serif'},
  {family: 'Verdana, Geneva, sans-serif'},
];

export function isBrowserSafeFont(font: Pick<FontConfig, 'family'>): boolean {
  return BrowserSafeFonts.some(safeFont => safeFont.family === font.family);
}

/**
 * Strip metadata that belongs to a different font. The appearance editor
 * replaces one selection with another, so a Google font's `google` flag can
 * survive after switching to a browser-safe family and trigger a Google
 * Fonts request for the system stack.
 */
export function normalizeFontConfig(font: FontConfig): FontConfig {
  if (isBrowserSafeFont(font)) {
    return {family: font.family};
  }
  return font.google === true ? {...font} : {family: font.family};
}

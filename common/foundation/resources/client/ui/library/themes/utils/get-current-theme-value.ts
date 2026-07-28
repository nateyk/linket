import {themeEl} from '@ui/root-el';

export function getCurrentThemeValue(key: string, el?: HTMLElement) {
  return window.getComputedStyle(el ?? themeEl).getPropertyValue(key);
}

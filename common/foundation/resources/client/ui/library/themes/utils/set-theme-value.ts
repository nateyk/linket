export function setThemeValue(key: string, value: string): void {
  document.documentElement.style.setProperty(key, value);
}

export function removeThemeValue(key: string): void {
  document.documentElement.style.removeProperty(key);
}

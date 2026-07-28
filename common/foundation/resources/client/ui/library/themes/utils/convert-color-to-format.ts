import Color from 'colorjs.io';

export function convertColorToFormat(
  color: string,
  format:
    | 'hex'
    | 'rgb'
    | 'hsl'
    | 'hsv'
    | 'cmyk'
    | 'lab'
    | 'lch'
    | 'oklab'
    | 'oklch' = 'hex',
  fallbackColor = '#fff',
): string {
  try {
    return new Color(color).toString({format});
  } catch (e) {
    return new Color(fallbackColor).toString({format});
  }
}

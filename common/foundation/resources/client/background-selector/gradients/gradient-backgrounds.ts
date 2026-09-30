import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import Color from 'colorjs.io';

/**
 * Minimum text contrast the storefront resolvers guarantee when they derive a
 * color themselves. Mirrors the 4.5:1 target `resolveMutedTextColor` already
 * aims for in the biolink appearance resolver.
 */
export const MIN_TEXT_CONTRAST = 4.5;

export type ContrastTextColor = '#000000' | '#ffffff';

/**
 * WCAG contrast ratio between two CSS colors, or `null` when either side does
 * not parse. Same colorjs.io path the storefront resolvers use.
 */
export function measureContrastRatio(
  first: string,
  second: string,
): number | null {
  try {
    const firstColor = new Color(first).to('srgb');
    const secondColor = new Color(second).to('srgb');
    const lighter = Math.max(firstColor.luminance, secondColor.luminance);
    const darker = Math.min(firstColor.luminance, secondColor.luminance);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return null;
  }
}

/**
 * Average paint color of a gradient `backgroundImage`, as hex. Extracts every
 * `#hex` / `rgb()` / `hsl()` stop and averages their sRGB channels, so text
 * resolved against it reads across the whole gradient rather than one end.
 * Returns `null` for image backgrounds (`url(...)`), keyword-only gradients,
 * or anything unparseable — the caller keeps its previous behavior then.
 */
export function sampleGradientAverage(
  backgroundImage: string | undefined,
): string | null {
  if (!backgroundImage || /url\(/i.test(backgroundImage)) {
    return null;
  }

  const tokens =
    backgroundImage.match(
      /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi,
    ) ?? [];
  const coords: Array<[number, number, number]> = [];
  for (const token of tokens) {
    try {
      coords.push(new Color(token).to('srgb').coords as [number, number, number]);
    } catch {
      // Skip stops colorjs.io cannot parse; the remaining stops still sample.
    }
  }
  if (!coords.length) {
    return null;
  }

  const averaged = [0, 1, 2].map(
    index =>
      coords.reduce((sum, channels) => sum + (channels[index] ?? 0), 0) /
      coords.length,
  ) as [number, number, number];
  return new Color('srgb', averaged).toString({format: 'hex'});
}

/**
 * Black or white, whichever contrasts the given background color more. One of
 * the two always clears 4.5:1 against any background, so derived text built on
 * this never ships a failing pair.
 */
export function resolveContrastTextColor(
  background: string,
): ContrastTextColor {
  let backgroundColor: Color | null = null;
  try {
    backgroundColor = new Color(background).to('srgb');
  } catch {
    return '#000000';
  }

  const black = new Color('black');
  const white = new Color('white');
  return contrastRatio(white, backgroundColor) >=
    contrastRatio(black, backgroundColor)
    ? '#ffffff'
    : '#000000';
}

/**
 * Foreground for a picked gradient: black or white from the stops' average
 * luminance. Never `null` — unparseable input falls back to black, matching
 * the appearance editor's default text color.
 */
export function deriveGradientTextColor(
  backgroundImage: string | undefined,
): ContrastTextColor {
  const average = sampleGradientAverage(backgroundImage);
  return average ? resolveContrastTextColor(average) : '#000000';
}

function contrastRatio(first: Color, second: Color): number {
  const lighter = Math.max(first.luminance, second.luminance);
  const darker = Math.min(first.luminance, second.luminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export const GradientBackgrounds: BackgroundSelectorConfig[] = [
  {
    backgroundImage: 'linear-gradient(45deg, #ff9a9e, #fad0c4)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(225, 225, 221), rgb(226, 225, 221), rgb(237, 147, 163), rgb(237, 50, 112), rgb(125, 19, 97), rgb(12, 4, 30))',
  },
  {
    backgroundImage: 'linear-gradient(0deg, #a18cd1, #fbc2eb)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(214, 233, 255), rgb(214, 229, 255), rgb(209, 214, 255), rgb(221, 209, 255), rgb(243, 209, 255), rgb(255, 204, 245))',
  },
  {
    backgroundImage: 'linear-gradient(120deg, #a1c4fd, #c2e9fb)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(254, 205, 215), rgb(254, 205, 251))',
  },
  {
    backgroundImage: 'linear-gradient(0deg, #cfd9df, #e2ebf0)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(9, 9, 9), rgb(22, 22, 22), rgb(36, 36, 36))',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(68, 70, 74), rgb(173, 178, 180))',
  },
  {
    backgroundImage: 'linear-gradient(120deg, #fdfbfb, #ebedee)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(255, 37, 37), rgb(255, 229, 59))',
  },
  {
    backgroundImage: 'linear-gradient(0deg, #a8edea, #fed6e3)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(253, 239, 132), rgb(247, 198, 169), rgb(21, 186, 196))',
  },
  {
    backgroundImage: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
  },
  {
    backgroundImage: 'linear-gradient(135deg, #fdfcfb, #e2d1c3)',
  },
  {
    backgroundImage: 'linear-gradient(0deg, #c1dfc4, #deecdd)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(236, 252, 255), rgb(178, 252, 255), rgb(94, 223, 255), rgb(62, 100, 255))',
  },
  {
    backgroundImage: 'linear-gradient(90deg, #E9E4F0, #D3CCE3)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(217, 244, 255), rgb(255, 143, 167), rgb(93, 104, 255))',
  },
  {
    backgroundImage: 'linear-gradient(90deg, #fffcdc, #d9a7c7)',
  },
  {
    // No shipped `color`: white fails on these stops (2.89/1.55:1), so the
    // text is derived from the gradient luminance (black) instead.
    backgroundImage: 'linear-gradient(90deg, #56ab2f, #a8e063)',
  },
  {
    backgroundImage: 'linear-gradient(90deg, #606c88, #3f4c6b)',
    color: 'rgb(255, 255, 255)',
  },
  {
    backgroundImage: 'linear-gradient(90deg, #ece9e6, #ffffff)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(235, 224, 255), rgb(211, 192, 255), rgb(183, 159, 255))',
  },
  {
    backgroundImage: 'linear-gradient(90deg, #f09819, #edde5d)',
  },
  {
    // No shipped `color`: white fails on the light stop (2.65:1), so the text
    // is derived from the gradient luminance (black) instead.
    backgroundImage: 'linear-gradient(90deg, #b79891, #94716b)',
  },
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(255, 222, 233), rgb(181, 255, 252))',
  },
  {
    backgroundImage: 'linear-gradient(60deg, #29323c, #485563)',
    color: 'rgb(255, 255, 255)',
  },
];

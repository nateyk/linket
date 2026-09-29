import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {BiolinkAppearanceConfigBtnConfigShadow} from '@app/gen/schemas/biolink-appearance-config-btn-config-shadow';
import {cn} from '@ui/utils/cn';
import Color from 'colorjs.io';
import type {CSSProperties} from 'react';

type BiolinkThemeVariables = CSSProperties & {
  '--biolink-text': string;
  '--biolink-muted-text': string;
  '--biolink-surface': string;
  '--biolink-surface-strong': string;
  '--biolink-surface-muted': string;
  '--biolink-border': string;
} & BiolinkRadiusVariables;

type BiolinkRadiusVariables = CSSProperties & {
  '--be-radius-button': string;
  '--be-radius-input': string;
  '--be-radius-card': string;
  '--be-radius-card-sm': string;
  '--be-radius-card-xs': string;
};

type BiolinkRadiusScale = {
  button: string;
  input: string;
  card: string;
  cardSm: string;
  cardXs: string;
};

/**
 * The appearance editor's "Corner roundness" choice is the storefront's radius
 * dimension. One selection remaps every rounded surface of the public page the
 * same way the dashboard's `radius-*` theme utilities do.
 *
 * Two rules hold the scale together:
 *
 * - **Surfaces share one radius.** `card` and `card-sm` are deliberately equal,
 *   so the creator card (which rounds itself with `rounded-card`) and everything
 *   that rounds with `rounded-card-sm` (the About panel, badges, the editor's
 *   cover and avatar previews) can never drift apart — one number, whichever
 *   token a component happens to reach for. `card-xs` stays a step tighter for
 *   media nested inside a framed slot.
 * - **Controls stay crisp.** Buttons keep the control-scale value the selector
 *   previews; fields sit between the two.
 *
 * `systemRadiusScale` is what the page renders before the creator picks a
 * roundness — the core UI tokens themselves, so an untouched Appearance tab
 * renders exactly what it did before the knob existed.
 */
const radiusScales: Record<
  NonNullable<BiolinkAppearanceConfigBtnConfig['radius']>,
  BiolinkRadiusScale
> = {
  'rounded-none': {
    button: '0',
    input: '0',
    card: '0',
    cardSm: '0',
    cardXs: '0',
  },
  'rounded-sm': {
    button: '4px',
    input: '12px',
    card: '16px',
    cardSm: '16px',
    cardXs: '8px',
  },
  'rounded-lg': {
    button: '8px',
    input: '16px',
    card: '24px',
    cardSm: '24px',
    cardXs: '12px',
  },
  'rounded-full': {
    button: '9999px',
    input: '24px',
    card: '32px',
    cardSm: '32px',
    cardXs: '16px',
  },
};

const systemRadiusScale: BiolinkRadiusScale = {
  button: 'var(--radius-3xl)',
  input: 'var(--radius-xl)',
  card: 'var(--radius-3xl)',
  cardSm: 'var(--radius-2xl)',
  cardXs: 'var(--radius-xl)',
};

export function resolveBiolinkRadiusVariables(
  appearance?: BiolinkAppearanceConfig | null,
): BiolinkRadiusVariables {
  const setting = appearance?.btnConfig?.radius;
  const scale = (setting && radiusScales[setting]) || systemRadiusScale;

  return {
    '--be-radius-button': scale.button,
    '--be-radius-input': scale.input,
    '--be-radius-card': scale.card,
    '--be-radius-card-sm': scale.cardSm,
    '--be-radius-card-xs': scale.cardXs,
  };
}

type BiolinkButtonVariables = CSSProperties & {
  '--biolink-button-background': string;
  '--biolink-button-hover': string;
  '--biolink-button-pressed': string;
  '--biolink-button-border': string;
  '--biolink-button-text': string;
  '--biolink-button-focus': string;
};

export interface ResolvedBiolinkButtonAppearance {
  className: string;
  radius: NonNullable<BiolinkAppearanceConfigBtnConfig['radius']>;
  style: CSSProperties;
}

const availableShadows: Record<BiolinkAppearanceConfigBtnConfigShadow, string> =
  {
    none: '',
    soft: 'rgb(0 0 0 / 20%) 0.2rem 0.2rem 0.4rem 0px',
    strong: 'rgb(0 0 0 / 30%) 0.3rem 0.3rem 0.4rem 0px',
    hard: 'rgb(0 0 0 / 75%) 0.3rem 0.4rem 0px',
  };

export function resolveBiolinkButtonAppearance(
  appearance?: BiolinkAppearanceConfig | null,
): ResolvedBiolinkButtonAppearance {
  const variant = appearance?.btnConfig?.variant ?? 'solid';
  const radius = appearance?.btnConfig?.radius ?? 'rounded-sm';
  const shadow = appearance?.btnConfig?.shadow ?? 'none';
  const buttonColor = appearance?.btnConfig?.color;
  const buttonTextColor = appearance?.btnConfig?.textColor;
  const resolvedButtonColor = buttonColor || 'var(--color-primary)';
  const resolvedTextColor =
    buttonTextColor ||
    (variant === 'outline'
      ? 'var(--color-primary)'
      : 'var(--color-primary-foreground)');
  const glassTint = buttonColor || 'rgb(255 255 255)';

  const backgrounds =
    variant === 'glass'
      ? {
          base: `linear-gradient(180deg, rgb(255 255 255 / 10%) 0%, transparent 100%), color-mix(in srgb, ${glassTint} 10%, transparent)`,
          hover: `linear-gradient(180deg, rgb(255 255 255 / 14%) 0%, transparent 100%), color-mix(in srgb, ${glassTint} 18%, transparent)`,
          pressed: `linear-gradient(180deg, rgb(255 255 255 / 8%) 0%, transparent 100%), color-mix(in srgb, ${glassTint} 24%, transparent)`,
        }
      : variant === 'outline'
        ? {
            base: 'transparent',
            hover: `color-mix(in srgb, ${resolvedButtonColor} 10%, transparent)`,
            pressed: `color-mix(in srgb, ${resolvedButtonColor} 16%, transparent)`,
          }
        : {
            base: resolvedButtonColor,
            hover: `color-mix(in srgb, ${resolvedButtonColor} 88%, ${resolvedTextColor})`,
            pressed: `color-mix(in srgb, ${resolvedButtonColor} 80%, ${resolvedTextColor})`,
          };

  const style: BiolinkButtonVariables = {
    '--biolink-button-background': backgrounds.base,
    '--biolink-button-hover': backgrounds.hover,
    '--biolink-button-pressed': backgrounds.pressed,
    '--biolink-button-border':
      variant === 'glass' ? 'transparent' : resolvedButtonColor,
    '--biolink-button-text': resolvedTextColor,
    '--biolink-button-focus': resolvedButtonColor,
    boxShadow: availableShadows[shadow],
    backdropFilter:
      variant === 'glass'
        ? 'blur(20px) brightness(1.1) contrast(0.9)'
        : undefined,
  };

  return {
    radius,
    className: cn(
      'border-[var(--biolink-button-border)]! text-[var(--biolink-button-text)]! transition-button duration-200 [background:var(--biolink-button-background)]! hover:[background:var(--biolink-button-hover)]! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--biolink-button-focus)]! active:[background:var(--biolink-button-pressed)]! data-pressed:[background:var(--biolink-button-pressed)]!',
      radius,
    ),
    style,
  };
}

/**
 * Radius classes for surfaces that carry content (the creator card, its cover
 * and avatar, the About panel) as opposed to controls.
 */
export type BiolinkContainerRadius =
  | 'rounded-none'
  | 'rounded-card-sm'
  | 'rounded-card'
  | 'rounded-4xl';

export interface ResolvedBiolinkContainerRadius {
  /** Pass to `cn()` on the card shell, its cover and the About panel. */
  className: BiolinkContainerRadius;
  /**
   * Pass to `cn()` on media framed by a card — the profile avatar. Tracks
   * `className` everywhere except Full, where framed media earns a true circle
   * and only the shell has to hold back.
   */
  avatarClassName: BiolinkContainerRadius | 'rounded-full';
  /** Raw CSS length, for surfaces that can't take a class (crop frames). */
  value: string;
  /** Raw CSS length matching `avatarClassName` — the avatar's crop frame. */
  avatarValue: string;
}

/**
 * The creator's "Corner roundness" choice, read at the container scale. One
 * setting drives every corner, but the same four options have to grow with the
 * surface: `rounded-sm` is a soft button and a sharp card, so containers step
 * up to the core UI radius tokens instead of the control-scale values.
 *
 * "Full" deliberately stops at `rounded-4xl` for the shell. A shell is a tall
 * box, so a capsule radius resolves to half its width — roughly 180px — and the
 * arc would sweep through the socials and branding rows and clip them off the
 * `overflow-hidden` card. Full spends its roundness on the avatar and the
 * controls instead, where a capsule is the point.
 */
const containerRadiusForSetting: Record<
  NonNullable<BiolinkAppearanceConfigBtnConfig['radius']>,
  BiolinkContainerRadius
> = {
  'rounded-none': 'rounded-none',
  'rounded-sm': 'rounded-card-sm',
  'rounded-lg': 'rounded-card',
  'rounded-full': 'rounded-4xl',
};

const avatarRadiusForSetting: Record<
  NonNullable<BiolinkAppearanceConfigBtnConfig['radius']>,
  ResolvedBiolinkContainerRadius['avatarClassName']
> = {
  ...containerRadiusForSetting,
  'rounded-full': 'rounded-full',
};

/**
 * Raw length each container class resolves to *inside* the page.
 *
 * The card tokens can't be handed out as `var(--radius-card*)`: the page
 * remaps `--be-radius-*` for the chosen roundness, while the crop dialog is
 * portalled into the dashboard, where the same token resolves to the
 * dashboard's own radius. So the token classes read their length from the very
 * scale the page remaps with, and the two classes that don't go through
 * `--be-radius-*` keep their token (same document, same value).
 */
const containerRadiusLength: Record<
  BiolinkContainerRadius | 'rounded-full',
  (radius: BiolinkRadiusVariables) => string
> = {
  'rounded-none': () => '0px',
  'rounded-card-sm': radius => radius['--be-radius-card-sm'],
  'rounded-card': radius => radius['--be-radius-card'],
  'rounded-4xl': () => 'var(--radius-4xl)',
  'rounded-full': () => '9999px',
};

/**
 * Container radius for a profile surface. Falls back to the core UI card token
 * when the creator hasn't picked a roundness, so an untouched Appearance tab
 * keeps rendering the theme default.
 */
export function resolveBiolinkContainerRadius(
  appearance?: BiolinkAppearanceConfig | null,
): ResolvedBiolinkContainerRadius {
  const setting = appearance?.btnConfig?.radius;
  const className =
    (setting && containerRadiusForSetting[setting]) || 'rounded-card';
  const avatarClassName =
    (setting && avatarRadiusForSetting[setting]) || className;
  const radius = resolveBiolinkRadiusVariables(appearance);

  return {
    className,
    avatarClassName,
    value: containerRadiusLength[className](radius),
    avatarValue: containerRadiusLength[avatarClassName](radius),
  };
}

export function resolveBiolinkThemeVariables(
  appearance?: BiolinkAppearanceConfig | null,
): BiolinkThemeVariables {
  const foreground = appearance?.bgConfig?.color;

  if (!foreground) {
    return {
      ...resolveBiolinkRadiusVariables(appearance),
      '--biolink-text': 'var(--color-foreground)',
      '--biolink-muted-text': 'var(--color-muted-foreground)',
      '--biolink-surface':
        'color-mix(in srgb, var(--color-background) 84%, transparent)',
      '--biolink-surface-strong':
        'color-mix(in srgb, var(--color-background) 94%, transparent)',
      '--biolink-surface-muted':
        'color-mix(in srgb, var(--color-muted) 82%, transparent)',
      '--biolink-border':
        'color-mix(in srgb, var(--color-foreground) 12%, transparent)',
    };
  }

  const foregroundColor = parseColor(foreground);
  if (!foregroundColor) {
    return {
      ...resolveBiolinkThemeVariables(),
      ...resolveBiolinkRadiusVariables(appearance),
    };
  }

  const surfaceColor = chooseHighestContrastSurface(foregroundColor);
  const surfaceBase = surfaceColor.toString({format: 'hex'});
  const mutedText = resolveMutedTextColor(foregroundColor, surfaceColor);

  return {
    ...resolveBiolinkRadiusVariables(appearance),
    '--biolink-text': foreground,
    '--biolink-muted-text': mutedText,
    '--biolink-surface': `color-mix(in srgb, ${surfaceBase} 96%, transparent)`,
    '--biolink-surface-strong': `color-mix(in srgb, ${surfaceBase} 99%, transparent)`,
    '--biolink-surface-muted': `color-mix(in srgb, ${surfaceBase} 90%, transparent)`,
    '--biolink-border': `color-mix(in srgb, ${foreground} 24%, transparent)`,
  };
}

export function shouldUseLightBiolinkLogo(
  appearance: BiolinkAppearanceConfig | null | undefined,
  fallback: boolean,
): boolean {
  const foreground = appearance?.bgConfig?.color;
  return foreground ? isLightColor(foreground) : fallback;
}

function isLightColor(color: string): boolean {
  const parsedColor = parseColor(color);
  return parsedColor ? parsedColor.luminance > 0.5 : false;
}

function parseColor(color: string): Color | null {
  try {
    return new Color(color).to('srgb');
  } catch {
    return null;
  }
}

function chooseHighestContrastSurface(foreground: Color): Color {
  const black = new Color('black');
  const white = new Color('white');

  return contrastRatio(foreground, black) >= contrastRatio(foreground, white)
    ? black
    : white;
}

function resolveMutedTextColor(foreground: Color, surface: Color): string {
  const foregroundCoordinates = foreground.to('srgb').coords as number[];
  const surfaceCoordinates = surface.to('srgb').coords as number[];

  for (const foregroundWeight of [0.88, 0.92, 0.96, 1]) {
    const mixedCoords = foregroundCoordinates.map(
      (channel, index) =>
        channel * foregroundWeight +
        (surfaceCoordinates[index] as number) * (1 - foregroundWeight),
    ) as [number, number, number];
    const mixed = new Color('srgb', mixedCoords);

    if (contrastRatio(mixed, surface) >= 4.5) {
      return mixed.toString({format: 'hex'});
    }
  }

  return foreground.toString({format: 'hex'});
}

function contrastRatio(first: Color, second: Color): number {
  const lighter = Math.max(first.luminance, second.luminance);
  const darker = Math.min(first.luminance, second.luminance);

  return (lighter + 0.05) / (darker + 0.05);
}

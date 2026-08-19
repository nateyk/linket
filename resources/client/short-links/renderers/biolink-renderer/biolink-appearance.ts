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
};

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

export function resolveBiolinkThemeVariables(
  appearance?: BiolinkAppearanceConfig | null,
): BiolinkThemeVariables {
  const foreground = appearance?.bgConfig?.color;

  if (!foreground) {
    return {
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
    return resolveBiolinkThemeVariables();
  }

  const surfaceColor = chooseHighestContrastSurface(foregroundColor);
  const surfaceBase = surfaceColor.toString({format: 'hex'});
  const mutedText = resolveMutedTextColor(foregroundColor, surfaceColor);

  return {
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
    const mixed = new Color(
      'srgb',
      foregroundCoordinates.map(
        (channel, index) =>
          channel * foregroundWeight +
          surfaceCoordinates[index] * (1 - foregroundWeight),
      ),
    );

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

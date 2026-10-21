import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkAppearanceConfigBgConfig} from '@app/gen/schemas/biolink-appearance-config-bg-config';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {BiolinkAppearanceConfigBtnConfigShadow} from '@app/gen/schemas/biolink-appearance-config-btn-config-shadow';
import {
  measureContrastRatio,
  MIN_TEXT_CONTRAST,
  resolveContrastTextColor,
  sampleGradientAverage,
} from '@common/background-selector/gradients/gradient-backgrounds';
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
  '--biolink-accent': string;
  '--biolink-accent-foreground': string;
  '--biolink-focus': string;
  // Site token remap for painted stores. Primitives that still paint with
  // dashboard tokens read these so they resolve inside the buyer world.
  '--be-foreground'?: string;
  '--be-muted-foreground'?: string;
  '--be-background'?: string;
  '--be-card'?: string;
  '--be-card-foreground'?: string;
  '--be-popover'?: string;
  '--be-popover-foreground'?: string;
  '--be-muted'?: string;
  '--be-secondary'?: string;
  '--be-secondary-foreground'?: string;
  '--be-accent'?: string;
  '--be-accent-foreground'?: string;
  '--be-border'?: string;
  '--be-input'?: string;
  '--be-primary'?: string;
  '--be-primary-foreground'?: string;
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
 * Round (`rounded-sm`) is the calm step: cards render at 8px
 * (`--radius-lg`), exactly the admin theme's Round (`.radius-sm`) card, with
 * buttons at 4px and fields at 12px. Each step up grows every surface together
 * (`rounded-lg`: 8px / 16px / 24px; `rounded-full`: capsule controls, 24px
 * fields, 32px cards).
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
    card: '8px',
    cardSm: '8px',
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

/**
 * Shared edge for storefront surface chrome (creator card, about panel,
 * product cards, bottom nav). One `--biolink-border` ring — never a CSS
 * border stacked on a ring (that made the nav read heavier than the cards).
 * `border-0` clears BottomNavBar's default `border` so all surfaces match.
 *
 * Depth from Appearance → Buttons → Shadow is applied separately via the
 * resolved button `boxShadow` inline style on creator, about, and product
 * surfaces (and on actions). Shared ring keeps every surface edge matched.
 */
export const biolinkSurfaceEdgeClassName =
  'border-0 ring-1 ring-(color:--biolink-border)';

/**
 * Segmented Tabs chrome for the public store (Products/About + product-page
 * sections). Roundness follows Appearance → Corner roundness via
 * `rounded-button`; active fill/label/shadow follow Buttons tokens so the
 * strip stays in step with View / Buy / bottom-nav actions.
 *
 * Soft / Strong / Hard shadows need inset room inside the track — the same
 * soft-pop offset the Appearance button preview uses — otherwise the cast
 * bleeds past a 4px pad and reads clipped against the page. The inset stays
 * symmetric so the active pill sits centred rather than hugging the top-left.
 */
export function resolveBiolinkSegmentedTabsAppearance(
  appearance?: BiolinkAppearanceConfig | null,
): {
  listClassName: string;
  indicatorClassName: string;
  tabClassName: string;
  style: CSSProperties;
} {
  const button = resolveBiolinkButtonAppearance(appearance);
  const {
    boxShadow = '',
    backdropFilter: _backdrop,
    ...buttonVars
  } = button.style as CSSProperties & {
    boxShadow?: string;
    backdropFilter?: string;
  };
  const hasPopShadow = Boolean(boxShadow);

  return {
    listClassName: cn(
      // Solid track (not washed muted) so the active pill + soft-pop cast
      // read like the dashboard Appearance preview / soft-pop segmented control.
      // Must beat Tabs.List's `group-data-horizontal/tabs:h-9` — plain `h-auto`
      // does not conflict with that variant in twMerge, and a fixed 36px height
      // crushes the soft-pop inset padding below.
      'h-auto max-w-full justify-start gap-1 overflow-visible rounded-button bg-[var(--biolink-surface-strong)] text-[var(--biolink-muted-text)] group-data-horizontal/tabs:h-auto',
      // p-2 (8px) contains the Strong/Hard cast (≤7px) on every side — the
      // previous pe-3/pb-3 inset the pill toward the top-left. No-shadow keeps
      // the tighter p-1.
      hasPopShadow ? 'p-2' : 'p-1',
      biolinkSurfaceEdgeClassName,
    ),
    indicatorClassName:
      'rounded-button [background:var(--biolink-button-background)]! [box-shadow:var(--biolink-tab-active-shadow,none)]',
    tabClassName:
      'flex-none rounded-button px-4 py-2 text-sm font-medium text-[var(--biolink-text)]/75 not-data-active:hover:text-[var(--biolink-text)] data-active:text-[var(--biolink-button-text)]! pointer-coarse:min-h-11',
    style: {
      ...buttonVars,
      '--biolink-tab-active-shadow': boxShadow || 'none',
    } as CSSProperties,
  };
}

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
  const parsedButtonText = buttonTextColor ? parseColor(buttonTextColor) : null;

  // The painted page behind the buttons. Every field is null on a default
  // appearance, where the theme tokens below stay in charge: the default
  // primary pair is scheme-correct by design in both color schemes.
  const background = resolveBackgroundContext(appearance?.bgConfig);
  const seats = [background.surface, background.sample].filter(
    (seat): seat is Color => seat !== null,
  );

  // Face fill for solid, wash tint for glass, stroke for outline.
  let face: string;
  // Label color.
  let label: string;
  // Focus ring color.
  let focus: string;

  if (variant === 'outline') {
    // Transparent face: the stroke must read on the surface it sits on — the
    // card face first, the raw background second — so an unset stroke derives
    // black/white from those seats instead of a scheme-dependent primary that
    // fails on black cards and dark gradients.
    face =
      buttonColor ??
      buttonTextColor ??
      (seats.length > 0
        ? strongestAgainstSeats(seats)
        : 'var(--color-primary)');
    label =
      buttonTextColor ??
      (isCssVariable(face) ||
      seats.length === 0 ||
      passesAgainstSeats(face, seats)
        ? face
        : strongestAgainstSeats(seats));
    focus = face;
  } else if (variant === 'glass') {
    // Translucent face over the page: tint from the explicit color, the label
    // color, or the page foreground; the label derives from the tinted face so
    // it never defaults to near-white text on a whitish face.
    face =
      buttonColor ??
      buttonTextColor ??
      background.foreground ??
      'rgb(255 255 255)';
    const tintedFace = resolveGlassFace(face, background.sample);
    label =
      buttonTextColor ??
      (tintedFace
        ? resolveContrastTextColor(tintedFace)
        : 'var(--color-foreground)');
    focus = label;
  } else {
    // Solid: a set fill gets a derived label (a white fill with the default
    // white text is 1.03:1 today) and a set label gets a derived fill; unset
    // sides echo the page foreground so the pair stays concrete — identical in
    // both OS color schemes — whenever a custom background is painted.
    face =
      buttonColor ??
      (parsedButtonText && buttonTextColor
        ? resolveContrastTextColor(buttonTextColor)
        : (background.foreground ?? 'var(--color-primary)'));
    const parsedFace = parseColor(face);
    label =
      buttonTextColor ??
      (parsedFace
        ? resolveContrastTextColor(face)
        : 'var(--color-primary-foreground)');
    focus = face;
  }

  const backgrounds =
    variant === 'glass'
      ? {
          base: `linear-gradient(180deg, rgb(255 255 255 / 10%) 0%, transparent 100%), color-mix(in srgb, ${face} 10%, transparent)`,
          hover: `linear-gradient(180deg, rgb(255 255 255 / 14%) 0%, transparent 100%), color-mix(in srgb, ${face} 18%, transparent)`,
          pressed: `linear-gradient(180deg, rgb(255 255 255 / 8%) 0%, transparent 100%), color-mix(in srgb, ${face} 24%, transparent)`,
        }
      : variant === 'outline'
        ? {
            base: 'transparent',
            hover: `color-mix(in srgb, ${face} 10%, transparent)`,
            pressed: `color-mix(in srgb, ${face} 16%, transparent)`,
          }
        : {
            base: face,
            hover: `color-mix(in srgb, ${face} 88%, ${label})`,
            pressed: `color-mix(in srgb, ${face} 80%, ${label})`,
          };

  const style: BiolinkButtonVariables = {
    '--biolink-button-background': backgrounds.base,
    '--biolink-button-hover': backgrounds.hover,
    '--biolink-button-pressed': backgrounds.pressed,
    '--biolink-button-border': variant === 'glass' ? 'transparent' : face,
    '--biolink-button-text': label,
    '--biolink-button-focus': focus,
    boxShadow: availableShadows[shadow],
    backdropFilter:
      variant === 'glass'
        ? 'blur(20px) brightness(1.1) contrast(0.9)'
        : undefined,
  };

  return {
    radius,
    // Round through --be-radius-button (remapped on the page root from the
    // Appearance knob). Applying the setting utility class (rounded-sm|lg|…)
    // would bypass that remap and disagree with every other surface.
    className: cn(
      'rounded-button border-[var(--biolink-button-border)]! text-[var(--biolink-button-text)]! transition-button duration-200 [background:var(--biolink-button-background)]! hover:[background:var(--biolink-button-hover)]! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--biolink-button-focus)]! active:[background:var(--biolink-button-pressed)]! data-pressed:[background:var(--biolink-button-pressed)]!',
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
  const radius = resolveBiolinkRadiusVariables(appearance);
  const background = resolveBackgroundContext(appearance?.bgConfig);

  if (!background.foreground || !background.foregroundColor) {
    return {
      ...radius,
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
      // Unpainted stores stay on the theme pair, exactly as consumers find it
      // in their own `var(--biolink-accent, var(--color-primary))` fallbacks.
      '--biolink-accent': 'var(--color-primary)',
      '--biolink-accent-foreground': 'var(--color-primary-foreground)',
      '--biolink-focus': 'var(--be-primary)',
    };
  }

  const surfaceColor = chooseHighestContrastSurface(background.foregroundColor);
  const surfaceBase = surfaceColor.toString({format: 'hex'});
  const mutedText = resolveMutedTextColor(
    background.foregroundColor,
    surfaceColor,
  );
  const accent = resolveAccentPair(surfaceColor);

  return {
    ...radius,
    '--biolink-text': background.foreground,
    '--biolink-muted-text': mutedText,
    '--biolink-surface': `color-mix(in srgb, ${surfaceBase} 96%, transparent)`,
    '--biolink-surface-strong': `color-mix(in srgb, ${surfaceBase} 99%, transparent)`,
    '--biolink-surface-muted': `color-mix(in srgb, ${surfaceBase} 90%, transparent)`,
    '--biolink-border': `color-mix(in srgb, ${background.foreground} 24%, transparent)`,
    '--biolink-accent': accent.accent,
    '--biolink-accent-foreground': accent.accentForeground,
    '--biolink-focus': accent.focus,
    // Claim the whole site token set for the painted store: primitives that
    // still paint with dashboard tokens (outline buttons, accordion
    // chevrons, badges, hover washes) would otherwise flip under a dark OS
    // scheme while the store keeps its painted surface, ghosting their
    // labels out on the seller card. Everything inside resolves in-world
    // instead. Destructive stays site-owned (visibility is scheme-safe),
    // and the unpainted branch above needs no remap — its storefront sits
    // directly on the site theme, so the tokens stay coherent there.
    '--be-foreground': 'var(--biolink-text)',
    '--be-muted-foreground': 'var(--biolink-muted-text)',
    '--be-background': 'var(--biolink-surface-strong)',
    '--be-card': 'var(--biolink-surface-strong)',
    '--be-card-foreground': 'var(--biolink-text)',
    '--be-popover': 'var(--biolink-surface-strong)',
    '--be-popover-foreground': 'var(--biolink-text)',
    '--be-muted': 'var(--biolink-surface-muted)',
    '--be-secondary': 'var(--biolink-surface-muted)',
    '--be-secondary-foreground': 'var(--biolink-text)',
    '--be-accent': 'var(--biolink-surface-muted)',
    '--be-accent-foreground': 'var(--biolink-text)',
    '--be-border': 'var(--biolink-border)',
    '--be-input': 'var(--biolink-border)',
    '--be-primary': 'var(--biolink-accent)',
    '--be-primary-foreground': 'var(--biolink-accent-foreground)',
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
  return parsedColor ? isLightSurface(parsedColor) : false;
}

/**
 * The file's single darkness test — sRGB relative luminance above 0.5 —
 * shared by the logo choice and the accent derivation so the surface and the
 * pair drawn on it can never disagree about which one is "light".
 */
function isLightSurface(color: Color): boolean {
  return color.luminance > 0.5;
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

interface BiolinkAccentPair {
  /** Accent text / link color on the chosen surface. */
  accent: string;
  /** Label on a solid accent fill. */
  accentForeground: string;
  /** Focus ring drawn on the chosen surface. */
  focus: string;
}

/**
 * The accent pair for a *painted* panel, read off the surface this file
 * already derived for it ({@link chooseHighestContrastSurface}) — the same
 * luminance test {@link isLightSurface} applies everywhere else, never a
 * second darkness check.
 *
 * Counter Blue is pinned at 46% lightness so it clears AA on the theme's own
 * grounds, but that pin leaves it at 2.80:1 on the near-black surface a
 * light-on-dark painted panel resolves to — failing both accent text (4.5:1)
 * and the focus ring (3:1), and injecting a second, darker blue that reads as
 * a different accent. Dark surfaces therefore get **Counter Blue Light**
 * (`oklch(88.2% 0.059 254.128)`), the lifted twin DESIGN.md ships as the
 * dark-mode primary, with its label flipped to Soft Ink: 14.76:1 as accent
 * text and focus ring on black, 11.32:1 for the label on the accent fill.
 * No CSS var names that blue independently of the OS scheme — `--color-primary`
 * follows `--be-primary`, which only holds the lifted value in the dark
 * scheme — so the literal is the scheme-independent choice here.
 *
 * A light surface gets the same scheme-independent treatment, mirrored:
 * `var(--color-primary)` only holds Counter Blue while the OS scheme is
 * light — a dark OS scheme flips it to the 88.2% lifted twin, which lands
 * at 1.42:1 on that very light surface. The literal `oklch(46% 0.214
 * 259.815)` (DESIGN.md Counter Blue = `#0049cc`, 7.43:1 on white) with its
 * label `oklch(0.9911 0 190.05)` (7.25:1 on the fill) renders identically
 * in both schemes, exactly matching what an unpainted store shows under
 * the light scheme these painted panels emulate.
 */
function resolveAccentPair(surface: Color): BiolinkAccentPair {
  if (isLightSurface(surface)) {
    return {
      accent: 'oklch(46% 0.214 259.815)',
      accentForeground: 'oklch(0.9911 0 190.05)',
      focus: 'oklch(46% 0.214 259.815)',
    };
  }

  return {
    accent: 'oklch(88.2% 0.059 254.128)',
    accentForeground: 'oklch(0.2478 0 0)',
    focus: 'oklch(88.2% 0.059 254.128)',
  };
}

interface BiolinkBackgroundContext {
  /**
   * Concrete page foreground: the explicit `bgConfig.color`, or black/white
   * derived from the painted background's luminance when the explicit color
   * is absent, unusable, or stale-carried onto a gradient/image it fails on.
   * Null on a default appearance, where theme tokens stay in charge.
   */
  foreground: string | null;
  foregroundColor: Color | null;
  /** Card-surface sample once the foreground is known, else null. */
  surface: Color | null;
  /**
   * Raw painted-background sample — gradient stop average, solid color, or an
   * image's `backgroundColor` fallback — else null when unknowable.
   */
  sample: Color | null;
}

/**
 * The systemic fix: appearance resolution finally reads the background it
 * paints on. Samples the effective background (`backgroundImage` gradient
 * average first, `backgroundColor` fallback) and derives a concrete
 * foreground from its luminance whenever the effective one contrasts the face
 * below {@link MIN_TEXT_CONTRAST} — absent or stale-carried alike. Explicit
 * colors that already pass, white on dark faces included, come back untouched;
 * solid backgrounds keep today's verbatim behavior.
 */
function resolveBackgroundContext(
  bgConfig?: BiolinkAppearanceConfigBgConfig | null,
): BiolinkBackgroundContext {
  let sample: Color | null = null;
  if (bgConfig?.backgroundImage) {
    const average = sampleGradientAverage(bgConfig.backgroundImage);
    sample = average ? parseColor(average) : null;
  }
  if (!sample && bgConfig?.backgroundColor) {
    sample = parseColor(bgConfig.backgroundColor);
  }

  const explicitColor = bgConfig?.color || null;
  const parsedExplicit = explicitColor ? parseColor(explicitColor) : null;

  let foreground: string | null = null;
  let foregroundColor: Color | null = null;
  if (parsedExplicit && explicitColor) {
    if (bgConfig?.backgroundImage && sample) {
      const sampleHex = sample.toString({format: 'hex'});
      const ratio = measureContrastRatio(explicitColor, sampleHex);
      if (ratio !== null && ratio < MIN_TEXT_CONTRAST) {
        foreground = resolveContrastTextColor(sampleHex);
        foregroundColor = parseColor(foreground);
      } else {
        foreground = explicitColor;
        foregroundColor = parsedExplicit;
      }
    } else {
      foreground = explicitColor;
      foregroundColor = parsedExplicit;
    }
  } else if (!parsedExplicit && sample) {
    foreground = resolveContrastTextColor(sample.toString({format: 'hex'}));
    foregroundColor = parseColor(foreground);
  }

  return {
    foreground,
    foregroundColor,
    surface:
      foregroundColor != null
        ? chooseHighestContrastSurface(foregroundColor)
        : null,
    sample,
  };
}

/**
 * Black or white, whichever reads best across every seat a transparent-face
 * button can sit on (card face, raw background). Maximizes the worst seat, so
 * the stroke never inherits a scheme-dependent default that vanishes on one.
 */
function strongestAgainstSeats(seats: Color[]): '#000000' | '#ffffff' {
  const black = new Color('black');
  const white = new Color('white');
  const worstSeat = (candidate: Color) =>
    Math.min(...seats.map(seat => contrastRatio(candidate, seat)));

  return worstSeat(white) >= worstSeat(black) ? '#ffffff' : '#000000';
}

function passesAgainstSeats(color: string, seats: Color[]): boolean {
  const parsed = parseColor(color);
  if (!parsed) {
    return false;
  }

  return seats.every(seat => contrastRatio(parsed, seat) >= MIN_TEXT_CONTRAST);
}

/**
 * Approximates the rendered glass face for label derivation: a 10% tint wash
 * plus the white sheen gradient (averaged at ~5%) over the page background.
 * Null when the background is unknowable and the caller must fall back to a
 * theme-aware token instead.
 */
function resolveGlassFace(
  tint: string,
  background: Color | null,
): string | null {
  if (!background) {
    return null;
  }

  const tintColor = parseColor(tint) ?? new Color('white');
  const wash = tintColor.mix(background, 0.9, {space: 'srgb'});
  return new Color('white')
    .mix(wash, 0.95, {space: 'srgb'})
    .toString({format: 'hex'});
}

function isCssVariable(value: string): boolean {
  return value.trimStart().startsWith('var(');
}

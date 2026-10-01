/**
 * Shared surface recipes for the public product page. Every panel on this
 * screen sits on the store's painted appearance background, so panels use the
 * biolink surface variables instead of `bg-card`. Each variable carries a
 * CSS-level fallback mirroring biolink-appearance.ts's no-theme defaults, so
 * a panel still renders correctly where the variables are not set. Surfaces
 * are separated by their ring alone — no resting shadow and no backdrop blur
 * (Flat-By-Default).
 */
export const biolinkSurfaceCard =
  'gap-0 overflow-hidden bg-[var(--biolink-surface-strong,color-mix(in_srgb,var(--color-background)_94%,transparent))] py-0 text-[var(--biolink-text,var(--color-foreground))] ring-1 ring-[var(--biolink-border,color-mix(in_srgb,var(--color-foreground)_12%,transparent))]';

export const biolinkSurfaceContent = 'flex min-w-0 flex-col gap-5 p-5 sm:p-6';

export const biolinkSectionTitle =
  'text-lg font-semibold tracking-tight text-[var(--biolink-text,var(--color-foreground))]';

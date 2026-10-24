import {biolinkSurfaceEdgeClassName} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {cn} from '@ui/utils/cn';

/**
 * Shared surface recipes for the public product page. Panels sit on the
 * store's painted appearance background and must match storefront chrome:
 * the same `--biolink-border` ring (`biolinkSurfaceEdgeClassName`) and the
 * Appearance → Buttons → Shadow soft-pop via `--biolink-surface-shadow`
 * (set once on PublicProductShell). CSS fallbacks keep panels readable when
 * theme variables are unset.
 */
export const biolinkSurfaceCard = cn(
  'gap-0 overflow-hidden bg-[var(--biolink-surface-strong,color-mix(in_srgb,var(--color-background)_94%,transparent))] py-0 text-[var(--biolink-text,var(--color-foreground))] [box-shadow:var(--biolink-surface-shadow,none)]',
  biolinkSurfaceEdgeClassName,
);

export const biolinkSurfaceContent = 'flex min-w-0 flex-col gap-5 p-5 sm:p-6';

export const biolinkSectionTitle =
  'text-lg font-semibold tracking-tight text-[var(--biolink-text,var(--color-foreground))]';

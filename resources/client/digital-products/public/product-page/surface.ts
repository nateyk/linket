/**
 * Shared surface recipes for the public product page. Every panel on this
 * screen sits on the store's painted appearance background, so panels use the
 * biolink surface variables (which fall back to core tokens when the store has
 * no custom theme) instead of `bg-card`.
 */
export const biolinkSurfaceCard =
  'gap-0 overflow-hidden bg-[var(--biolink-surface-strong)] py-0 text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)] backdrop-blur-xl';

export const biolinkSurfaceContent = 'flex min-w-0 flex-col gap-5 p-5 sm:p-6';

export const biolinkSectionTitle =
  'text-lg font-semibold tracking-tight text-[var(--biolink-text)]';

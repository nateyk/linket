import {
  Collapsible,
  CollapsibleContent,
} from '@shadcn/collapsible/collapsible';
import {cn} from '@ui/utils/cn';
import type {ComponentProps} from 'react';

/**
 * Shared, quiet section frame for Content and Appearance. Reuses the core
 * storefront-editor card and border tokens with a subtle bottom-only drop
 * shadow when expanded (`data-open:shadow-bottom`) instead of heavy full-card elevation.
 */
export function BuilderCollapsible({
  className,
  ...props
}: ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      className={cn(
        'w-full overflow-hidden rounded-card-sm border border-border bg-card transition-shadow data-open:shadow-bottom motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  );
}

/** The panel stays inside the same frame as its trigger, with one divider. */
export function BuilderCollapsibleContent({
  className,
  children,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className="motion-reduce:transition-none"
      {...props}
    >
      <div className={cn('border-t border-border px-4 py-4', className)}>
        {children}
      </div>
    </CollapsibleContent>
  );
}

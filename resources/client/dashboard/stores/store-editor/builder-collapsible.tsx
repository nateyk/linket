import {
  Collapsible,
  CollapsibleContent,
} from '@shadcn/collapsible/collapsible';
import {cn} from '@ui/utils/cn';
import type {ComponentProps} from 'react';

/**
 * Shared, quiet section frame for Content and Appearance. Reuses the core
 * storefront-editor card, border, and muted hover tokens in both themes.
 */
export function BuilderCollapsible({
  className,
  ...props
}: ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      className={cn(
        'w-full overflow-hidden rounded-card-sm border border-border bg-card transition-colors data-open:border-foreground/15',
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
      <div className={cn('border-t border-border/70 px-4 py-4', className)}>
        {children}
      </div>
    </CollapsibleContent>
  );
}

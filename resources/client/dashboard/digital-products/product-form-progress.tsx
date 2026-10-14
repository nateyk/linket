// resources/client/dashboard/digital-products/product-form-progress.tsx
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

/**
 * Shared progress pattern for product setup: rendered by the create wizard,
 * the course setup page and the product edit page so all three show one
 * indicator with one vocabulary. Copy variants are literal <Trans> messages
 * here (not free-form props) so the translation extractor keeps every string
 * in the catalog.
 */
export function ProductFormProgress({
  completed,
  total,
  messageVariant = 'sections',
}: {
  /**
   * How much is actually done: completed sections (edit/course pages) or
   * fully-passed wizard steps (the create wizard). It drives the bar fill,
   * so an unfinished current step never counts toward it.
   */
  completed: number;
  total: number;
  /**
   * Which ratio line to show. Pages omit it and get the default
   * required-sections wording; the create wizard asks for steps.
   */
  messageVariant?: 'sections' | 'steps';
}) {
  // Final-fix item 3: the SR-only label goes through trans() like the
  // neighbouring aria-labels (e.g. the wizard nav in product-create-wizard).
  const {trans} = useTrans();
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message="Product setup" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {messageVariant === 'steps' ? (
            // `completed` counts passed steps (0-based), so the reader's
            // POSITION is completed + 1: "Step 1 of 2" with an empty bar is
            // honest — nothing is finished yet — and the bar never snaps to
            // 100% (or jumps when the billing choice changes the step count)
            // before the creator actually continues.
            <Trans
              message="Step :current of :total"
              values={{current: completed + 1, total}}
            />
          ) : (
            <Trans
              message=":completed of :total required sections complete"
              values={{completed, total}}
            />
          )}
        </p>
      </div>
      <Progress.Root
        value={(completed / total) * 100}
        className="w-full lg:w-48"
        aria-label={trans({message: 'Product setup progress'})}
      >
        <Progress.Track className="h-2">
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}

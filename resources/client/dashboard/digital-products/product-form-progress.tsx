// resources/client/dashboard/digital-products/product-form-progress.tsx
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

/**
 * Shared progress pattern for product create → setup → edit.
 * - `sections` (edit/course forms): "Product setup" + section ratio
 * - `steps` (create wizard): only "Step X of Y" — never "Product setup",
 *   so the decision modal does not claim setup has started
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
  const {trans} = useTrans();
  const isSteps = messageVariant === 'steps';
  const ariaLabel = isSteps
    ? trans({message: 'Product creation progress'})
    : trans({message: 'Product setup progress'});

  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {isSteps ? (
          // Distill: one line — position only. No "Product setup" heading.
          <p className="text-sm font-medium">
            <Trans
              message="Step :current of :total"
              values={{current: completed + 1, total}}
            />
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              <Trans message="Product setup" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Trans
                message=":completed of :total required sections complete"
                values={{completed, total}}
              />
            </p>
          </>
        )}
      </div>
      <Progress.Root
        value={(completed / total) * 100}
        className="w-full lg:w-48"
        aria-label={ariaLabel}
      >
        <Progress.Track className="h-2">
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}

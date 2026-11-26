// resources/client/dashboard/digital-products/product-form-progress.tsx
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import type {ReactNode} from 'react';

/**
 * Shared progress pattern for product create → setup → edit.
 * - `sections` (edit/course forms): heading + section ratio
 * - `steps` (create wizard): only "Step X of Y" — never a setup heading,
 *   so the decision modal does not claim setup has started
 */
export function ProductFormProgress({
  completed,
  total,
  messageVariant = 'sections',
  heading = <Trans message="Product setup" />,
  progressAriaLabel = 'Product setup progress',
  className,
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
  /** Sections heading. Course create passes Course setup. */
  heading?: ReactNode;
  /** Progressbar aria-label for the sections variant. */
  progressAriaLabel?: string;
  /** Optional chrome overrides (e.g. drop the page divider inside a status panel). */
  className?: string;
}) {
  const {trans} = useTrans();
  const isSteps = messageVariant === 'steps';
  const ariaLabel = isSteps
    ? trans({message: 'Product creation progress'})
    : progressAriaLabel
    ? trans({message: progressAriaLabel})
    : trans({message: 'Product setup progress'});

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {isSteps ? (
          // Distill: one line — position only. No setup heading.
          <p className="text-sm font-medium">
            <Trans
              message="Step :current of :total"
              values={{current: completed + 1, total}}
            />
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {heading ?? <Trans message="Product setup" />}
            </p>
            <p className="text-sm text-muted-foreground">
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

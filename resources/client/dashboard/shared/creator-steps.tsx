import {Button} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon} from 'lucide-react';

export interface CreatorStep<Id extends string> {
  id: Id;
  title: string;
  description: string;
}

interface CreatorStepsProps<Id extends string> {
  steps: readonly CreatorStep<Id>[];
  active: Id;
  completed: Readonly<Record<Id, boolean>>;
  onSelect: (id: Id) => void;
  ariaLabel: string;
  columns: 'grid-cols-4' | 'grid-cols-5';
  id?: string;
  testId?: string;
  heading?: string;
  progressLabel?: string;
  targetIds?: Partial<Record<Id, string>>;
}

/**
 * One connected step navigation for Product and Service creation.
 * Navigation is non-linear and never changes saved form data by itself.
 * The parent editor owns rendering, focus, validation and persistence.
 *
 * Mobile: equal-width horizontal steps, with labels below the indicators.
 * Desktop: a vertical rail with descriptions and the same visual states.
 */
export function CreatorSteps<Id extends string>({
  steps,
  active,
  completed,
  onSelect,
  ariaLabel,
  columns,
  id,
  testId,
  heading,
  progressLabel,
  targetIds,
}: CreatorStepsProps<Id>) {
  const {trans} = useTrans();
  const activeIndex = steps.findIndex(step => step.id === active);

  return (
    <nav
      id={id}
      aria-label={ariaLabel}
      data-testid={testId}
      data-slot="creator-steps"
      className="min-w-0 scroll-mt-20 border-b pb-3 xl:sticky xl:top-4 xl:self-start xl:border-b-0 xl:border-e xl:pb-0 xl:pe-4"
    >
      {heading && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 xl:mb-4">
          <h2 className="text-sm font-semibold">{heading}</h2>
          {progressLabel && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {progressLabel}
            </span>
          )}
        </div>
      )}
      <ol className={cn('grid min-w-0 gap-0 xl:grid-cols-1', columns)}>
        {steps.map((step, index) => {
          const current = active === step.id;
          const done = completed[step.id];
          const previous = index < activeIndex;

          return (
            <li key={step.id} className="relative min-w-0">
              {index < steps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    data-slot="creator-step-connector"
                    className={cn(
                      'pointer-events-none absolute start-1/2 -end-1/2 top-6 h-px xl:hidden',
                      done ? 'bg-positive/60' : 'bg-border',
                    )}
                  />
                  <Separator
                    orientation="vertical"
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute start-6 top-7 -bottom-7 hidden xl:block',
                      done ? 'bg-positive/60' : 'bg-border',
                    )}
                  />
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                color="default"
                size="lg"
                data-creator-step="trigger"
                data-step-state={current ? 'current' : previous ? 'previous' : 'upcoming'}
                data-step-complete={done ? 'true' : 'false'}
                aria-current={current ? 'step' : undefined}
                aria-controls={targetIds?.[step.id]}
                aria-description={done ? trans({message: 'Complete'}) : undefined}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {name: step.title, index: index + 1, total: steps.length},
                })}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'relative flex h-auto min-h-16 w-full min-w-0 flex-col items-center justify-start gap-1 rounded-card-xs px-0.5 py-2 text-center text-foreground whitespace-normal transition-colors motion-reduce:transition-none sm:px-2 xl:flex-row xl:items-start xl:justify-start xl:gap-3 xl:rounded-card-sm xl:py-3 xl:text-start',
                  current ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40',
                )}
              >
                <span
                  aria-hidden="true"
                  data-slot="creator-step-indicator"
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-positive bg-positive text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <CheckIcon className="size-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    data-slot="creator-step-title"
                    className={cn(
                      'block break-words text-xs leading-4 sm:text-sm sm:leading-5',
                      current
                        ? 'font-semibold text-primary'
                        : done
                          ? 'font-medium text-foreground'
                          : 'font-medium text-muted-foreground',
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    data-slot="creator-step-description"
                    className="mt-0.5 hidden text-xs leading-4 text-muted-foreground xl:block"
                  >
                    {step.description}
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

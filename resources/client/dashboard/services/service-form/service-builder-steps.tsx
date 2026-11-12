import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon} from 'lucide-react';

export const SERVICE_STEP_ORDER = ['details', 'media', 'packages', 'settings'] as const;
export type ServiceBuilderStepId = (typeof SERVICE_STEP_ORDER)[number];

interface ServiceBuilderStepsProps {
  active: ServiceBuilderStepId;
  completed: Record<ServiceBuilderStepId, boolean>;
  onSelect: (step: ServiceBuilderStepId) => void;
}

/**
 * Mobile: two accessible rows that reflow at 320px and large text.
 * Wide desktop: a persistent numbered rail beside the current editor.
 * Navigation is never a validation gate or an implicit save.
 */
export function ServiceBuilderSteps({
  active,
  completed,
  onSelect,
}: ServiceBuilderStepsProps) {
  const {trans} = useTrans();
  const steps = [
    {
      id: 'details',
      title: trans({message: 'Details'}),
      description: trans({message: 'Explain what you offer.'}),
    },
    {
      id: 'media',
      title: trans({message: 'Media'}),
      description: trans({message: 'Show examples of your work.'}),
    },
    {
      id: 'packages',
      title: trans({message: 'Packages'}),
      description: trans({message: 'Set prices or offer quotes.'}),
    },
    {
      id: 'settings',
      title: trans({message: 'Settings'}),
      description: trans({message: 'FAQs and contact options.'}),
    },
  ] as const;
  const activeIndex = SERVICE_STEP_ORDER.indexOf(active);

  return (
    <nav
      id="service-builder-steps"
      aria-label={trans({message: 'Service creation steps'})}
      className="min-w-0 scroll-mt-20 rounded-card border bg-card p-3 sm:p-4 xl:sticky xl:top-4 xl:self-start"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 xl:mb-5">
        <h2 className="text-sm font-semibold">
          {trans({message: 'Service setup'})}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {trans({
            message: 'Step :current of :total',
            values: {current: activeIndex + 1, total: steps.length},
          })}
        </span>
      </div>
      <ol className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-1 xl:gap-1">
        {steps.map((step, index) => {
          const current = active === step.id;
          const earlier = index < activeIndex;
          const done = earlier && completed[step.id];

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                data-step-state={current ? 'current' : earlier ? 'previous' : 'upcoming'}
                aria-current={current ? 'step' : undefined}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {name: step.title, index: index + 1, total: steps.length},
                })}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'group flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-2 rounded-card-xs border px-2 py-2.5 text-start outline-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3 xl:gap-3 xl:py-3',
                  current
                    ? 'border-primary/40 bg-muted/60'
                    : 'border-transparent hover:border-border hover:bg-muted/50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-primary/40 bg-muted text-primary'
                        : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block min-w-0 break-words text-sm leading-5',
                      current || done
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="mt-1 hidden text-xs leading-4 text-muted-foreground xl:block">
                    {step.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 hidden border-t pt-3 text-xs leading-5 text-muted-foreground xl:block">
        {trans({message: 'Move between steps anytime. Use Save draft to keep your changes.'})}
      </p>
    </nav>
  );
}

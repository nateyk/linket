import {Button} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
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
 * ReUI-style connected progress navigation built from Linket's installed
 * Base UI / shadcn Button and Separator primitives. The control is navigation,
 * not a tablist: all four optional stages are freely accessible, and choosing
 * a stage never saves or implicitly marks it complete.
 *
 * Phones: quiet 2x2 button list. Tablets: horizontal step sequence.
 * Wide screens: vertical rail with connector lines beside the editor.
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
      description: trans({message: 'FAQs, buyer questions and contact.'}),
    },
  ] as const;
  const activeIndex = SERVICE_STEP_ORDER.indexOf(active);

  return (
    <nav
      id="service-builder-steps"
      aria-label={trans({message: 'Service creation steps'})}
      className="min-w-0 scroll-mt-20 border-b pb-3 xl:sticky xl:top-4 xl:self-start xl:border-b-0 xl:border-e xl:pb-0 xl:pe-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 xl:mb-4">
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
      <ol className="grid min-w-0 grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-1 xl:gap-0">
        {steps.map((step, index) => {
          const current = active === step.id;
          const earlier = index < activeIndex;
          const done = earlier && completed[step.id];

          return (
            <li key={step.id} className="relative min-w-0">
              {index < steps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute start-[calc(50%+1rem)] end-[calc(-50%+1rem)] top-6 hidden h-px sm:block xl:hidden',
                      done ? 'bg-positive/60' : 'bg-border',
                    )}
                  />
                  <Separator
                    orientation="vertical"
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute start-6 top-10 -bottom-2 hidden xl:block',
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
                data-step-state={current ? 'current' : earlier ? 'previous' : 'upcoming'}
                data-step-complete={done ? 'true' : 'false'}
                aria-current={current ? 'step' : undefined}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {name: step.title, index: index + 1, total: steps.length},
                })}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'relative flex h-auto min-h-16 w-full min-w-0 flex-col items-center justify-start gap-1.5 rounded-card-xs px-1.5 py-2.5 text-center text-foreground whitespace-normal motion-reduce:transition-none sm:px-2 xl:min-h-16 xl:flex-row xl:items-start xl:justify-start xl:gap-3 xl:px-2 xl:text-start',
                  current
                    ? 'bg-muted/60 hover:bg-muted/80'
                    : 'hover:bg-muted/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-positive/60 bg-positive/10 text-positive'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block break-words text-sm leading-5',
                      current || done
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground group-hover/button:text-foreground',
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 hidden text-xs leading-4 text-muted-foreground xl:block">
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

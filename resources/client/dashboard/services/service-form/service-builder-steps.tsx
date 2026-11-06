import {CheckIcon} from 'lucide-react';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';

export const SERVICE_STEP_ORDER = ['details', 'media', 'packages', 'settings'] as const;
export type ServiceBuilderStepId = (typeof SERVICE_STEP_ORDER)[number];

interface ServiceBuilderStepsProps {
  active: ServiceBuilderStepId;
  completed: Record<ServiceBuilderStepId, boolean>;
  onSelect: (step: ServiceBuilderStepId) => void;
}

/**
 * A compact four-stage navigator: horizontal above the form on narrow screens
 * and a vertical progress rail alongside it on wide screens. All stages remain
 * selectable because media, packages and contact details are optional.
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
      description: trans({message: 'Describe your offer'}),
    },
    {
      id: 'media',
      title: trans({message: 'Media'}),
      description: trans({message: 'Show your work'}),
    },
    {
      id: 'packages',
      title: trans({message: 'Packages'}),
      description: trans({message: 'Pricing or quote'}),
    },
    {
      id: 'settings',
      title: trans({message: 'Settings'}),
      description: trans({message: 'Questions and contact'}),
    },
  ] as const;

  return (
    <nav
      id="service-builder-steps"
      aria-label={trans({message: 'Service creation steps'})}
      className="scroll-mt-3 xl:sticky xl:top-5 xl:rounded-card xl:border xl:bg-card xl:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1 xl:mb-4 xl:px-0">
        <p className="text-xs font-semibold text-foreground">
          {trans({message: 'Service setup'})}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {trans({
            message: 'Step :current of :total',
            values: {
              current: SERVICE_STEP_ORDER.indexOf(active) + 1,
              total: steps.length,
            },
          })}
        </p>
      </div>
      <ol className="grid grid-cols-4 gap-1.5 xl:flex xl:flex-col xl:gap-1">
        {steps.map((step, index) => {
          const current = active === step.id;
          const done = completed[step.id] && !current;

          return (
            <li key={step.id} className="relative min-w-0">
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-3 left-7 top-11 hidden w-px bg-border xl:block"
                />
              )}
              <button
                type="button"
                aria-current={current ? 'step' : undefined}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {
                    name: step.title,
                    index: index + 1,
                    total: steps.length,
                  },
                })}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'relative z-10 flex min-h-16 w-full cursor-pointer flex-col items-center gap-1.5 rounded-card-sm border border-transparent px-1 py-2 text-center transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:min-h-20 xl:flex-row xl:items-start xl:gap-3 xl:px-3 xl:py-3 xl:text-left',
                  current
                    ? 'border-primary/15 bg-primary/5'
                    : 'hover:bg-muted/60',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                    current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-primary/25 bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <CheckIcon className="size-4" strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="min-w-0 xl:flex-1">
                  <span
                    className={cn(
                      'block text-xs font-medium leading-4 xl:text-sm',
                      current ? 'text-foreground' : 'text-muted-foreground',
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
    </nav>
  );
}

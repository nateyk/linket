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
 * Four choices in the creator's own sequence, not a validation gate: services
 * can publish without media, packages, FAQs or extra contact buttons.
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
      className="mb-5 scroll-mt-2 rounded-card border bg-card px-3 py-4 sm:px-5"
    >
      <ol className="grid grid-cols-4 gap-1 sm:gap-3">
        {steps.map((step, index) => {
          const current = active === step.id;
          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                aria-current={current ? 'step' : undefined}
                aria-label={trans({
                  message: ':name, step :index of :total',
                  values: {name: step.title, index: index + 1, total: steps.length},
                })}
                onClick={() => onSelect(step.id)}
                className={cn(
                  'group flex min-h-16 w-full cursor-pointer flex-col items-center gap-1 rounded-card-sm px-1 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-20 sm:gap-2',
                  current ? 'bg-primary/5' : 'hover:bg-muted/70',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors sm:size-9',
                    current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : completed[step.id]
                        ? 'border-foreground/30 bg-secondary text-foreground'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {index + 1}
                </span>
                <span className={cn('max-w-full text-xs font-medium leading-4 sm:text-sm', current ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.title}
                </span>
                <span className="hidden max-w-full text-xs leading-4 text-muted-foreground lg:block">
                  {step.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {trans({
          message: 'Step :current of :total',
          values: {current: SERVICE_STEP_ORDER.indexOf(active) + 1, total: steps.length},
        })}
      </p>
    </nav>
  );
}

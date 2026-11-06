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
 * A quiet four-segment navigator, not a completion gate. Optional steps can be
 * visited in any order; only genuinely completed earlier steps look completed.
 */
export function ServiceBuilderSteps({
  active,
  completed,
  onSelect,
}: ServiceBuilderStepsProps) {
  const {trans} = useTrans();
  const steps = [
    {id: 'details', title: trans({message: 'Details'})},
    {id: 'media', title: trans({message: 'Media'})},
    {id: 'packages', title: trans({message: 'Packages'})},
    {id: 'settings', title: trans({message: 'Settings'})},
  ] as const;
  const activeIndex = SERVICE_STEP_ORDER.indexOf(active);

  return (
    <nav
      id="service-builder-steps"
      aria-label={trans({message: 'Service creation steps'})}
      className="mb-5 scroll-mt-20 sm:mb-6"
    >
      <span className="sr-only">
        {trans({
          message: 'Step :current of :total',
          values: {current: activeIndex + 1, total: steps.length},
        })}
      </span>

      <ol className="grid grid-cols-4 gap-3 sm:gap-5">
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
                className="group flex min-h-11 w-full min-w-0 cursor-pointer flex-col items-stretch gap-2 rounded-card-xs py-1.5 text-start outline-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1 w-full shrink-0 rounded-full transition-colors motion-reduce:transition-none',
                    current ? 'bg-primary'
                      : done ? 'bg-primary/80'
                        : 'bg-border group-hover:bg-muted-foreground/40',
                  )}
                />
                <span
                  className={cn(
                    'block min-w-0 text-xs leading-4 sm:text-sm sm:leading-5',
                    current || done
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

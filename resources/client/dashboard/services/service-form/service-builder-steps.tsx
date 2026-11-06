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
 * A four-segment navigation control, not a completion gate. Stages may be
 * revisited in any order, and the creator can publish without optional media,
 * packages, FAQs, or contact buttons.
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
      className="mb-5 scroll-mt-3 border-b pb-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {trans({message: 'Service setup'})}
        </p>
        <p className="text-xs font-medium tabular-nums text-muted-foreground">
          {trans({
            message: 'Step :current of :total',
            values: {current: activeIndex + 1, total: steps.length},
          })}
        </p>
      </div>

      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
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
                className="group flex min-h-11 w-full cursor-pointer flex-col items-stretch gap-2 rounded-card-xs px-1 py-1.5 text-start outline-none transition-colors motion-reduce:transition-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1 w-full rounded-sm transition-colors motion-reduce:transition-none',
                    current
                      ? 'bg-primary'
                      : earlier
                        ? 'bg-primary/65'
                        : 'bg-border group-hover:bg-muted-foreground/40',
                  )}
                />
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-1 text-sm font-medium leading-5',
                    current ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  {step.title}
                  {done && <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-primary" />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

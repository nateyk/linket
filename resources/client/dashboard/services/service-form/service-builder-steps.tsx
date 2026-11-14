import {CreatorSteps} from '../../shared/creator-steps';
import {useTrans} from '@ui/i18n/use-trans';

export const SERVICE_STEP_ORDER = ['details', 'media', 'packages', 'settings'] as const;
export type ServiceBuilderStepId = (typeof SERVICE_STEP_ORDER)[number];

interface ServiceBuilderStepsProps {
  active: ServiceBuilderStepId;
  completed: Record<ServiceBuilderStepId, boolean>;
  onSelect: (step: ServiceBuilderStepId) => void;
}

/**
 * Service creation keeps its short setup/progress label above the shared
 * connected stepper. Content, focus and saves remain owned by the form page.
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

  return (
    <CreatorSteps
      id="service-builder-steps"
      ariaLabel={trans({message: 'Service creation steps'})}
      columns="grid-cols-4"
      heading={trans({message: 'Service setup'})}
      progressLabel={trans({
        message: 'Step :current of :total',
        values: {
          current: SERVICE_STEP_ORDER.indexOf(active) + 1,
          total: SERVICE_STEP_ORDER.length,
        },
      })}
      steps={steps}
      active={active}
      completed={completed}
      onSelect={onSelect}
    />
  );
}

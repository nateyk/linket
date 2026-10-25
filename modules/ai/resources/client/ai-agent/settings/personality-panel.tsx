import {AiAgentSettings} from '@ai/ai-agent/settings/ai-agent-settings';
import {PanelLayout} from '@ai/ai-agent/settings/panel-layout';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {BadgeIcon} from '@common/ui/library/icons/material/Badge';
import {SentimentNeutralIcon} from '@common/ui/library/icons/material/SentimentNeutral';
import {SentimentSatisfiedIcon} from '@common/ui/library/icons/material/SentimentSatisfied';
import {SentimentVerySatisfiedIcon} from '@common/ui/library/icons/material/SentimentVerySatisfied';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useForm, useWatch} from 'react-hook-form';
import {aiAgentQueries} from '../ai-agent-queries';

const personalities = [
  {
    name: 'friendly',
    label: message('Friendly'),
    icon: SentimentSatisfiedIcon,
  },
  {
    name: 'neutral',
    label: message('Neutral'),
    icon: SentimentNeutralIcon,
  },
  {
    name: 'professional',
    label: message('Professional'),
    icon: BadgeIcon,
  },
  {
    name: 'humorous',
    label: message('Humorous'),
    icon: SentimentVerySatisfiedIcon,
  },
];

export function PersonalityPanel() {
  const {data} = useSuspenseQuery(aiAgentQueries.settings.index());
  const form = useForm<Partial<AiAgentSettings>>({
    defaultValues: {
      personality: data.settings.personality ?? 'neutral',
    },
  });
  const value = useWatch({control: form.control, name: 'personality'});
  return (
    <PanelLayout
      value="personality"
      label={<Trans message="Personality" />}
      description={
        <Trans message="Determines tone of voice for AI generated messages" />
      }
      icon={<SentimentSatisfiedIcon />}
      form={form}
    >
      <ToggleGroup
        variant="segmented"
        buttonVariant="outline"
        buttonSize="sm"
        className="h-auto w-full flex-wrap justify-start gap-2 border-0 bg-transparent p-0"
        value={[value ?? 'neutral']}
        onValueChange={next => {
          const selected = next.at(-1);
          if (selected) {
            form.setValue('personality', selected, {shouldDirty: true});
          }
        }}
      >
        {personalities.map(personality => (
          <Toggle key={personality.name} value={personality.name}>
            <personality.icon />
            <Trans {...personality.label} />
          </Toggle>
        ))}
      </ToggleGroup>
    </PanelLayout>
  );
}

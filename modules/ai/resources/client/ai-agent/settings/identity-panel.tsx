import {aiAgentQueries} from '@ai/ai-agent/ai-agent-queries';
import {AiAgentSettings} from '@ai/ai-agent/settings/ai-agent-settings';
import {PanelLayout} from '@ai/ai-agent/settings/panel-layout';
import {FormTextField} from '@common/ui/library/forms/input-field/text-field/text-field';
import {Trans} from '@common/ui/library/i18n/trans';
import {BadgeIcon} from '@common/ui/library/icons/material/Badge';
import {FormImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useForm} from 'react-hook-form';

export function IdentityPanel() {
  const {data} = useSuspenseQuery(aiAgentQueries.settings.index());
  const form = useForm<Partial<AiAgentSettings>>({
    defaultValues: {
      name: data.settings.name,
      image: data.settings.image,
    },
  });
  return (
    <PanelLayout
      value="identity"
      label={<Trans message="Identity" />}
      description={<Trans message="Name and avatar" />}
      icon={<BadgeIcon />}
      form={form}
    >
      <FormTextField
        name="name"
        label={<Trans message="Name" />}
        description={<Trans message="The name your customers will see." />}
        required
      />
      <FileUploadProvider>
        <FormImageSelector
          name="image"
          label={<Trans message="Avatar" />}
          className="max-w-100"
          showRemoveButton
          diskPrefix="ai-agent"
          descriptionPosition="bottom"
          description={
            <Trans message="Use a JPG, PNG, or GIF smaller than 100KB. 50px by 50px works best." />
          }
        />
      </FileUploadProvider>
    </PanelLayout>
  );
}

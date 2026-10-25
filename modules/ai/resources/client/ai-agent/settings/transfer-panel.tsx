import {aiAgentQueries} from '@ai/ai-agent/ai-agent-queries';
import {AiAgentSettings} from '@ai/ai-agent/settings/ai-agent-settings';
import {PanelLayout} from '@ai/ai-agent/settings/panel-layout';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormTextField} from '@ui/forms/input-field/text-field/text-field';
import {FormRadio} from '@ui/forms/radio-group/radio';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SupportAgentIcon} from '@ui/icons/material/SupportAgent';
import {useForm, useWatch} from 'react-hook-form';

export function TransferPanel() {
  const {trans} = useTrans();
  const {data} = useSuspenseQuery(aiAgentQueries.settings.index());
  const form = useForm<Partial<AiAgentSettings>>({
    defaultValues: {
      transfer: {
        type: data.settings.transfer?.type ?? 'basicTransfer',
        instruction: data.settings.transfer?.instruction ?? '',
      },
    },
  });
  const transferType = useWatch({control: form.control, name: 'transfer.type'});

  return (
    <PanelLayout
      value="transfer"
      label={<Trans message="Transfer to human" />}
      description={<Trans message="If customer asks to speak to human agent" />}
      icon={<SupportAgentIcon />}
      form={form}
    >
      <div className="flex flex-col gap-6">
        <FormRadio name="transfer.type" value="basicTransfer" size="sm">
          <Trans message="Transfer customer to first available agent or put into queue" />
        </FormRadio>
        <div className="flex flex-col gap-4">
          <FormRadio name="transfer.type" value="instruction" size="sm">
            <Trans message="Custom instruction" />
          </FormRadio>
          {transferType === 'instruction' && (
            <div className="ps-6">
              <FormTextField
                required
                name="transfer.instruction"
                inputElementType="textarea"
                rows={2}
              placeholder={trans({
                message:
                  'say that there are no available agents right now and ask if you can help instead',
              })}
            />
            </div>
          )}
        </div>
      </div>
    </PanelLayout>
  );
}

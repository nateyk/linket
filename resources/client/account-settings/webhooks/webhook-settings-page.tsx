import {webhookEventNameToFormFieldName} from '@app/account-settings/webhooks/available-webhook-events';
import {
  CrupdateWebhookFields,
  CrupdateWebhookFormValues,
  webhookFormValueToPayload,
} from '@app/account-settings/webhooks/crupdate-webhook-fields';
import {
  retrieveWebhookOptions,
  updateWebhookOptions,
} from '@app/account-settings/webhooks/webhook-queries';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const {webhookId} = useRequiredParams(['webhookId']);
  const query = useSuspenseQuery(retrieveWebhookOptions(webhookId));
  const defaultValues: CrupdateWebhookFormValues = {
    name: query.data.data.name,
    url: query.data.data.url,
    signing_secret: query.data.data.signing_secret,
  };
  query.data.data.selected_events.forEach(event => {
    defaultValues[webhookEventNameToFormFieldName(event)] = true;
  });
  const form = useForm<CrupdateWebhookFormValues>({defaultValues});
  const updateWebhook = useMutation(updateWebhookOptions(webhookId));

  const handleSubmit = (values: CrupdateWebhookFormValues) => {
    updateWebhook.mutate(webhookFormValueToPayload(values), {
      onSuccess: () => {
        toast.success(<Trans message="Webhook updated" />);
        navigate('/account-settings/webhooks');
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <div className="mx-auto mb-11 w-full max-w-6xl xl:p-6">
        <CrupdateWebhookFields />
      </div>
      <DirtyFormSaveDrawer isLoading={updateWebhook.isPending} />
    </HookForm.Root>
  );
}

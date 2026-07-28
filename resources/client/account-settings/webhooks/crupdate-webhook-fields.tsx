import {
  availableWebhookEventsByGroup,
  webhookEventNameToFormFieldName,
  webhookFormFieldNameToEventName,
} from '@app/account-settings/webhooks/available-webhook-events';
import {CrupdateWebhookBody} from '@app/gen/schemas/crupdate-webhook-body';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field, FieldSet} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {useWatch} from 'react-hook-form';

export type CrupdateWebhookFormValues = CrupdateWebhookBody & {
  [key: `event_${string}`]: true;
};

export function CrupdateWebhookFields() {
  const signingSecret = useWatch({name: 'signing_secret'});
  const [isCopied, copy] = useClipboard(signingSecret);

  return (
    <Field.Group>
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input autoFocus required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="url">
        <Field.Label>
          <Trans message="URL" />
        </Field.Label>
        <Input type="url" required />
        <Field.Description>
          <Trans message="Your endpoint must return 2xx to acknowledge delivery." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="signing_secret">
        <Field.Label>
          <Trans message="Signing secret" />
        </Field.Label>
        <InputGroup>
          <InputGroupInput readOnly />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              onClick={() => {
                copy();
                toast.success(<Trans message="Copied to clipboard" />);
              }}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Field.Error />
      </HookForm.Field>
      <FieldSet.Root>
        <FieldSet.Legend>
          <Trans message="Events" />
        </FieldSet.Legend>
        <FieldSet.Description>
          <Trans message="Select which events should trigger the webhook." />
        </FieldSet.Description>
        {availableWebhookEventsByGroup.map((group, index) => (
          <FieldSet.Root key={index}>
            <FieldSet.Legend variant="label">{group.groupName}</FieldSet.Legend>
            <div className="flex flex-col gap-2">
              {group.items.map(event => (
                <HookForm.Field
                  key={event.value}
                  name={webhookEventNameToFormFieldName(event.value)}
                >
                  <Field.Label className="font-normal">
                    <Checkbox />
                    {event.label}
                  </Field.Label>
                </HookForm.Field>
              ))}
            </div>
          </FieldSet.Root>
        ))}
      </FieldSet.Root>
    </Field.Group>
  );
}

export function webhookFormValueToPayload(
  values: CrupdateWebhookFormValues,
): CrupdateWebhookBody {
  const payload = {
    name: values.name,
    url: values.url,
    signing_secret: values.signing_secret,
    selected_events: [] as string[],
  };

  for (const [key] of Object.entries(values)) {
    if (
      key.startsWith('event_') &&
      values[key as keyof CrupdateWebhookFormValues]
    ) {
      payload.selected_events.push(webhookFormFieldNameToEventName(key));
    }
  }

  return payload;
}

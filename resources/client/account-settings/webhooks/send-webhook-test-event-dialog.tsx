import {
  availableWebhookEvents,
  availableWebhookEventsByGroup,
} from '@app/account-settings/webhooks/available-webhook-events';
import {sendTestWebhookEventOptions} from '@app/account-settings/webhooks/webhook-queries';
import {SendTestWebhookEventBody} from '@app/gen/schemas/send-test-webhook-event-body';
import {Webhook} from '@app/gen/schemas/webhook';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';
import {useForm} from 'react-hook-form';

type Props = {
  webhook: Webhook;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export function SendWebhookTestEventDialog({
  webhook,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  children,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent webhook={webhook} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  webhook,
  onClose,
}: {
  webhook: Webhook;
  onClose: () => void;
}) {
  const form = useForm<SendTestWebhookEventBody>({
    defaultValues: {
      event_type: availableWebhookEvents[0]!.value,
    },
  });

  const sendTestEvent = useMutation(sendTestWebhookEventOptions(webhook.id));

  const handleSubmit = (values: SendTestWebhookEventBody) => {
    sendTestEvent.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Test event sent" />);
        onClose();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Send test event" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <HookForm.Field name="event_type">
            <Field.Label>
              <Trans message="Event type" />
            </Field.Label>
            <Select.Root items={availableWebhookEventsByGroup}>
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {availableWebhookEventsByGroup.map((group, index) => (
                  <Select.Group key={index}>
                    <Select.GroupLabel>{group.groupName}</Select.GroupLabel>
                    {group.items.map(event => (
                      <Select.Item key={event.value} value={event.value}>
                        {event.label}
                      </Select.Item>
                    ))}
                  </Select.Group>
                ))}
              </Select.Content>
            </Select.Root>
            <Field.Error />
          </HookForm.Field>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={onClose}>
            <Trans message="Cancel" />
          </Button>
          <Button type="submit" disabled={sendTestEvent.isPending}>
            <Trans message="Send" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

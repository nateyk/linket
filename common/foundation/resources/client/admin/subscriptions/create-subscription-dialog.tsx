import {CrupdateSubscriptionBody} from '@app/gen/schemas/crupdate-subscription-body';
import {createSubscriptionOptions} from '@common/admin/subscriptions/subscriptions-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactElement, useState} from 'react';
import {useForm} from 'react-hook-form';
import {CrupdateSubscriptionForm} from './crupdate-subscription-form';

type CreateSubscriptionDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
};

export function CreateSubscriptionDialog({
  children,
}: CreateSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({onClose}: {onClose: () => void}) {
  const form = useForm<CrupdateSubscriptionBody>();
  const createSubscription = useMutation(createSubscriptionOptions());

  const handleSubmit = (values: CrupdateSubscriptionBody) => {
    createSubscription.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Subscription created" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Add new subscription" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <CrupdateSubscriptionForm />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createSubscription.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

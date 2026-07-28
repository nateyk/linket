import {CrupdateSubscriptionBody} from '@app/gen/schemas/crupdate-subscription-body';
import {Subscription} from '@app/gen/schemas/subscription';
import {updateSubscriptionOptions} from '@common/admin/subscriptions/subscriptions-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {CrupdateSubscriptionForm} from './crupdate-subscription-form';

interface UpdateSubscriptionDialogProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
}: UpdateSubscriptionDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          subscription={subscription}
          onClose={() => onOpenChange(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  subscription,
  onClose,
}: {
  subscription: Subscription;
  onClose: () => void;
}) {
  const form = useForm<CrupdateSubscriptionBody>({
    defaultValues: {
      product_id: subscription.product_id,
      price_id: subscription.price_id,
      description: subscription.description,
      renews_at: subscription.renews_at,
      ends_at: subscription.ends_at,
      user_id: subscription.user_id,
    },
  });
  const updateSubscription = useMutation(
    updateSubscriptionOptions(subscription.id),
  );

  const handleSubmit = (values: CrupdateSubscriptionBody) => {
    updateSubscription.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Subscription updated" />);
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
            <Trans message="Update subscription" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <CrupdateSubscriptionForm />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={updateSubscription.isPending}>
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

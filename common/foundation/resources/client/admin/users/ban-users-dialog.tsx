import {BanUsersBody} from '@app/gen/schemas/ban-users-body';
import {banUsersOptions} from '@common/admin/users/users-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormDatePicker} from '@ui/forms/input-field/date/date-picker/date-picker';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ReactNode} from 'react';
import {useForm} from 'react-hook-form';

interface Props {
  userIds: number[];
  description?: ReactNode;
  onSuccess?: () => void;
  children?: Dialog.TriggerElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function BanUsersDialog({
  userIds,
  description,
  onSuccess,
  children,
  open,
  onOpenChange,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          userIds={userIds}
          description={description}
          onSuccess={onSuccess}
          onClose={() => onOpenChange(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface DialogContentProps {
  userIds: number[];
  description?: ReactNode;
  onSuccess?: () => void;
  onClose: () => void;
}
function DialogContent({
  userIds,
  description,
  onSuccess,
  onClose,
}: DialogContentProps) {
  const {trans} = useTrans();
  const form = useForm<BanUsersBody>({
    defaultValues: {
      permanent: true,
    },
  });
  const isPermanent = form.watch('permanent');
  const banUser = useMutation(banUsersOptions(userIds));

  const handleSubmit = (values: BanUsersBody) => {
    banUser.mutate(values, {
      onSuccess: () => {
        toast(
          <Trans
            message="[one User suspended|other :count Users suspended]"
            values={{count: userIds.length}}
          />,
        );
        onClose();
        onSuccess?.();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Suspend users" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <FormDatePicker
              name="ban_until"
              label={<Trans message="Suspend until" />}
              size="sm"
              disabled={isPermanent}
            />
            <HookForm.Field name="permanent" orientation="horizontal">
              <Switch />
              <Field.Label>
                <Trans message="Permanent" />
              </Field.Label>
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="comment" className="gap-1">
              <Field.Label>
                <Trans message="Reason" />
              </Field.Label>
              <Textarea
                maxLength={250}
                placeholder={trans(message('Optional'))}
              />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
          {description && <div>{description}</div>}
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton disabled={banUser.isPending}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button color="primary" type="submit" disabled={banUser.isPending}>
            <Trans message="Suspend" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

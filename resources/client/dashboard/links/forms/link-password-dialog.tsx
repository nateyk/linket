import {useLinkFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {ReactNode, useState} from 'react';
import {useForm} from 'react-hook-form';

type FormValue = {
  password: string;
};

type Props = {
  values: FormValue;
  onSubmit: (values: FormValue) => void;
  children: ReactNode;
};

export function LinkPasswordDialog({children, onSubmit, values}: Props) {
  const [open, setOpen] = useState(false);
  const handleSubmit = (values: FormValue) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent values={values} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({values, onSubmit}: Pick<Props, 'values' | 'onSubmit'>) {
  const {disabled: passwordDisabled} = useLinkFeatureStatus('password');
  const hasPassword = !!values.password;

  const form = useForm<FormValue>({
    defaultValues: {
      password: values.password ?? '',
    },
  });

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Password" />
            {passwordDisabled && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan doesn't include password protection." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="Restrict access by requiring users to enter a password before being redirected or viewing content." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <HookForm.Field name="password" disabled={passwordDisabled}>
            <Field.Label>
              <Trans message="Password" />
            </Field.Label>
            <Input type="password" autoComplete="new-password" required />
            <Field.Error />
          </HookForm.Field>
        </Dialog.Body>
        <Dialog.Footer>
          {hasPassword ? (
            <Button
              type="button"
              variant="outline"
              className="sm:me-auto"
              onClick={() => onSubmit({password: ''})}
              disabled={passwordDisabled}
            >
              <Trans message="Remove password" />
            </Button>
          ) : null}
          <Dialog.CloseButton>
            <Trans message="Close" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={passwordDisabled}>
            {hasPassword ? (
              <Trans message="Change password" />
            ) : (
              <Trans message="Set password" />
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

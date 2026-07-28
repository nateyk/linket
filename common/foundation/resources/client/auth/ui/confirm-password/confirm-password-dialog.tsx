import {
  confirmPasswordOptions,
  ConfirmPasswordPayload,
} from '@common/auth/auth-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {createContext, ReactNode, use, useMemo, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';

export const ConfirmPasswordDialogContext = createContext<{
  isOpen: boolean;
  open: () => Promise<string | undefined>;
  close: (password: string | undefined) => void;
}>({isOpen: false, open: () => Promise.resolve(undefined), close: () => {}});

// should only be rendered once on the page
export function ConfirmPasswordDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const promiseResolveRef = useRef<
    ((password: string | undefined) => void) | null
  >(null);

  const value = useMemo(() => {
    const open: () => Promise<string | undefined> = () =>
      new Promise(resolve => {
        promiseResolveRef.current = resolve;
        setIsOpen(true);
      });

    const close = (password: string | undefined) => {
      setIsOpen(false);
      promiseResolveRef.current?.(password);
    };

    return {isOpen, open, close};
  }, [isOpen]);

  return (
    <ConfirmPasswordDialogContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={isOpen}
        onOpenChange={isOpen => {
          if (!isOpen) {
            value.close(undefined);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Content />
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmPasswordDialogContext.Provider>
  );
}

function Content() {
  const form = useForm<ConfirmPasswordPayload>({defaultValues: {password: ''}});
  const confirmPassword = useMutation(confirmPasswordOptions());
  const {close} = use(ConfirmPasswordDialogContext);

  const handleConfirmPassword = (value: ConfirmPasswordPayload) => {
    confirmPassword.mutate(value, {
      onSuccess: () => {
        close?.(value.password);
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleConfirmPassword}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Confirm password" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="For your security, please confirm your password to continue." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="password">
              <Field.Label>
                <Trans message="Password" />
              </Field.Label>
              <Input type="password" required autoFocus />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton render={<Button variant="outline" />}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={confirmPassword.isPending}>
            <Trans message="Confirm" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

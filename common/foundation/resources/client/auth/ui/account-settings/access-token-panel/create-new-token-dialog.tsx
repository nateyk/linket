import {createAccessTokenOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {ReactNode, useState} from 'react';
import {useForm} from 'react-hook-form';

export function CreateNewTokenDialog({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent() {
  const form = useForm<{tokenName: string}>();
  const createToken = useMutation(createAccessTokenOptions());
  const [plainTextToken, setPlainTextToken] = useState<string>();

  const handleSubmit = (values: {tokenName: string}) => {
    createToken.mutate(values, {
      onSuccess: response => {
        setPlainTextToken(response.plainTextToken);
        toast.success(<Trans message="API key created" />);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  if (plainTextToken) {
    return (
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="API key" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <PlainTextPreview plainTextToken={plainTextToken} />
        </Dialog.Body>
      </Dialog.Content>
    );
  }

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create new key" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <HookForm.Field name="tokenName">
            <Field.Label>
              <Trans message="API key name" />
            </Field.Label>
            <Input autoFocus required />
            <Field.Error />
          </HookForm.Field>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Done" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createToken.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function PlainTextPreview({plainTextToken}: {plainTextToken: string}) {
  const [isCopied, copyToClipboard] = useClipboard(plainTextToken || '', {
    successDuration: 1000,
  });

  return (
    <>
      <InputGroup>
        <InputGroupInput
          bindToHookForm={false}
          readOnly
          value={plainTextToken}
          autoFocus
          onClick={e => {
            e.currentTarget.focus();
            e.currentTarget.select();
          }}
          className="flex-1"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            variant="default"
            color="primary"
            onClick={copyToClipboard}
          >
            {isCopied ? <Trans message="Copied!" /> : <Trans message="Copy" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <Alert.Root
        variant="destructive"
        fillStyle="subtleFill"
        className="mt-3.5 flex items-center gap-2.5 text-sm"
      >
        <Alert.Description>
          <Trans message="Make sure to store the key in a safe place. After this dialog is closed, key will not be viewable anymore." />
        </Alert.Description>
      </Alert.Root>
    </>
  );
}

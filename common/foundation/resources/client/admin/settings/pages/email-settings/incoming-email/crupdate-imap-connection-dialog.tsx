import {ImapConnectionCredentials} from '@common/admin/settings/pages/email-settings/incoming-email/imap-connection-credentials';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {nanoid} from 'nanoid';
import {ReactNode} from 'react';
import {useForm, useWatch} from 'react-hook-form';

const authenticationOptions = [
  {value: 'basic', label: <Trans message="Basic" />},
  {value: 'oauth', label: <Trans message="OAuth" />},
] as const;

type Props = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  connection?: ImapConnectionCredentials;
  onSaved: (connection: ImapConnectionCredentials) => void;
};

export function CrupdateImapConnectionDialog({
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  connection,
  onSaved,
}: Props) {
  const [open, setOpen] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          connection={connection}
          onSaved={onSaved}
          onOpenChange={setOpen}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  connection,
  onSaved,
  onOpenChange,
}: Pick<Props, 'connection' | 'onSaved' | 'onOpenChange'>) {
  const form = useForm<ImapConnectionCredentials>({
    defaultValues: connection
      ? {
          ...connection,
          authentication: connection.authentication || 'basic',
        }
      : {
          id: nanoid(6).toLowerCase(),
          authentication: 'basic',
          createTickets: true,
          createReplies: true,
        },
  });

  return (
    <HookForm.Root
      className="contents"
      form={form}
      onSubmit={values => {
        // clear lastUid if folder changed
        if (connection?.folder && connection.folder !== values.folder) {
          values.lastUid = null;
        }

        onSaved(values);
        onOpenChange?.(false);
      }}
    >
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            {connection ? (
              <Trans message="Edit connection" />
            ) : (
              <Trans message="New connection" />
            )}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input autoFocus required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="host">
              <Field.Label>
                <Trans message="Host" />
              </Field.Label>
              <Input required placeholder="imap.gmail.com" />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="authentication">
              <Field.Label>
                <Trans message="Authentication" />
              </Field.Label>
              <Select.Root items={authenticationOptions}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {authenticationOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="username">
              <Field.Label>
                <Trans message="Username" />
              </Field.Label>
              <Input required type="email" placeholder="username@gmail.com" />
              <Field.Error />
            </HookForm.Field>

            <PasswordField />

            <HookForm.Field name="port">
              <Field.Label>
                <Trans message="Port" />
              </Field.Label>
              <NumberField min={1} max={65535}>
                <NumberFieldDecrement />
                <NumberFieldInput placeholder="993" />
                <NumberFieldIncrement />
              </NumberField>
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="folder">
              <Field.Label>
                <Trans message="Folder" />
              </Field.Label>
              <Input />
              <Field.Description>
                <Trans message="From which folder emails should be imported. Leave empty to import all emails in the inbox." />
              </Field.Description>
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="createTickets" className="mt-7">
              <Field.Label>
                <Switch />
                <Trans message="Create new tickets" />
              </Field.Label>
              <Field.Description>
                <Trans message="Create new tickets from emails received via this connection." />
              </Field.Description>
            </HookForm.Field>

            <HookForm.Field name="createReplies">
              <Field.Label>
                <Switch />
                <Trans message="Create replies" />
              </Field.Label>
              <Field.Description>
                <Trans message="If email is in reply to existing ticket, create a new reply." />
              </Field.Description>
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" color="primary">
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function PasswordField() {
  const auth = useWatch({name: 'authentication'});
  return (
    <HookForm.Field name="password">
      <Field.Label>
        {auth === 'oauth' ? (
          <Trans message="Access token" />
        ) : (
          <Trans message="Password" />
        )}
      </Field.Label>
      <Input required type={auth === 'oauth' ? 'text' : 'password'} />
      <Field.Error />
    </HookForm.Field>
  );
}

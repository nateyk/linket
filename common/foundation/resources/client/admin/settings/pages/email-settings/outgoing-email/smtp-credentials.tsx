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
import {Trans} from '@ui/i18n/trans';

const encryptionOptions = [
  {value: '', label: <Trans message="None" />},
  {value: 'tls', label: <Trans message="TLS" />},
  {value: 'ssl', label: <Trans message="SSL" />},
] as const;

export interface SmtpCredentialsProps {
  isInvalid: boolean;
}
export function SmtpCredentials({isInvalid}: SmtpCredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.mail_host">
        <Field.Label>
          <Trans message="SMTP host" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.mail_username">
        <Field.Label>
          <Trans message="SMTP username" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.mail_password">
        <Field.Label>
          <Trans message="SMTP password" />
        </Field.Label>
        <Input type="password" required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.mail_port">
        <Field.Label>
          <Trans message="SMTP port" />
        </Field.Label>
        <NumberField min={1} max={65535}>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberField>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.mail_encryption">
        <Field.Label>
          <Trans message="SMTP encryption" />
        </Field.Label>
        <Select.Root items={encryptionOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {encryptionOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

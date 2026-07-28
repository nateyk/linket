import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';

export interface SesCredentialsProps {
  isInvalid: boolean;
}
export function SesCredentials({isInvalid}: SesCredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.ses_key">
        <Field.Label>
          <Trans message="SES key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.ses_secret">
        <Field.Label>
          <Trans message="SES secret" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.ses_region">
        <Field.Label>
          <Trans message="SES region" />
        </Field.Label>
        <Input placeholder="us-east-1" required />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

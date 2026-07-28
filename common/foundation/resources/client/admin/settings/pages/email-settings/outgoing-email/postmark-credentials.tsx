import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';

export interface PostmarkCredentialsProps {
  isInvalid: boolean;
}
export function PostmarkCredentials({isInvalid}: PostmarkCredentialsProps) {
  return (
    <HookForm.Field invalid={isInvalid} name="server.postmark_token">
      <Field.Label>
        <Trans message="Postmark token" />
      </Field.Label>
      <Input required />
      <Field.Error />
    </HookForm.Field>
  );
}

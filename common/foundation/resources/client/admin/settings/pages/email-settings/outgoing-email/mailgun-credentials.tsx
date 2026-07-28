import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';

export interface MailgunCredentialsProps {
  isInvalid: boolean;
}
export function MailgunCredentials({isInvalid}: MailgunCredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.mailgun_domain">
        <Field.Label>
          <Trans message="Mailgun domain" />
        </Field.Label>
        <Input required />
        <Field.Description>
          <Trans message="Usually the domain of your site (site.com)" />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field invalid={isInvalid} name="server.mailgun_secret">
        <Field.Label>
          <Trans message="Mailgun API key" />
        </Field.Label>
        <Input required />
        <Field.Description>
          <Trans message="Should start with `key-`" />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field invalid={isInvalid} name="server.mailgun_endpoint">
        <Field.Label>
          <Trans message="Mailgun endpoint" />
        </Field.Label>
        <Input placeholder="api.eu.mailgun.net" />
        <Field.Description>
          <Trans message="Can be left empty, if your mailgun account is in the US region." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

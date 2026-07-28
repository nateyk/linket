import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {ComponentType} from 'react';
import {useFormContext} from 'react-hook-form';
import {ConnectGmailPanel} from './connect-gmail-panel';
import {MailgunCredentials} from './mailgun-credentials';
import {PostmarkCredentials} from './postmark-credentials';
import {SesCredentials} from './ses-credentials';
import {SmtpCredentials} from './smtp-credentials';

const mailMethodOptions = [
  {value: 'mailgun', label: 'Mailgun'},
  {value: 'gmailApi', label: 'Gmail API'},
  {value: 'smtp', label: 'SMTP'},
  {value: 'postmark', label: 'Postmark'},
  {value: 'ses', label: <Trans message="Ses (Amazon Simple Email Service)" />},
  {value: 'sendmail', label: 'SendMail'},
  {
    value: 'log',
    label: (
      <Trans message="Log (Email will be saved to log file instead of sending)" />
    ),
  },
] as const;

export function OutgoingMailGroup() {
  const {watch, clearErrors} = useFormContext<AdminSettings>();

  const selectedDriver = watch('server.mail_mailer');
  const credentialForms: ComponentType<{isInvalid: boolean}>[] = [];

  if (selectedDriver === 'mailgun') {
    credentialForms.push(MailgunCredentials);
  }
  if (selectedDriver === 'smtp') {
    credentialForms.push(SmtpCredentials);
  }
  if (selectedDriver === 'ses') {
    credentialForms.push(SesCredentials);
  }
  if (selectedDriver === 'postmark') {
    credentialForms.push(PostmarkCredentials);
  }
  if (selectedDriver === 'gmailApi') {
    credentialForms.push(ConnectGmailPanel);
  }

  return (
    <SettingsErrorGroup
      separatorTop={false}
      separatorBottom={false}
      name="mail_group"
    >
      {isInvalid => (
        <Field.Group>
          <HookForm.Field invalid={isInvalid} name="server.mail_mailer">
            <Field.Label>
              <Trans message="Outgoing mail method" />
            </Field.Label>
            <Select.Root
              items={mailMethodOptions}
              onValueChange={() => clearErrors()}
            >
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {mailMethodOptions.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Field.Error />
          </HookForm.Field>
          {credentialForms.length
            ? credentialForms.map((CredentialsForm, index) => (
                <CredentialsForm key={index} isInvalid={isInvalid} />
              ))
            : null}
        </Field.Group>
      )}
    </SettingsErrorGroup>
  );
}

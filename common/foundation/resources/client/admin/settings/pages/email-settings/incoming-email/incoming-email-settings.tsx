import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsSectionHeader} from '@common/admin/settings/layout/settings-panel';
import {CrupdateImapConnectionDialog} from '@common/admin/settings/pages/email-settings/incoming-email/crupdate-imap-connection-dialog';
import {MailTabs} from '@common/admin/settings/pages/email-settings/mail-tabs';
import {ConnectGmailPanel} from '@common/admin/settings/pages/email-settings/outgoing-email/connect-gmail-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {useLocalStorage} from '@ui/utils/hooks/local-storage';
import {PlusIcon, SettingsIcon, TrashIcon} from 'lucide-react';
import {Fragment} from 'react';
import {useFieldArray, useForm, useWatch} from 'react-hook-form';

const accordionItems = ['imap', 'pipe', 'api', 'gmail', 'mailgun'] as const;

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        incoming_email: {
          imap: data.client.incoming_email?.imap ?? {
            connections: [],
          },
          api: {
            enabled: data.client.incoming_email?.api?.enabled ?? false,
          },
          mailgun: {
            enabled: data.client.incoming_email?.mailgun?.enabled ?? false,
            verify: data.client.incoming_email?.mailgun?.verify ?? false,
          },
          pipe: {
            enabled: data.client.incoming_email?.pipe?.enabled ?? false,
          },
          gmail: {
            enabled: data.client.incoming_email?.gmail?.enabled ?? false,
            topicName: data.client.incoming_email?.gmail?.topicName ?? '',
          },
        },
      },
      server: {
        mailgun_secret: data.server.mailgun_secret ?? '',
      },
    },
  });

  const [expandedValues, setExpandedValues] = useLocalStorage<string[]>(
    'incoming-email-accordion-values',
    accordionItems.slice(0, 3),
  );

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="Email" />}
      tabs={<MailTabs />}
    >
      <SettingsSectionHeader size="lg" className="mb-0">
        <Trans message="Email handlers" />
        <Trans message="Configure different handlers for turning incoming emails into tickets and replies. You can enable multiple handlers at the same time." />
      </SettingsSectionHeader>
      <DocsLink
        className="mt-2 mb-6 text-sm"
        link={AdminDocsUrls.settings.incomingEmail}
      />
      <Accordion
        variant="separated"
        value={expandedValues ?? accordionItems.slice(0, 3)}
        onValueChange={values => setExpandedValues(values)}
      >
        <Accordion.Item value="imap">
          <Accordion.Trigger>
            <Trans message="IMAP" />
          </Accordion.Trigger>
          <Accordion.Content>
            <ImapPanel />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="pipe">
          <Accordion.Trigger>
            <Trans message="Pipe" />
          </Accordion.Trigger>
          <Accordion.Content>
            <PipePanel />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="api">
          <Accordion.Trigger>
            <Trans message="Rest API" />
          </Accordion.Trigger>
          <Accordion.Content>
            <ApiPanel />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="gmail">
          <Accordion.Trigger>
            <Trans message="Gmail API" />
          </Accordion.Trigger>
          <Accordion.Content>
            <GmailPanel />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="mailgun">
          <Accordion.Trigger>
            <Trans message="Mailgun" />
          </Accordion.Trigger>
          <Accordion.Content>
            <MailgunPanel />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </AdminSettingsLayout>
  );
}

function ApiPanel() {
  const {
    base_url,
    branding: {site_name},
  } = useSettings();
  return (
    <Field.Group>
      <HookForm.Field name="client.incoming_email.api.enabled">
        <Field.Label>
          <Switch />
          <Trans message="Enabled" />
        </Field.Label>
        <Field.Description>
          <Trans
            message="Send emails to :siteName from a 3rd party application or a different website using REST API."
            values={{siteName: site_name}}
          />
        </Field.Description>
      </HookForm.Field>
      <DocsLink
        className="text-sm"
        variant="link"
        link={`${base_url}/api-docs#Tickets-incomingEmail`}
      >
        <Trans message="API docs" />
      </DocsLink>
    </Field.Group>
  );
}

function MailgunPanel() {
  const {
    branding: {site_name},
  } = useSettings();
  return (
    <Field.Group>
      <HookForm.Field name="client.incoming_email.mailgun.enabled">
        <Field.Label>
          <Switch />
          <Trans message="Enabled" />
        </Field.Label>
        <Field.Description>
          <Trans
            message="Send emails to :siteName using Mailgun inbound routes functionality."
            values={{siteName: site_name}}
          />
        </Field.Description>
      </HookForm.Field>
      <HookForm.Field name="server.mailgun_secret">
        <Field.Label>
          <Trans message="Mailgun API key" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="client.incoming_email.mailgun.verify">
        <Field.Label>
          <Switch />
          <Trans message="Verify" />
        </Field.Label>
        <Field.Description>
          <Trans message="Verify that incoming request is really from mailgun. It's highly recommended to have this on, unless you are not able to receive emails from mailgun otherwise." />
        </Field.Description>
      </HookForm.Field>
    </Field.Group>
  );
}

function GmailPanel() {
  const {
    branding: {site_name},
  } = useSettings();
  const isEnabled = useWatch({name: 'client.incoming_email.gmail.enabled'});
  return (
    <SettingsErrorGroup
      name="gmail_group"
      separatorBottom={false}
      separatorTop={false}
    >
      {isInvalid => (
        <Field.Group>
          <HookForm.Field
            name="client.incoming_email.gmail.enabled"
            invalid={isInvalid}
          >
            <Field.Label>
              <Switch />
              <Trans message="Enabled" />
            </Field.Label>
            <Field.Description>
              <Trans
                message="Connect your existing gmail acocunt using gmail API."
                values={{siteName: site_name}}
              />
            </Field.Description>
          </HookForm.Field>
          <HookForm.Field
            invalid={isInvalid}
            name="client.incoming_email.gmail.topicName"
          >
            <Field.Label>
              <Trans message="Gmail topic name" />
            </Field.Label>
            <Input required={isEnabled} minLength={10} />
            <Field.Description>
              <Trans message="Google cloud Pub/Sub topic name." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>
          <ConnectGmailPanel />
        </Field.Group>
      )}
    </SettingsErrorGroup>
  );
}

function PipePanel() {
  const {
    branding: {site_name},
  } = useSettings();
  return (
    <HookForm.Field name="client.incoming_email.pipe.enabled">
      <Field.Label>
        <Switch />
        <Trans message="Enabled" />
      </Field.Label>
      <Field.Description>
        <Trans
          message="Pipe emails to :siteName from cpanel or another control panel used by your hosting provider."
          values={{siteName: site_name}}
        />
      </Field.Description>
    </HookForm.Field>
  );
}

function ImapPanel() {
  const {
    branding: {site_name},
  } = useSettings();
  const {fields, append, remove, update} = useFieldArray<
    AdminSettings,
    'client.incoming_email.imap.connections',
    'key'
  >({
    name: 'client.incoming_email.imap.connections',
    keyName: 'key',
  });

  return (
    <SettingsErrorGroup
      name="imap_group"
      separatorBottom={false}
      separatorTop={false}
    >
      {isInvalid => (
        <Fragment>
          <p className="mb-2.5 text-sm text-muted-foreground">
            <Trans
              message="Connect your existing email accounts to :siteName using IMAP."
              values={{siteName: site_name}}
            />
          </p>
          <div className="mb-5 flex flex-col gap-2.5">
            {fields.map((field, index) => (
              <div
                className={cn(
                  'flex items-center',
                  isInvalid && 'text-destructive',
                )}
                key={field.key}
              >
                <div className="mr-auto">
                  <div>{field.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {field.username}
                  </div>
                </div>

                <Tooltip.Root>
                  <CrupdateImapConnectionDialog
                    connection={field}
                    onSaved={updatedConnection =>
                      update(index, updatedConnection)
                    }
                  >
                    <Dialog.Trigger
                      render={
                        <Tooltip.Trigger
                          render={<Button size="icon" variant="ghost" />}
                        />
                      }
                    >
                      <SettingsIcon />
                    </Dialog.Trigger>
                    <Tooltip.Content>
                      <Trans message="Edit" />
                    </Tooltip.Content>
                  </CrupdateImapConnectionDialog>
                </Tooltip.Root>

                <Tooltip.Root>
                  <Tooltip.Trigger
                    onClick={() => remove(index)}
                    render={<Button size="icon" variant="ghost" />}
                  >
                    <TrashIcon />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <Trans message="Delete" />
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            ))}
          </div>
          <CrupdateImapConnectionDialog
            onSaved={connection => append(connection)}
          >
            <Dialog.Trigger
              render={<Button variant="outline" color="primary" size="sm" />}
            >
              <PlusIcon />
              <Trans message="Add connection" />
            </Dialog.Trigger>
          </CrupdateImapConnectionDialog>
        </Fragment>
      )}
    </SettingsErrorGroup>
  );
}

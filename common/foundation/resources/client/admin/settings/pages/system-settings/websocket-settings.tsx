import {AdminDocsUrls} from '@app/admin/admin-config';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ComponentType, ReactElement} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';
import {AdminSettings} from '../../admin-settings';

const broadcastConnectionOptions = [
  {value: 'null', label: <Trans message="None (Disabled)" />},
  {value: 'reverb', label: <Trans message="Local (Laravel Reverb)" />},
  {value: 'pusher', label: <Trans message="Pusher" />},
  {value: 'ably', label: <Trans message="Ably" />},
] as const;

const reverbSchemeOptions = [
  {value: 'http', label: 'HTTP'},
  {value: 'https', label: 'HTTPS'},
] as const;

type Props = {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
};
export function WebsocketSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      server: {
        broadcast_connection: data.server.broadcast_connection ?? 'null',

        // pusher
        pusher_app_id: data.server.pusher_app_id ?? '',
        pusher_app_key: data.server.pusher_app_key ?? '',
        pusher_app_secret: data.server.pusher_app_secret ?? '',
        pusher_app_cluster: data.server.pusher_app_cluster ?? '',

        // reverb
        reverb_app_id: data.server.reverb_app_id ?? '',
        reverb_app_key: data.server.reverb_app_key ?? '',
        reverb_app_secret: data.server.reverb_app_secret ?? '',
        reverb_host: data.server.reverb_host ?? '',
        reverb_port: data.server.reverb_port ?? '',
        reverb_scheme: data.server.reverb_scheme ?? 'https',

        // ably
        ably_key: data.server.ably_key ?? '',
      },
    },
  });
  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <DriverSection />
    </AdminSettingsLayout>
  );
}

function DriverSection() {
  const {clearErrors, control} = useFormContext<AdminSettings>();
  const driver = useWatch({
    control,
    name: 'server.broadcast_connection',
  });

  let CredentialSection: ComponentType<CredentialsProps> | null = null;
  if (driver === 'pusher') {
    CredentialSection = PusherFields;
  } else if (driver === 'ably') {
    CredentialSection = AblyFields;
  } else if (driver === 'reverb') {
    CredentialSection = ReverbFields;
  }
  return (
    <SettingsPanel
      title={<Trans message="Websockets Provider" />}
      description={
        <Trans message="Configure websockets provider responsible for all realtime functionality on the site." />
      }
      link={
        AdminDocsUrls.settings.websockets ? (
          <DocsLink link={AdminDocsUrls.settings.websockets}>
            <Trans message="What are websockets?" />
          </DocsLink>
        ) : null
      }
    >
      <SettingsErrorGroup
        separatorTop={false}
        separatorBottom={false}
        name="websockets_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field
              invalid={isInvalid}
              name="server.broadcast_connection"
            >
              <Select.Root
                items={broadcastConnectionOptions}
                onValueChange={() => clearErrors()}
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {broadcastConnectionOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
            {CredentialSection && <CredentialSection isInvalid={isInvalid} />}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

interface CredentialsProps {
  isInvalid: boolean;
}
function PusherFields({isInvalid}: CredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.pusher_app_id">
        <Field.Label>
          <Trans message="Pusher app ID" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.pusher_app_key">
        <Field.Label>
          <Trans message="Pusher app key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.pusher_app_secret">
        <Field.Label>
          <Trans message="Pusher app secret" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.pusher_app_cluster">
        <Field.Label>
          <Trans message="Pusher app cluster" />
        </Field.Label>
        <Input placeholder="mt1" required />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

function AblyFields({isInvalid}: CredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.ably_key">
        <Field.Label>
          <Trans message="Ably API key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

function ReverbFields({isInvalid}: CredentialsProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.reverb_host">
        <Field.Label>
          <Trans message="Reverb host" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.reverb_port">
        <Field.Label>
          <Trans message="Reverb port" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.reverb_scheme">
        <Field.Label>
          <Trans message="Reverb scheme" />
        </Field.Label>
        <Select.Root items={reverbSchemeOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {reverbSchemeOptions.map(option => (
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

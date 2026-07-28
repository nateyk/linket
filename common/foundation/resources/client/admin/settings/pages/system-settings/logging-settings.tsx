import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {ExternalLink} from '@ui/buttons/external-link';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

interface Props {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
}
export function LoggingSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      server: {
        sentry_dsn: data.server.sentry_dsn ?? '',
      },
    },
  });
  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <SentryPanel />
    </AdminSettingsLayout>
  );
}

function SentryPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Sentry Integration" />}
      description={
        <Trans
          values={{
            a: parts => (
              <ExternalLink href="https://sentry.io">{parts}</ExternalLink>
            ),
          }}
          message="<a>Sentry</a> integration provides real-time error tracking and helps identify and fix issues when site is in production."
        />
      }
      link={
        AdminDocsUrls.settings.logging ? (
          <DocsLink link={AdminDocsUrls.settings.logging} />
        ) : null
      }
    >
      <SettingsErrorGroup
        separatorTop={false}
        separatorBottom={false}
        name="logging_group"
      >
        {isInvalid => (
          <HookForm.Field invalid={isInvalid} name="server.sentry_dsn">
            <Field.Label>
              <Trans message="Sentry DSN" />
            </Field.Label>
            <Input type="url" minLength={30} />
            <Field.Error />
          </HookForm.Field>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

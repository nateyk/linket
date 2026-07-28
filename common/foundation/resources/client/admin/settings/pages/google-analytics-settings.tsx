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
import {Trans} from '@ui/i18n/trans';
import {use, useState} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      files: {
        // form will be marked as dirty without this
        certificate: '' as unknown as undefined,
      },
      server: {
        analytics_property_id: data.server.analytics_property_id ?? '',
      },
      client: {
        analytics: {
          tracking_code: data.client.analytics?.tracking_code ?? '',
          gchart_api_key: data.client.analytics?.gchart_api_key ?? '',
        },
      },
    },
  });

  return (
    <AdminSettingsLayout title={<Trans message="Analytics" />} form={form}>
      <GoogleAnalyticsPanel />
    </AdminSettingsLayout>
  );
}

function GoogleAnalyticsPanel() {
  const {clearErrors} = useFormContext<AdminSettings>();
  return (
    <SettingsPanel
      layout="vertical"
      title={<Trans message="Google analytics" />}
      description={
        <Trans message="Configure Google Analytics integration for tracking site usage and displaying statistics." />
      }
      link={
        AdminDocsUrls.settings.googleAnalytics ? (
          <DocsLink link={AdminDocsUrls.settings.googleAnalytics} />
        ) : null
      }
    >
      <SettingsErrorGroup
        separatorTop={false}
        separatorBottom={false}
        name="analytics_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field invalid={isInvalid} name="files.certificate">
              <Field.Label>
                <Trans message="Google service account key file (.json)" />
              </Field.Label>
              <CertificateFileInput
                accept=".json"
                onChange={() => clearErrors()}
              />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field
              invalid={isInvalid}
              name="server.analytics_property_id"
            >
              <Field.Label>
                <Trans message="Google analytics property ID" />
              </Field.Label>
              <Input type="number" onChange={() => clearErrors()} />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field
              invalid={isInvalid}
              name="client.analytics.tracking_code"
            >
              <Field.Label>
                <Trans message="Google tag manager measurement ID" />
              </Field.Label>
              <Input
                placeholder="G-******"
                min={1}
                max={20}
                onChange={() => clearErrors()}
              />
              <Field.Description>
                <Trans message="Google analytics measurement ID only, not the whole javascript snippet." />
              </Field.Description>
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="client.analytics.gchart_api_key">
              <Field.Label>
                <Trans message="Google maps javascript API key" />
              </Field.Label>
              <Input />
              <Field.Description>
                <Trans message="Only required in order to show world geochart on integrated analytics pages." />
              </Field.Description>
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function CertificateFileInput({
  accept,
  onChange,
}: {
  accept?: string;
  onChange?: () => void;
}) {
  const hookFieldCtx = use(HookForm.FieldContext);
  const [value, setValue] = useState('');

  return (
    <Input
      type="file"
      accept={accept}
      value={value}
      bindToHookForm={false}
      ref={hookFieldCtx?.ref}
      onBlur={() => hookFieldCtx?.onBlur()}
      onChange={e => {
        hookFieldCtx?.onChange(e.target.files?.[0]);
        setValue(e.target.value);
        onChange?.();
      }}
    />
  );
}

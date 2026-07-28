import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {
  SettingsPanel,
  SettingsSectionHeader,
} from '@common/admin/settings/layout/settings-panel';
import {BackendsSection} from '@common/admin/settings/pages/uploading-settings/backends/backends-section';
import {UploadTypesSection} from '@common/admin/settings/pages/uploading-settings/upload-types-section';
import {getServerMaxUploadSizeOptions} from '@common/admin/settings/settings-queries';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Alert} from '@shadcn/alert/alert';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';

const MaxChunkSize = 108851651149824;

const fileDeliveryOptions = [
  {value: '', label: <Trans message="None" />},
  {value: 'xsendfile', label: <Trans message="X-Sendfile (Apache)" />},
  {value: 'xaccel', label: <Trans message="X-Accel (Nginx)" />},
] as const;

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        uploading: data.client.uploading ?? {},
      },
      server: {
        static_file_delivery: data.server.static_file_delivery ?? '',
      },
    },
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="Uploading" />}
      docsLink={AdminDocsUrls.settings.uploading}
    >
      <div className="flex flex-col gap-11">
        <BackendsSection />
        <UploadTypesSection />
        <GlobalSettingsPanel />
      </div>
    </AdminSettingsLayout>
  );
}

function GlobalSettingsPanel() {
  return (
    <section>
      <SettingsSectionHeader className="mb-4" size="lg">
        <Trans message="Global settings" />
        <Trans message="Settings that will apply to all upload types and backends." />
      </SettingsSectionHeader>
      <div className="flex flex-col gap-6">
        <FileDeliveryPanel />
        <ChunkSizePanel />
      </div>
    </section>
  );
}

function FileDeliveryPanel() {
  return (
    <SettingsPanel
      title={<Trans message="File preview optimization (local backend only)" />}
      description={
        <Trans message="Integrate with X-Sendfile or X-Accel on the server to improve file preview performance." />
      }
    >
      <SettingsErrorGroup
        name="static_delivery_group"
        separatorBottom={false}
        separatorTop={false}
      >
        {isInvalid => (
          <HookForm.Field
            invalid={isInvalid}
            name="server.static_file_delivery"
          >
            <Select.Root items={fileDeliveryOptions}>
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {fileDeliveryOptions.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Field.Error />
          </HookForm.Field>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function ChunkSizePanel() {
  const {data} = useSuspenseQuery(getServerMaxUploadSizeOptions());
  return (
    <SettingsPanel
      title={<Trans message="Chunk Size" />}
      description={
        <Trans message="Upload larger files in specified size chunks to improve upload speed and allow resumable uploads." />
      }
    >
      <HookForm.Field name="client.uploading.chunk_size">
        <NumberField min={1} max={MaxChunkSize}>
          <NumberFieldDecrement />
          <div className="flex flex-auto items-center">
            <NumberFieldInput />
            <div className="pr-3 text-xs text-muted-foreground">
              <Trans message="Bytes" />
            </div>
          </div>
          <NumberFieldIncrement />
        </NumberField>
        <Field.Error />
      </HookForm.Field>
      <Alert.Root className="mt-3" variant="warning" fillStyle="subtleFill">
        <Alert.Description className="text-xs">
          <Trans
            message="Maximum upload size on your server currently is set to <b>:size</b>"
            values={{size: data?.maxSize, b: chunks => <b>{chunks}</b>}}
          />
        </Alert.Description>
      </Alert.Root>
    </SettingsPanel>
  );
}

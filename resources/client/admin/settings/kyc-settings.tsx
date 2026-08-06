import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        kyc: {
          enabled: data.client.kyc?.enabled ?? true,
          selfie_verification: data.client.kyc?.selfie_verification ?? true,
        },
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Verification" />}>
      <SettingsPanel
        title={<Trans message="Identity verification (KYC)" />}
        description={
          <Trans message="Require creators to verify their identity before requesting payouts and grant them the verified badge on public pages." />
        }
      >
        <Field.Group>
          <HookForm.Field name="client.kyc.enabled">
            <Field.Label>
              <Switch />
              <Trans message="Enable KYC verification" />
            </Field.Label>
          </HookForm.Field>

          <HookForm.Field name="client.kyc.selfie_verification">
            <Field.Label>
              <Switch />
              <Trans message="Require selfie verification" />
            </Field.Label>
          </HookForm.Field>
        </Field.Group>
      </SettingsPanel>
    </AdminSettingsLayout>
  );
}

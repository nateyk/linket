import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {Component as CommonGeneralSettings} from '@common/admin/settings/pages/general-settings';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';

export function Component() {
  const {data} = useAdminSettings();
  return (
    <CommonGeneralSettings
      slotOne={<DashboardHomeSection />}
      defaultValues={{
        client: {
          dashboard: {
            homepage: data.client.dashboard?.homepage ?? 'links',
          },
        },
      }}
    />
  );
}

const homepageOptions = [
  {value: 'links', label: <Trans message="Links" />},
  {value: 'qr-codes', label: <Trans message="QR codes" />},
  {value: 'biolinks', label: <Trans message="Link in bio" />},
  {value: 'analytics', label: <Trans message="Analytics" />},
] as const;

function DashboardHomeSection() {
  return (
    <SettingsPanel
      title={<Trans message="Dashboard home" />}
      description={
        <div>
          <Trans message="Select the page that should be the homepage for the dashboard." />
        </div>
      }
    >
      <HookForm.Field name="client.dashboard.homepage">
        <Field.Label>
          <Trans message="Homepage" />
        </Field.Label>
        <Select.Root items={homepageOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {homepageOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

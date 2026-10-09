import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {Component as CommonGeneralSettings} from '@common/admin/settings/pages/general-settings';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {normalizeHomepageValue} from '@app/dashboard/dashboard-routes';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';

export function Component() {
  const {data} = useAdminSettings();
  const rawSavedHomepage = data.client.dashboard?.homepage;
  // legacy compat: biolinks → stores (Task 5, keep map entry for biolinks redirect in dashboard-routes);
  // digital-products → items is normalized through the shared helper below.
  const savedHomepage =
    rawSavedHomepage === 'biolinks'
      ? 'stores'
      : normalizeHomepageValue(rawSavedHomepage);
  const homepage = homepageOptions.some(
    option => option.value === savedHomepage,
  )
    ? savedHomepage
    : 'overview';

  return (
    <CommonGeneralSettings
      slotOne={
        <>
          <DashboardHomeSection />
          <ProductReviewsSection />
        </>
      }
      defaultValues={{
        client: {
          dashboard: {
            homepage,
          },
          storefront: {
            reviews_enabled: data.client.storefront?.reviews_enabled ?? true,
          },
        },
      }}
    />
  );
}

const homepageOptions = [
  {value: 'overview', label: <Trans message="Overview" />},
  {value: 'stores', label: <Trans message="Storefront" />},
  {
    value: 'items',
    label: <Trans message="My Items" />,
  },
  {value: 'sales-payouts', label: <Trans message="Sales & Payouts" />},
  {value: 'insights', label: <Trans message="Insights" />},
] as const;

function DashboardHomeSection() {
  return (
    <SettingsPanel
      title={<Trans message="Dashboard home" />}
      description={
        <Trans message="Choose the first page creators see after signing in." />
      }
    >
      <HookForm.Field name="client.dashboard.homepage">
        <Field.Label>
          <Trans message="Default page" />
        </Field.Label>
        <Select.Root items={homepageOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {homepageOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function ProductReviewsSection() {
  return (
    <SettingsPanel
      title={<Trans message="Product reviews" />}
      description={
        <Trans message="Allow buyers to leave star ratings and reviews on public product pages." />
      }
    >
      <HookForm.Field name="client.storefront.reviews_enabled">
        <Field.Label>
          <Switch />
          <Trans message="Enable product reviews" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

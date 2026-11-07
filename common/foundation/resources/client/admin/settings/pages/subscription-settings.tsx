import {AdminDocsUrls} from '@app/admin/admin-config';
import {SubscriptionGatewayCard} from '@app/admin/digital-products/subscription-gateway-card';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {FormTextField} from '@ui/forms/input-field/text-field/text-field';
import {FormSwitch} from '@ui/forms/toggle/switch';
import {Select} from '@shadcn/forms/select/select';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Field} from '@shadcn/forms/field';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        billing: {
          enable: data.client.billing?.enable ?? false,
          paypal_test_mode: data.client.billing?.paypal_test_mode ?? false,
          paypal: {
            enable: data.client.billing?.paypal?.enable ?? false,
          },
          stripe: {
            enable: data.client.billing?.stripe?.enable ?? false,
          },
          chapa: {
            enable: data.client.billing?.chapa?.enable ?? true,
          },
          currency: data.client.billing?.currency ?? 'ETB',
          currency_symbol: data.client.billing?.currency_symbol ?? 'Br',
          currency_symbol_position:
            data.client.billing?.currency_symbol_position ?? 'after',
          invoice: {
            address: data.client.billing?.invoice?.address ?? '',
            notes: data.client.billing?.invoice?.notes ?? '',
          },
        },
      },
      server: {
        paypal_client_id: data.server?.paypal_client_id ?? '',
        paypal_secret: data.server?.paypal_secret ?? '',
        paypal_webhook_id: data.server?.paypal_webhook_id ?? '',
        stripe_key: data.server?.stripe_key ?? '',
        stripe_secret: data.server?.stripe_secret ?? '',
        stripe_webhook_secret: data.server?.stripe_webhook_secret ?? '',
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Subscriptions" />}>
      <GeneralSection />
      <div className="mb-6">
        <SubscriptionGatewayCard />
      </div>
      <CurrencySection />
      <InvoiceAddressSection />
      <InvoiceNotesSection />
    </AdminSettingsLayout>
  );
}

function CurrencySection() {
  return (
    <SettingsPanel
      className="mb-6"
      title={<Trans message="Currency" />}
      description={
        <Trans message="Site-wide currency used for Chapa payments, payouts, and price displays. Amounts are shown as 234.00 Br (symbol after the amount) by default." />
      }
    >
      <FormTextField
        size="sm"
        name="client.billing.currency"
        label={<Trans message="Currency code" />}
        required
        className="max-w-sm"
      />
      <FormTextField
        size="sm"
        name="client.billing.currency_symbol"
        label={<Trans message="Currency symbol" />}
        required
        className="mt-5 max-w-sm"
      />
      <HookForm.Field name="client.billing.currency_symbol_position">
        <Field.Label>
          <Trans message="Currency symbol position" />
        </Field.Label>
        <Select.Root items={symbolPositionOptions}>
          <Select.Trigger className="w-full sm:w-sm">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {symbolPositionOptions.map(option => (
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

const symbolPositionOptions = [
  {label: 'After amount (234.00 Br)', value: 'after'},
  {label: 'Before amount (Br 234.00)', value: 'before'},
];

function GeneralSection() {
  return (
    <SettingsPanel
      className="mb-6"
      title={<Trans message="Subscriptions" />}
      description={
        <Trans message="Enable or disable subscription functionality across the site." />
      }
      link={
        AdminDocsUrls.pages.subscriptions ? (
          <DocsLink link={AdminDocsUrls.pages.subscriptions}></DocsLink>
        ) : null
      }
    >
      <FormSwitch name="client.billing.enable">
        <Trans message="Enable subscriptions" />
      </FormSwitch>
    </SettingsPanel>
  );
}

function InvoiceAddressSection() {
  return (
    <SettingsPanel
      className="mb-6"
      title={<Trans message="Invoice Address" />}
      description={
        <Trans message="Set the address that will appear on customer invoices." />
      }
    >
      <FormTextField
        size="sm"
        label={<Trans message="Address" />}
        inputElementType="textarea"
        rows={2}
        name="client.billing.invoice.address"
      />
    </SettingsPanel>
  );
}

function InvoiceNotesSection() {
  return (
    <SettingsPanel
      title={<Trans message="Invoice Notes" />}
      description={
        <Trans message="Default notes to show under the notes section of customer invoices." />
      }
    >
      <FormTextField
        size="sm"
        label={<Trans message="Notes" />}
        inputElementType="textarea"
        rows={2}
        name="client.billing.invoice.notes"
      />
    </SettingsPanel>
  );
}

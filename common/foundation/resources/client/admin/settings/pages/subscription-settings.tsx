import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {FormTextField} from '@ui/forms/input-field/text-field/text-field';
import {FormSwitch} from '@ui/forms/toggle/switch';
import {Select} from '@shadcn/forms/select/select';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Field} from '@shadcn/forms/field';
import {Alert} from '@shadcn/alert/alert';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

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
        chapa_secret_key: data.server?.chapa_secret_key ?? '',
        chapa_webhook_secret: data.server?.chapa_webhook_secret ?? '',
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Subscriptions" />}>
      <GeneralSection />
      <CurrencySection />
      <ChapaSection />
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

function ChapaSection() {
  const {watch} = useFormContext<AdminSettings>();
  const chapaIsEnabled = watch('client.billing.chapa.enable');

  return (
    <SettingsPanel
      className="mb-6"
      title={<Trans message="Chapa Gateway" />}
      description={
        <Trans message="Accept ETB payments for subscriptions and Digital Products through Chapa." />
      }
      link={
        <DocsLink link="https://developer.chapa.co/laravel-sdk/">
          <Trans message="How to set up Chapa" />
        </DocsLink>
      }
    >
      <FormSwitch name="client.billing.chapa.enable">
        <Trans message="Enable Chapa" />
      </FormSwitch>
      {chapaIsEnabled && (
        <SettingsErrorGroup
          name="chapa_group"
          separatorTop={false}
          separatorBottom={false}
        >
          {isInvalid => (
            <Fragment>
              <FormTextField
                size="sm"
                name="server.chapa_secret_key"
                label={<Trans message="Chapa secret key" />}
                required
                invalid={isInvalid}
                className="mt-5"
              />
              <FormTextField
                size="sm"
                name="server.chapa_webhook_secret"
                label={<Trans message="Chapa webhook signing secret" />}
                invalid={isInvalid}
                className="mt-5"
              />
              <Alert className="mt-5" variant="default" fillStyle="subtleFill">
                <Alert.Title><Trans message="Webhook setup" /></Alert.Title>
                <Alert.Description>
                  <Trans message="In Chapa, send payment.authorized webhooks to /billing/chapa/webhook on your public HTTPS Linket URL. Paste the signing secret here; it is stored encrypted and is never shown again." />
                </Alert.Description>
              </Alert>
            </Fragment>
          )}
        </SettingsErrorGroup>
      )}
    </SettingsPanel>
  );
}

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

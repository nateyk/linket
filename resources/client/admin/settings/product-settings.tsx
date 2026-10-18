import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {useContext} from 'react';
import {useForm} from 'react-hook-form';
import {
  centsToEtb,
  etbToCents,
  settingsBooleanToSwitch,
  switchToSettingsBoolean,
} from './product-price';

declare module '@ui/settings/settings' {
  interface Settings {
    product?: {
      min_price_cents?: string | number;
      max_price_cents?: string | number;
      max_file_bytes?: string | number;
      convert_covers_to_webp?: string | number | boolean;
      allow_free_products?: string | number | boolean;
      adding_requires_review?: string | number | boolean;
      updating_requires_review?: string | number | boolean;
    };
  }
}

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        product: {
          min_price_cents: data.client.product?.min_price_cents ?? '',
          max_price_cents: data.client.product?.max_price_cents ?? '',
          max_file_bytes: data.client.product?.max_file_bytes ?? '',
          convert_covers_to_webp:
            data.client.product?.convert_covers_to_webp ?? 1,
          allow_free_products: data.client.product?.allow_free_products ?? 1,
          adding_requires_review:
            data.client.product?.adding_requires_review ?? 1,
          updating_requires_review:
            data.client.product?.updating_requires_review ?? 1,
        },
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Product" />}>
      <SettingsPanel
        title={<Trans message="General" />}
        description={
          <Trans message="Price boundaries for new and updated products. Leave a limit empty for no limit. Existing products and orders are never modified." />
        }
      >
        <Field.Group>
          <HookForm.Field name="client.product.min_price_cents">
            <Field.Label>
              <Trans message="Minimum price" />
            </Field.Label>
            <EtbNumberField />
            <Field.Description>
              <Trans message="Minimum paid price in ETB. Free products are controlled separately below." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="client.product.max_price_cents">
            <Field.Label>
              <Trans message="Maximum price" />
            </Field.Label>
            <EtbNumberField />
            <Field.Description>
              <Trans message="Maximum price in ETB. Must not be lower than the minimum price." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>
        </Field.Group>
      </SettingsPanel>

      <SettingsPanel
        title={<Trans message="Actions" />}
        description={
          <Trans message="What creators are allowed to sell on this platform." />
        }
      >
        <Field.Group>
          <HookForm.Field name="client.product.allow_free_products">
            <Field.Label>
              <NumericSwitch />
              <Trans message="Allow free products" />
            </Field.Label>
            <Field.Description>
              <Trans message="When off, products priced at zero are rejected and existing free products stay published but cannot be edited until a price is set." />
            </Field.Description>
          </HookForm.Field>

          <HookForm.Field name="client.product.adding_requires_review">
            <Field.Label>
              <NumericSwitch />
              <Trans message="Adding a product requires review" />
            </Field.Label>
            <Field.Description>
              <Trans message="When off, submitted products go live immediately without admin approval." />
            </Field.Description>
          </HookForm.Field>

          <HookForm.Field name="client.product.updating_requires_review">
            <Field.Label>
              <NumericSwitch />
              <Trans message="Updating a product requires review" />
            </Field.Label>
            <Field.Description>
              <Trans message="When off, edits to approved products keep them live instead of sending them back to draft." />
            </Field.Description>
          </HookForm.Field>
        </Field.Group>
      </SettingsPanel>

      <SettingsPanel
        title={<Trans message="Files" />}
        description={
          <Trans message="Size limits for product deliverable files. Creator storage quotas from their plan still apply separately." />
        }
      >
        <Field.Group>
          <HookForm.Field name="client.product.max_file_bytes">
            <Field.Label>
              <Trans message="Maximum upload file size" />
            </Field.Label>
            <NumberField min={1}>
              <NumberFieldDecrement />
              <div className="flex flex-auto items-center">
                <NumberFieldInput />
                <div className="pr-3 text-xs text-muted-foreground">
                  <Trans message="Bytes" />
                </div>
              </div>
              <NumberFieldIncrement />
            </NumberField>
            <Field.Description>
              <Trans message="Maximum size in bytes for a single product file. Leave empty for no platform limit." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="client.product.convert_covers_to_webp">
            <Field.Label>
              <NumericSwitch />
              <Trans message="Convert cover images to WebP" />
            </Field.Label>
            <Field.Description>
              <Trans message="After a product is saved, a JPEG or PNG cover that was not already converted is turned into WebP. That previous file entry is kept. New link images are converted when they are uploaded." />
            </Field.Description>
          </HookForm.Field>
        </Field.Group>
      </SettingsPanel>
    </AdminSettingsLayout>
  );
}

// Form state stores integer cents (backend unit); the input shows ETB.
function EtbNumberField() {
  const fieldCtx = useContext(HookForm.FieldContext);
  return (
    <HookForm.FieldContext.Provider
      value={
        fieldCtx
          ? {
              ...fieldCtx,
              value: centsToEtb(fieldCtx.value),
              onChange: (next: unknown) =>
                fieldCtx.onChange(etbToCents(next as number | null)),
            }
          : fieldCtx
      }
    >
      <NumberField min={0}>
        <NumberFieldDecrement />
        <div className="flex flex-auto items-center">
          <NumberFieldInput />
          <div className="pr-3 text-xs text-muted-foreground">
            <Trans message="ETB" />
          </div>
        </div>
        <NumberFieldIncrement />
      </NumberField>
    </HookForm.FieldContext.Provider>
  );
}

// Form state stores "1"/"0" (PHP false rows are deleted by the shared
// settings save path, so a real boolean cannot represent "off").
function NumericSwitch() {
  const fieldCtx = useContext(HookForm.FieldContext);
  return (
    <HookForm.FieldContext.Provider
      value={
        fieldCtx
          ? {
              ...fieldCtx,
              value: settingsBooleanToSwitch(fieldCtx.value),
              onChange: (next: unknown) =>
                fieldCtx.onChange(switchToSettingsBoolean(next === true)),
            }
          : fieldCtx
      }
    >
      <Switch />
    </HookForm.FieldContext.Provider>
  );
}

import {BillingPeriodPresets} from '@common/admin/plans/crupdate-plan-page/billing-period-presets';
import type {CrupdatePlanFormValues} from '@common/admin/plans/crupdate-plan-page/crupdate-plan-form';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {getCurrencyList} from '@ui/utils/intl/currencies';
import {ReactNode, useMemo, useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

interface PriceFormProps {
  index: number;
  onRemovePrice: () => void;
}

export function PriceForm({index, onRemovePrice}: PriceFormProps) {
  const {trans} = useTrans();
  const currencies = getCurrencyList();
  const {getValues, control} = useFormContext<CrupdatePlanFormValues>();
  const isEditing =
    useWatch({control, name: 'prices'})?.some(price => price.id != null) ??
    false;
  const isNewPrice = useWatch({control, name: `prices.${index}.id`}) == null;
  const subscriberCount =
    Number(
      useWatch({
        control,
        name: `prices.${index}.subscriptions_count` as any,
      }),
    ) || 0;

  const [billingPeriodPreset, setBillingPeriodPreset] = useState(() => {
    const interval = getValues(`prices.${index}.interval`);
    const intervalCount = getValues(`prices.${index}.interval_count`);
    const preset = BillingPeriodPresets.find(
      p => p.key === `${interval}${intervalCount}`,
    );
    return preset ? preset.key : 'custom';
  });

  const allowPriceChanges = !isEditing || isNewPrice || !subscriberCount;

  const currencyItems = useMemo(
    () =>
      currencies.map(currency => ({
        value: currency.code,
        label: `${currency.code}: ${currency.name}`,
      })),
    [currencies],
  );

  const billingPeriodItems = useMemo(
    () =>
      BillingPeriodPresets.map(preset => ({
        value: preset.key,
        label: preset.label,
      })),
    [],
  );

  return (
    <Field.Group>
      {!allowPriceChanges && (
        <p className="text-sm text-muted-foreground">
          <Trans
            message="This price can't modified or deleted, because it has [one 1 subscriber|other :count subscribers]. You can instead add a new price."
            values={{count: subscriberCount}}
          />
        </p>
      )}

      <HookForm.Field
        name={`prices.${index}.amount`}
        disabled={!allowPriceChanges}
      >
        <Field.Label>
          <Trans message="Amount" />
        </Field.Label>
        <NumberField min={0.1} step={0.01} required>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberField>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field
        name={`prices.${index}.currency`}
        disabled={!allowPriceChanges}
      >
        <Field.Label>
          <Trans message="Currency" />
        </Field.Label>
        <Select.Root items={currencyItems} required>
          <Select.Trigger className="w-full">
            <Select.Value placeholder={trans(message('Search currencies'))} />
          </Select.Trigger>
          <Select.Content>
            {currencyItems.map(currency => (
              <Select.Item key={currency.value} value={currency.value}>
                {currency.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <BillingPeriodSelect
        disabled={!allowPriceChanges}
        index={index}
        value={billingPeriodPreset}
        items={billingPeriodItems}
        onValueChange={setBillingPeriodPreset}
      />

      {billingPeriodPreset === 'custom' && (
        <CustomBillingPeriodField disabled={!allowPriceChanges} index={index} />
      )}

      <div className="text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!allowPriceChanges}
          onClick={onRemovePrice}
        >
          <Trans message="Delete price" />
        </Button>
      </div>
    </Field.Group>
  );
}

interface BillingPeriodSelectProps {
  index: number;
  value: string;
  items: {value: string; label: ReactNode}[];
  onValueChange: (value: string) => void;
  disabled: boolean;
}

function BillingPeriodSelect({
  index,
  value,
  items,
  onValueChange,
  disabled,
}: BillingPeriodSelectProps) {
  const {setValue: setFormValue} = useFormContext<CrupdatePlanFormValues>();

  return (
    <Field.Root>
      <Field.Label>
        <Trans message="Billing period" />
      </Field.Label>
      <Select.Root
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={selectedValue => {
          onValueChange(selectedValue as string);
          if (selectedValue !== 'custom') {
            const preset = BillingPeriodPresets.find(
              p => p.key === selectedValue,
            );
            if (preset?.interval && preset.interval_count) {
              setFormValue(`prices.${index}.interval`, preset.interval, {
                shouldDirty: true,
              });
              setFormValue(
                `prices.${index}.interval_count`,
                preset.interval_count,
                {shouldDirty: true},
              );
            }
          }
        }}
      >
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {items.map(item => (
            <Select.Item key={item.value} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
  );
}

const intervalItems = [
  {value: 'day', label: <Trans message="Day(s)" />},
  {value: 'week', label: <Trans message="Week(s)" />},
  {value: 'month', label: <Trans message="Month(s)" />},
  {value: 'year', label: <Trans message="Year(s)" />},
];

interface CustomBillingPeriodFieldProps {
  index: number;
  disabled: boolean;
}

function CustomBillingPeriodField({
  index,
  disabled,
}: CustomBillingPeriodFieldProps) {
  const {watch} = useFormContext<CrupdatePlanFormValues>();
  const interval = watch(`prices.${index}.interval`);
  let maxIntervalCount: number;

  if (interval === 'day') {
    maxIntervalCount = 365;
  } else if (interval === 'week') {
    maxIntervalCount = 52;
  } else {
    maxIntervalCount = 12;
  }

  return (
    <div className="flex w-min rounded-input border">
      <div className="flex items-center px-4.5 text-sm">
        <Trans message="Every" />
      </div>
      <HookForm.Field
        name={`prices.${index}.interval_count`}
        disabled={disabled}
      >
        <NumberField
          min={1}
          max={maxIntervalCount}
          className="min-w-20 rounded-none border-y-0"
          required
        >
          <NumberFieldInput />
        </NumberField>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name={`prices.${index}.interval`} disabled={disabled}>
        <Select.Root items={intervalItems}>
          <Select.Trigger className="border-none">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {intervalItems.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </div>
  );
}

import {Product} from '@app/gen/schemas/product';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ComponentProps} from 'react';
import {UpsellBillingCycle} from './find-best-price';
import {UpsellLabel} from './upsell-label';

interface BillingCycleRadioProps extends Omit<
  ComponentProps<typeof RadioGroup>,
  'children' | 'onChange'
> {
  selectedCycle: UpsellBillingCycle;
  onChange: (value: UpsellBillingCycle) => void;
  products?: Product[];
}
export function BillingCycleRadio({
  selectedCycle,
  onChange,
  products,
  className,
  ...radioGroupProps
}: BillingCycleRadioProps) {
  return (
    <RadioGroup
      orientation="horizontal"
      value={selectedCycle}
      onValueChange={value => onChange(value)}
      className={cn('text-lg', className)}
      {...radioGroupProps}
    >
      <label className="flex items-center gap-2">
        <RadioGroupItem value="yearly" />
        <Trans message="Annual" />
        <UpsellLabel products={products} />
      </label>
      <label className="flex items-center gap-2">
        <RadioGroupItem value="monthly" />
        <Trans message="Monthly" />
      </label>
    </RadioGroup>
  );
}

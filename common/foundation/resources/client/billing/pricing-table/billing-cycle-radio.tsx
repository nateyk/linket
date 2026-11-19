import {Product} from '@app/gen/schemas/product';
import {SegmentedRadio} from '@ui/forms/segmented-radio-group/segmented-radio';
import {SegmentedRadioGroup} from '@ui/forms/segmented-radio-group/segmented-radio-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {UpsellBillingCycle} from './find-best-price';
import {UpsellLabel} from './upsell-label';

interface BillingCycleRadioProps {
  selectedCycle: UpsellBillingCycle;
  onChange: (value: UpsellBillingCycle) => void;
  products?: Product[];
  className?: string;
}

export function BillingCycleRadio({
  selectedCycle,
  onChange,
  products,
  className,
}: BillingCycleRadioProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <SegmentedRadioGroup
        value={selectedCycle}
        onChange={value => onChange(value as UpsellBillingCycle)}
        variant="outline"
      >
        <SegmentedRadio value="monthly">
          <Trans message="Monthly" />
        </SegmentedRadio>
        <SegmentedRadio value="yearly">
          <Trans message="Annual" />
        </SegmentedRadio>
      </SegmentedRadioGroup>
      <div className="text-sm">
        <UpsellLabel products={products} />
      </div>
    </div>
  );
}

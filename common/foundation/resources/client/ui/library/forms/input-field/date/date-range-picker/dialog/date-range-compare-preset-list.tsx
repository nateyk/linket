import {Button} from '@shadcn/button/button';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangeComparePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-compare-presets';
import {Trans} from '@ui/i18n/trans';

type Props = {
  originalRangeValue: DateRangeValue;
  onPresetSelected: (value: DateRangeValue) => void;
  selectedValue?: DateRangeValue | null;
};

export function DateRangeComparePresetList({
  originalRangeValue,
  onPresetSelected,
  selectedValue,
}: Props) {
  return (
    <ul>
      {DateRangeComparePresets.map(preset => (
        <li key={preset.key}>
          <Button
            variant="ghost"
            className="w-full justify-start font-normal"
            color={selectedValue?.preset === preset.key ? 'primary' : 'default'}
            onClick={() => {
              const newValue = preset.getRangeValue(originalRangeValue);
              onPresetSelected(newValue);
            }}
          >
            <Trans {...preset.label} />
          </Button>
        </li>
      ))}
    </ul>
  );
}

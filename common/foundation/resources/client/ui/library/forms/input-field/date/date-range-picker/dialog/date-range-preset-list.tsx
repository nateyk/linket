import {Button} from '@shadcn/button/button';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {Trans} from '@ui/i18n/trans';

type Props = {
  onPresetSelected: (value: DateRangeValue) => void;
  selectedValue?: DateRangeValue | null;
};
export function DatePresetList({onPresetSelected, selectedValue}: Props) {
  return (
    <ul>
      {DateRangePresets.map(preset => (
        <li key={preset.key}>
          <Button
            className="w-full justify-start font-normal"
            color={selectedValue?.preset === preset.key ? 'primary' : 'default'}
            variant="ghost"
            onClick={() => {
              const newValue = preset.getRangeValue();
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

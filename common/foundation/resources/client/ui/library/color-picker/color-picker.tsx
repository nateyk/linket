import {ColorPresets} from '@ui/color-picker/color-presets';
import {ColorSwatch} from '@ui/color-picker/color-swatch';
import {getInputFieldClassNames} from '@ui/forms/input-field/get-input-field-class-names';
import {HexColorInput, HexColorPicker} from 'react-colorful';

const DefaultPresets = ColorPresets.map(({color}) => color).slice(0, 14);

type Props = {
  value: string;
  onChange: (value: string) => void;
  colorPresets?: string[];
  showInput?: boolean;
};
export function ColorPicker({value, onChange, colorPresets, showInput}: Props) {
  const presets: string[] = colorPresets || DefaultPresets;

  const style = getInputFieldClassNames({size: 'sm'});

  return (
    <div>
      <HexColorPicker
        className="w-auto!"
        color={value}
        onChange={newColor => {
          onChange?.(newColor);
        }}
      />
      <div className="py-5">
        {presets && (
          <div className="grid grid-cols-7 gap-2">
            {presets.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                onChange={onChange}
                isActive={
                  color.replaceAll(' ', '') === value?.replaceAll(' ', '')
                }
              />
            ))}
          </div>
        )}
        {showInput && (
          <div className="pt-5">
            <HexColorInput
              autoComplete="off"
              role="textbox"
              autoCorrect="off"
              spellCheck="false"
              required
              aria-label="Hex color"
              prefixed
              className={style.input}
              color={value}
              onChange={newColor => {
                onChange?.(newColor);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import {useSettingsPageStore} from '@common/admin/settings/layout/settings-page-store';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {convertColorToFormat} from '@ui/themes/utils/convert-color-to-format';
import {ChevronRightIcon, DropletIcon} from 'lucide-react';
import {ReactNode, useEffect, useState} from 'react';

interface Props {
  label: ReactNode;
  colorName: string;
  initialThemeValue: string;
  size?: 'sm' | 'lg';
}
export function ThemeColorButton({
  label,
  colorName,
  initialThemeValue,
  size = 'lg',
}: Props) {
  const preview = useSettingsPageStore(s => s.preview);
  const [selectedThemeValue, setSelectedThemeValue] =
    useState<string>(initialThemeValue);

  // set color as css variable in preview and on button preview, but not in appearance values
  // this way color change can be canceled when color picker is closed and applied explicitly via apply button
  const selectThemeValue = (themeValue: string) => {
    setSelectedThemeValue(themeValue);
    preview.setThemeValue(colorName, themeValue);
  };

  useEffect(() => {
    // need to update the color here so changes via "reset colors" button are reflected
    setSelectedThemeValue(initialThemeValue);
  }, [initialThemeValue]);

  return (
    <ColorPickerPopover
      value={convertColorToFormat(selectedThemeValue, 'hex')}
      onChange={selectThemeValue}
      side="right"
    >
      <Popover.Trigger
        className="flex w-full justify-start shadow-none"
        render={<Button variant="outline" size={size} />}
      >
        <DropletIcon
          style={{fill: selectedThemeValue}}
          className="size-6 stroke-border stroke-1"
        />
        {label}
        <ChevronRightIcon
          data-icon="inline-end"
          className="ml-auto text-muted-foreground"
        />
      </Popover.Trigger>
    </ColorPickerPopover>
  );
}

import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BgSelectorTabProps} from '@common/background-selector/bg-selector-tab-props';
import {TypeButton} from '@common/background-selector/type-button';
import {ColorField} from '@ui/color-picker/color-field';
import {Trans} from '@ui/i18n/trans';
import {PaintBucketIcon} from 'lucide-react';

export function ColorTypeButton({
  isActive,
  onSelected,
  value,
}: {
  onSelected: (nextValue: BackgroundSelectorConfig) => void;
  value: BackgroundSelectorConfig | undefined;
  isActive: boolean;
}) {
  return (
    <TypeButton
      isActive={isActive}
      icon={<PaintBucketIcon />}
      title={<Trans message="Solid" />}
      onClick={() => onSelected({backgroundColor: value?.backgroundColor})}
      style={{backgroundColor: value?.backgroundColor}}
    />
  );
}

export function ColorBackgroundTab({
  value,
  onChange,
}: BgSelectorTabProps<BackgroundSelectorConfig>) {
  const colorValue = value?.backgroundColor ?? '';
  return (
    <ColorField
      label={<Trans message="Background color" />}
      value={colorValue}
      onChange={newColor => onChange?.({backgroundColor: newColor})}
    />
  );
}

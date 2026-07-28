import {UploadType} from '@app/site-config';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {
  ColorBackgroundTab,
  ColorTypeButton,
} from '@common/background-selector/colors/color-background-tab';
import {
  GradientBackgroundTab,
  GradientTypeButton,
} from '@common/background-selector/gradients/gradient-background-tab';
import {
  ImageBackgroundTab,
  ImageTypeButton,
} from '@common/background-selector/images/image-background-tab';
import {
  PatternBackgroundTab,
  PatternTypeButton,
} from '@common/background-selector/patterns/pattern-background-tab';
import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';

const TabMap = {
  color: ColorBackgroundTab,
  gradient: GradientBackgroundTab,
  image: ImageBackgroundTab,
  pattern: PatternBackgroundTab,
} as const;
type TabName = keyof typeof TabMap;

interface BackgroundSelectorProps {
  className?: string;
  tabClassName?: string;
  value: BackgroundSelectorConfig | undefined;
  onChange: (newValue: BackgroundSelectorConfig | null) => void;
  centerTabs?: boolean;
  underTabs?: ReactNode;
  isInsideDialog?: boolean;
  positionSelector?: 'simple' | 'advanced';
  uploadType: keyof typeof UploadType;
}
export function BackgroundSelector({
  className,
  value,
  onChange,
  tabClassName,
  centerTabs,
  underTabs,
  uploadType,
}: BackgroundSelectorProps) {
  const activeType: TabName = value?.activeType ?? 'color';

  const Tab = TabMap[activeType];

  return (
    <div className={className}>
      <TypeSelector
        activeType={activeType}
        onSelected={nextValue => onChange?.(nextValue)}
        className={cn(centerTabs && 'justify-center')}
        value={value}
      />
      {underTabs}
      <Tab
        value={value}
        onChange={onChange}
        uploadType={uploadType}
        className={tabClassName}
      />
    </div>
  );
}

interface TypeSelectorProps {
  activeType: TabName;
  onSelected: (nextValue: BackgroundSelectorConfig) => void;
  value?: BackgroundSelectorConfig;
  className?: string;
}
function TypeSelector({
  activeType,
  onSelected: onTabChange,
  value,
  className,
}: TypeSelectorProps) {
  const handleSelected = (nextValue: BackgroundSelectorConfig) => {
    if (activeType !== nextValue.activeType) {
      onTabChange(nextValue);
    }
  };

  return (
    <div
      className={cn('mb-5 flex items-center gap-5 border-b pb-5', className)}
    >
      <ColorTypeButton
        isActive={activeType === 'color'}
        onSelected={next => handleSelected({...next, activeType: 'color'})}
        value={value}
      />
      <GradientTypeButton
        isActive={activeType === 'gradient'}
        onSelected={next =>
          handleSelected({
            ...next,
            activeType: 'gradient',
          })
        }
        value={value}
      />
      <PatternTypeButton
        isActive={activeType === 'pattern'}
        onSelected={next =>
          handleSelected({
            ...next,
            activeType: 'pattern',
          })
        }
        value={value}
      />
      <ImageTypeButton
        isActive={activeType === 'image'}
        onSelected={next =>
          handleSelected({
            ...next,
            activeType: 'image',
          })
        }
        value={value}
      />
    </div>
  );
}

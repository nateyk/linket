import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BgSelectorTabProps} from '@common/background-selector/bg-selector-tab-props';
import {
  patternBackgrounds,
  patternColorPresets,
} from '@common/background-selector/patterns/pattern-backgrounds';
import {TypeButton} from '@common/background-selector/type-button';
import {cssPropsFromBgConfig} from '@common/background-selector/utils/css-props-from-bg-config';
import {Field} from '@shadcn/forms/field';
import {Slider} from '@shadcn/forms/slider/slider';
import {ColorField} from '@ui/color-picker/color-field';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import Color from 'colorjs.io';
import {EqualApproximatelyIcon} from 'lucide-react';
import {CSSProperties, useMemo} from 'react';

const patternPreviewSize = 4;

type PatternPreviewStyle = CSSProperties & {
  '--bg-pattern-front': string;
  '--bg-pattern-back': string;
  '--bg-pattern-size': string;
};

export function PatternTypeButton({
  isActive,
  onSelected,
  value,
}: {
  isActive: boolean;
  onSelected: (nextValue: BackgroundSelectorConfig) => void;
  value: BackgroundSelectorConfig | undefined;
}) {
  const style: CSSProperties = useMemo(() => {
    if (isActive && value) {
      return cssPropsFromBgConfig(value)!;
    } else {
      return {backgroundColor: value?.backgroundColor};
    }
  }, [value, isActive]);

  return (
    <TypeButton
      isActive={isActive}
      icon={<EqualApproximatelyIcon />}
      title={<Trans message="Pattern" />}
      onClick={() => {
        const backgroundColor = value?.backgroundColor ?? '#fff';
        const frontColor =
          new Color(backgroundColor).luminance > 0.5
            ? 'rgba(0, 0, 0, 0.3)'
            : 'rgba(255, 255, 255, 0.3)';
        return onSelected({
          backgroundColor: backgroundColor,
          patternFrontColor: frontColor,
          ...patternBackgrounds[0],
        });
      }}
      style={style}
    />
  );
}
export function PatternBackgroundTab({
  value,
  onChange,
  className,
}: BgSelectorTabProps<BackgroundSelectorConfig>) {
  const frontColor = value?.patternFrontColor ?? '#fff';
  const backColor = value?.backgroundColor ?? '#000';

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="grid grid-cols-10 gap-2">
        {patternBackgrounds.map((background, index) => {
          const isActive =
            value?.backgroundImage === background.backgroundImage &&
            value?.backgroundSize === background.backgroundSize;
          return (
            <button
              className={cn(
                'aspect-square rounded-lg outline-offset-2 outline-primary focus-visible:outline-2',
                isActive && 'outline-2',
              )}
              key={index}
              style={
                {
                  ...cssPropsFromBgConfig(background),
                  '--bg-pattern-front': 'var(--be-foreground)',
                  '--bg-pattern-back': 'var(--be-accent)',
                  '--bg-pattern-size': `${patternPreviewSize}px`,
                } as PatternPreviewStyle
              }
              onClick={() =>
                onChange({
                  ...value,
                  ...{
                    // clear previous size/position/repeat so it's not applied to new pattern
                    backgroundSize: undefined,
                    backgroundPosition: undefined,
                    backgroundRepeat: undefined,
                    ...background,
                  },
                })
              }
            ></button>
          );
        })}
      </div>

      <div>
        <Field.Title className="mb-2">
          <Trans message="Color presets" />
        </Field.Title>
        <div className="flex flex-wrap gap-2">
          {patternColorPresets.map((color: string[], index: number) => (
            <button
              type="button"
              onClick={() => {
                onChange?.({
                  ...value,
                  patternFrontColor: color[0],
                  backgroundColor: color[1],
                });
              }}
              key={index}
              className="flex size-8 items-center overflow-hidden rounded-lg border"
              style={{backgroundColor: color[0]}}
            >
              <span
                className="h-full w-1/2"
                style={{backgroundColor: color[0]}}
              />
              <span
                className="h-full w-1/2"
                style={{backgroundColor: color[1]}}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ColorField
          label={<Trans message="Background color" />}
          value={backColor}
          onChange={newColor =>
            onChange?.({...value, backgroundColor: newColor})
          }
        />
        <ColorField
          label={<Trans message="Pattern color" />}
          value={frontColor}
          onChange={newColor =>
            onChange?.({...value, patternFrontColor: newColor})
          }
        />
      </div>

      <Slider
        min={1}
        max={15}
        step={1}
        value={value?.patternSize ?? 5}
        disabled={!value}
        onValueChange={next => {
          if (value) {
            onChange?.({
              ...value,
              patternSize: Math.round(next as number),
            });
          }
        }}
      >
        <Slider.Label>
          <Trans message="Pattern size" />
        </Slider.Label>
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
          </Slider.Track>
          <Slider.Thumb />
        </Slider.Control>
      </Slider>
    </div>
  );
}

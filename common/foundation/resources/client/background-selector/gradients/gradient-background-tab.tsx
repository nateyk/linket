import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BgSelectorTabProps} from '@common/background-selector/bg-selector-tab-props';
import {GradientBackgrounds} from '@common/background-selector/gradients/gradient-backgrounds';
import {TypeButton} from '@common/background-selector/type-button';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Popover} from '@shadcn/popover/popover';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import Color from 'colorjs.io';
import {parse, type ColorStop} from 'gradient-parser';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  SwatchBookIcon,
} from 'lucide-react';
import {CSSProperties, useMemo} from 'react';

type ParsedGradient = {
  colorStops: string[];
  angle: string;
};

export function GradientTypeButton({
  isActive,
  onSelected,
  value,
}: {
  isActive: boolean;
  onSelected: (nextValue: BackgroundSelectorConfig) => void;
  value: BackgroundSelectorConfig | undefined;
}) {
  const style = useMemo(() => {
    const style: Pick<CSSProperties, 'backgroundColor' | 'backgroundImage'> =
      {};

    if (isActive && value?.backgroundImage) {
      const parsed = parseGradient(value.backgroundImage);
      if (parsed) {
        style.backgroundImage = value.backgroundImage;
        style.backgroundColor = parsed.colorStops[0];
      }
    } else {
      const placeholder = placeholderGradientFromValue(value);
      style.backgroundImage = `linear-gradient(180deg, ${placeholder.colorStops.join(', ')})`;
      style.backgroundColor = placeholder.colorStops[0];
    }

    return style;
  }, [value, isActive]);

  return (
    <TypeButton
      isActive={isActive}
      icon={<SwatchBookIcon />}
      title={<Trans message="Gradient" />}
      onClick={() => {
        onSelected({
          ...gradientStateToValue(placeholderGradientFromValue(value)),
        });
      }}
      style={style}
    />
  );
}

export function GradientBackgroundTab({
  value,
  onChange,
  className,
}: BgSelectorTabProps<BackgroundSelectorConfig>) {
  const state = useMemo(() => valueToGradientState(value), [value]);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <GradientColorPicker
        state={state}
        onChange={nextValue =>
          onChange({
            ...value,
            ...nextValue,
          })
        }
      />

      <DirectionPicker
        value={state.angle}
        onChange={newAngle =>
          onChange({
            ...value,
            ...gradientStateToValue({...state, angle: newAngle}),
          })
        }
      />

      <PreMadeGradientsList value={value} onChange={onChange} />
    </div>
  );
}

function GradientColorPicker({
  state,
  onChange,
}: {
  state: ParsedGradient;
  onChange: (newValue: BackgroundSelectorConfig) => void;
}) {
  return (
    <section>
      <Field.Title className="mb-2">
        <Trans message="Gradient color" />
      </Field.Title>
      <div className="relative isolate flex size-7 w-full items-center justify-between">
        {state.colorStops.map((stop, index) => (
          <ColorPickerPopover
            key={index}
            value={stop}
            onChange={value =>
              onChange(
                gradientStateToValue({
                  ...state,
                  colorStops: state.colorStops.map((stop, i) =>
                    i === index ? value : stop,
                  ),
                }),
              )
            }
          >
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Popover.Trigger
                    className="z-10 block size-7 rounded-full border transition-colors hover:border-primary"
                    style={{backgroundColor: stop}}
                  />
                }
                type="button"
              />
              <Tooltip.Content>
                <Trans message="Click to change color" />
              </Tooltip.Content>
            </Tooltip.Root>
          </ColorPickerPopover>
        ))}

        <div
          className="absolute inset-0 m-auto mx-auto h-3.5 w-[calc(100%-14px)] flex-auto border"
          style={{
            backgroundImage: `linear-gradient(90deg, ${state.colorStops.join(', ')})`,
          }}
        />
      </div>
    </section>
  );
}

function DirectionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const activeStyle = 'text-primary border-primary';
  return (
    <section>
      <Field.Title className="mb-2">
        <Trans message="Gradient direction" />
      </Field.Title>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '0deg' ? activeStyle : undefined}
          onClick={() => onChange('0deg')}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '180deg' ? activeStyle : undefined}
          onClick={() => onChange('180deg')}
        >
          <ArrowDownIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '90deg' ? activeStyle : undefined}
          onClick={() => onChange('90deg')}
        >
          <ArrowRightIcon />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '135deg' ? activeStyle : undefined}
          onClick={() => onChange('135deg')}
        >
          <ArrowDownIcon className="-rotate-45" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '225deg' ? activeStyle : undefined}
          onClick={() => onChange('225deg')}
        >
          <ArrowDownIcon className="rotate-45" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '45deg' ? activeStyle : undefined}
          onClick={() => onChange('45deg')}
        >
          <ArrowUpIcon className="rotate-45" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          color="default"
          className={value === '325deg' ? activeStyle : undefined}
          onClick={() => onChange('325deg')}
        >
          <ArrowUpIcon className="-rotate-45" />
        </Button>
      </div>
    </section>
  );
}

function PreMadeGradientsList({
  value,
  onChange,
}: {
  value: BackgroundSelectorConfig | undefined;
  onChange: (newValue: BackgroundSelectorConfig) => void;
}) {
  return (
    <section>
      <Field.Title className="mb-2">
        <Trans message="Pre-made gradients" />
      </Field.Title>
      <div className="flex flex-wrap gap-2">
        {GradientBackgrounds.map(gradient => (
          <button
            type="button"
            className="size-10 rounded-full border outline-offset-2 outline-primary focus-visible:outline-2 data-active:outline-2"
            key={gradient.backgroundImage}
            data-active={value?.backgroundImage === gradient.backgroundImage}
            style={{
              backgroundImage: gradient.backgroundImage,
            }}
            onClick={() => {
              const parsed = parseGradient(gradient.backgroundImage);
              return onChange?.({
                ...value,
                backgroundColor: parsed?.colorStops[1],
                ...gradient,
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}

export function valueToGradientState(
  value?: BackgroundSelectorConfig,
): ParsedGradient {
  try {
    const parsed = parseGradient(value?.backgroundImage);
    if (parsed) return parsed;
  } catch {
    //
  }

  return placeholderGradientFromValue(value);
}

function gradientStateToValue(state: ParsedGradient) {
  return {
    backgroundImage: `linear-gradient(${state.angle}, ${state.colorStops.join(', ')})`,
    backgroundColor: state.colorStops[1],
  };
}

function placeholderGradientFromValue(
  value: BackgroundSelectorConfig | undefined,
) {
  const baseStop = value?.backgroundColor || '#fff';
  let darkerStop = baseStop;

  try {
    darkerStop = new Color(baseStop).darken(0.3).toString({format: 'hex'});
  } catch {
    //
  }

  return {
    angle: '90deg',
    colorStops: [darkerStop, baseStop],
  };
}

function parseGradient(gradient: string | undefined): ParsedGradient | null {
  if (!gradient) return null;

  try {
    const gradients = parse(gradient);
    if (gradients[0] && gradients[0].type === 'linear-gradient') {
      return {
        colorStops: gradients[0].colorStops.map(colorStop =>
          colorStopToSimpleColor(colorStop),
        ),
        angle:
          gradients[0].orientation?.type === 'angular'
            ? `${gradients[0].orientation.value}${gradients[0].orientation.unit}`
            : '90deg',
      };
    }
  } catch {
    return null;
  }

  return null;
}

function colorStopToSimpleColor(colorStop: ColorStop) {
  switch (colorStop.type) {
    case 'hex':
      return `#${colorStop.value}`;
    case 'rgb':
      return `rgb(${colorStop.value.join(', ')})`;
    case 'rgba':
      return `rgba(${colorStop.value.join(', ')})`;
    case 'hsl':
      return `hsl(${colorStop.value[0]}, ${colorStop.value[1]}%, ${colorStop.value[2]}%)`;
    case 'hsla':
      return `hsla(${colorStop.value[0]}, ${colorStop.value[1]}%, ${colorStop.value[2]}%, ${colorStop.value[3]})`;
    default:
      return '#fff';
  }
}

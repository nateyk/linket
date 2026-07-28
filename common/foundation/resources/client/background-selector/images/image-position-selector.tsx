import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {Label} from '@shadcn/forms/label';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  CircleDotIcon,
  Maximize2Icon,
  Minimize2Icon,
  RepeatIcon,
} from 'lucide-react';
import {ReactNode} from 'react';

type BackgroundPositionValue = Extract<
  NonNullable<BackgroundSelectorConfig['backgroundPosition']>,
  string
>;

const BackgroundFitOptions: Record<
  'cover' | 'contain' | 'repeat',
  {
    label: ReactNode;
    bgConfig: Partial<BackgroundSelectorConfig>;
  }
> = {
  cover: {
    label: (
      <>
        <Maximize2Icon />
        <Trans message="Stretch to fit" />
      </>
    ),
    bgConfig: {
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    },
  },
  contain: {
    label: (
      <>
        <Minimize2Icon />
        <Trans message="Fit image" />
      </>
    ),
    bgConfig: {
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
    },
  },
  repeat: {
    label: (
      <>
        <RepeatIcon />
        <Trans message="Repeat image" />
      </>
    ),
    bgConfig: {
      backgroundRepeat: 'repeat',
      backgroundSize: undefined,
    },
  },
};

const BackgroundPositionOptions: {
  value: BackgroundPositionValue;
  label: ReactNode;
}[] = [
  {
    value: 'left top',
    label: (
      <>
        <ArrowUpLeftIcon />
        <Trans message="Top left" />
      </>
    ),
  },
  {
    value: 'center top',
    label: (
      <>
        <ArrowUpIcon />
        <Trans message="Top center" />
      </>
    ),
  },
  {
    value: 'right top',
    label: (
      <>
        <ArrowUpRightIcon />
        <Trans message="Top right" />
      </>
    ),
  },
  {
    value: 'left center',
    label: (
      <>
        <ArrowLeftIcon />
        <Trans message="Center left" />
      </>
    ),
  },
  {
    value: 'center center',
    label: (
      <>
        <CircleDotIcon />
        <Trans message="Center" />
      </>
    ),
  },
  {
    value: 'right center',
    label: (
      <>
        <ArrowRightIcon />
        <Trans message="Center right" />
      </>
    ),
  },
  {
    value: 'left bottom',
    label: (
      <>
        <ArrowDownLeftIcon />
        <Trans message="Bottom left" />
      </>
    ),
  },
  {
    value: 'center bottom',
    label: (
      <>
        <ArrowDownIcon />
        <Trans message="Bottom center" />
      </>
    ),
  },
  {
    value: 'right bottom',
    label: (
      <>
        <ArrowDownRightIcon />
        <Trans message="Bottom right" />
      </>
    ),
  },
];

interface Props<
  T extends Pick<
    BackgroundSelectorConfig,
    'backgroundPosition' | 'backgroundRepeat' | 'backgroundSize'
  >,
> {
  disabled?: boolean;
  value?: T;
  onChange?: (value: T) => void;
  className?: string;
}
export function ImagePositionSelector<
  T extends Pick<
    BackgroundSelectorConfig,
    'backgroundPosition' | 'backgroundRepeat' | 'backgroundSize'
  >,
>({value, onChange, className, disabled}: Props<T>) {
  const selectedFit = fitKeyFromValue(value);
  const selectedPosition = positionFromValue(value);
  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>
            <Trans message="Fit" />
          </Label>
          <Select.Root
            items={Object.entries(BackgroundFitOptions).map(
              ([key, option]) => ({
                value: key,
                label: option.label,
              }),
            )}
            value={selectedFit}
            onValueChange={selected => {
              if (value) {
                onChange?.({
                  ...value,
                  ...BackgroundFitOptions[
                    selected as keyof typeof BackgroundFitOptions
                  ].bgConfig,
                });
              }
            }}
            disabled={disabled || !value}
          >
            <Select.Trigger className="mt-2 w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {Object.entries(BackgroundFitOptions).map(([key, option]) => (
                <Select.Item key={key} value={key}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        <div>
          <Label>
            <Trans message="Position" />
          </Label>
          <Select.Root
            items={BackgroundPositionOptions}
            value={selectedPosition}
            onValueChange={selected => {
              if (value) {
                onChange?.({
                  ...value,
                  backgroundPosition:
                    selected as BackgroundSelectorConfig['backgroundPosition'],
                });
              }
            }}
            disabled={disabled || !value}
          >
            <Select.Trigger className="mt-2 w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {BackgroundPositionOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>
  );
}

function fitKeyFromValue(
  value?: Props<any>['value'],
): keyof typeof BackgroundFitOptions {
  if (value?.backgroundSize === 'cover') {
    return 'cover';
  } else if (value?.backgroundSize === 'contain') {
    return 'contain';
  } else {
    return 'repeat';
  }
}

function positionFromValue(
  value?: Props<any>['value'],
): BackgroundPositionValue {
  if (
    BackgroundPositionOptions.some(
      position => position.value === value?.backgroundPosition,
    )
  ) {
    return value.backgroundPosition as BackgroundPositionValue;
  }

  return 'center center';
}

import {UploadType} from '@app/site-config';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BgSelectorTabProps} from '@common/background-selector/bg-selector-tab-props';
import type {ImageBackgroundEffect} from '@common/background-selector/image-background-effect';
import {ImagePositionSelector} from '@common/background-selector/images/image-position-selector';
import {UnsplashPopover} from '@common/background-selector/images/unsplash/unsplash-popover';
import {WallpapersPopover} from '@common/background-selector/images/wallpapers/wallpapers-popover';
import {TypeButton} from '@common/background-selector/type-button';
import {cssPropsFromBgConfig} from '@common/background-selector/utils/css-props-from-bg-config';
import {ImageSelectorDialog} from '@common/uploads/components/image-selector-dialog';
import {SiUnsplash} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Label} from '@shadcn/forms/label';
import {Slider} from '@shadcn/forms/slider/slider';
import {Switch} from '@shadcn/forms/switch/switch';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {
  BanIcon,
  ContrastIcon,
  DropletIcon,
  GripIcon,
  ImageIcon,
  MoonIcon,
  SunIcon,
  UploadIcon,
} from 'lucide-react';
import {CSSProperties, ReactNode, useId, useMemo} from 'react';

const defaultPosition = {
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
} as const;

export function ImageTypeButton({
  isActive,
  onSelected,
  value,
}: {
  isActive: boolean;
  onSelected: (nextValue: BackgroundSelectorConfig) => void;
  value: BackgroundSelectorConfig | undefined;
}) {
  const style: Pick<CSSProperties, 'backgroundColor' | 'backgroundImage'> =
    useMemo(() => {
      if (value?.backgroundImage?.includes('url(')) {
        const props = cssPropsFromBgConfig(value);
        return {
          backgroundImage: props?.backgroundImage,
          backgroundColor: props?.backgroundColor,
        };
      } else {
        return {};
      }
    }, [value]);

  return (
    <TypeButton
      isActive={isActive}
      icon={<ImageIcon />}
      title={<Trans message="Image" />}
      onClick={() =>
        onSelected({
          backgroundColor: value?.backgroundColor,
        })
      }
      style={style}
    />
  );
}
export function ImageBackgroundTab({
  value,
  onChange,
  className,
  uploadType,
}: BgSelectorTabProps<BackgroundSelectorConfig> & {
  uploadType: keyof typeof UploadType;
}) {
  const settings = useSettings();
  const noiseSwitchId = useId();

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className="flex items-center gap-2">
        <ImageSelectorDialog
          uploadType={uploadType}
          onSelected={url => {
            onChange?.({
              backgroundImage: `url(${url})`,
              tint: value?.tint ?? 50,
              noise: value?.noise,
              imageEffect: value?.imageEffect,
            });
          }}
        >
          <Dialog.Trigger render={<Button variant="outline" />}>
            <UploadIcon />
            <Trans message="Upload image" />
          </Dialog.Trigger>
        </ImageSelectorDialog>

        {settings?.unsplash_is_setup && (
          <UnsplashPopover
            onSelected={src => {
              onChange?.({
                ...value,
                ...defaultPosition,
                backgroundImage: `url(${src})`,
              });
            }}
          >
            <Popover.Trigger render={<Button variant="outline" />}>
              <SiUnsplash />
              <Trans message="Unsplash" />
            </Popover.Trigger>
          </UnsplashPopover>
        )}

        <WallpapersPopover
          onSelected={src => {
            onChange?.({
              ...value,
              ...defaultPosition,
              backgroundImage: `url(${src})`,
            });
          }}
        >
          <Popover.Trigger render={<Button variant="outline" />}>
            <ImageIcon />
            <Trans message="Wallpapers" />
          </Popover.Trigger>
        </WallpapersPopover>
      </div>

      <Slider
        min={0}
        max={100}
        step={10}
        value={value?.tint ?? 50}
        disabled={!value}
        onValueChange={next => {
          if (value) {
            onChange?.({
              ...value,
              tint: Math.round(next as number),
            });
          }
        }}
      >
        <div className="col-span-2 mb-2">
          <Slider.Label>
            <Trans message="Tint" />
          </Slider.Label>
          <p className="text-xs text-muted-foreground">
            <Trans message="Improves content visibility and helps make it more accessible." />
          </p>
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <MoonIcon className="size-5 shrink-0" />
          <Slider.Control className="flex-1">
            <Slider.Track>
              <Slider.Indicator />
            </Slider.Track>
            <Slider.Thumb />
          </Slider.Control>
          <SunIcon className="size-5 shrink-0" />
        </div>
      </Slider>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor={noiseSwitchId}>
            <Trans message="Noise" />
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            <Trans message="Add a subtle grain texture." />
          </p>
        </div>
        <Switch
          id={noiseSwitchId}
          checked={value?.noise ?? false}
          disabled={!value}
          onCheckedChange={checked => {
            if (value) {
              onChange?.({
                ...value,
                noise: checked,
              });
            }
          }}
        />
      </div>

      <ImageEffectSelector value={value} onChange={onChange} />

      <ImagePositionSelector value={value} onChange={onChange} />
    </div>
  );
}

function ImageEffectSelector({
  value,
  onChange,
}: {
  value?: BackgroundSelectorConfig;
  onChange: (value: BackgroundSelectorConfig | null) => void;
}) {
  const currentEffect = value?.imageEffect;

  const setEffect = (imageEffect?: ImageBackgroundEffect) => {
    if (value) {
      onChange({
        ...value,
        imageEffect,
      });
    }
  };

  return (
    <section>
      <Label>
        <Trans message="Effect" />
      </Label>
      <div className="mt-3 grid grid-cols-4 gap-3">
        <EffectButton
          active={!currentEffect}
          label={<Trans message="None" />}
          onClick={() => setEffect(undefined)}
        >
          <BanIcon className="size-4" />
        </EffectButton>
        <EffectButton
          active={currentEffect === 'mono'}
          label={<Trans message="Mono" />}
          onClick={() => setEffect('mono')}
        >
          <ContrastIcon className="size-4" />
        </EffectButton>
        <EffectButton
          active={currentEffect === 'blur'}
          label={<Trans message="Blur" />}
          onClick={() => setEffect('blur')}
        >
          <DropletIcon className="size-4" />
        </EffectButton>
        <EffectButton
          active={currentEffect === 'halftone'}
          label={<Trans message="Halftone" />}
          onClick={() => setEffect('halftone')}
        >
          <GripIcon className="size-4" />
        </EffectButton>
      </div>
    </section>
  );
}

interface EffectButtonProps {
  active?: boolean;
  children?: ReactNode;
  label: ReactNode;
  onClick: () => void;
}
export function EffectButton({
  active,
  children,
  label,
  onClick,
}: EffectButtonProps) {
  const id = useId();
  return (
    <div
      className="group flex flex-col items-center gap-2"
      data-active={active}
    >
      <button
        id={id}
        aria-labelledby={id}
        type="button"
        className="flex w-full items-center justify-center overflow-hidden rounded-card-sm bg-accent p-4 text-sm outline-offset-3 outline-primary group-data-active:outline-2 focus-visible:outline-2"
        onClick={() => onClick()}
      >
        {children}
      </button>
      <div className="text-xs" id={id}>
        {label}
      </div>
    </div>
  );
}

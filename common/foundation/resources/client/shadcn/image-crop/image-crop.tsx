'use client';

import {encodeCanvasToImageFile} from '@common/uploads/utils/encode-cropped-image';
import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Slider} from '@shadcn/forms/slider/slider';
import {Spinner} from '@shadcn/spinner/spinner';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {RotateCcwIcon, ZoomInIcon, ZoomOutIcon} from 'lucide-react';
import * as React from 'react';
import Cropper, {type Area} from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import './image-crop-frame.css';

type ImageCropContextValue = {
  aspect: number;
  file: File | null;
  imageUrl: string | null;
  radius: string | undefined;
  crop: {x: number; y: number};
  zoom: number;
  minZoom: number;
  croppedAreaPixels: Area | null;
  setCrop: React.Dispatch<React.SetStateAction<{x: number; y: number}>>;
  setZoom: (zoom: number) => void;
  setMinZoom: (zoom: number) => void;
  setCroppedAreaPixels: (area: Area | null) => void;
  handleApply: () => Promise<void>;
  handleReset: () => void;
  isApplying: boolean;
};

/** Tight inset — 12px stole ~72px width on 3:1 covers (fillRatio ~0.82). */
export const CROP_STAGE_INSET = 4;

export function aspectFitCropSize(
  containerWidth: number,
  containerHeight: number,
  aspect: number,
  inset: number = CROP_STAGE_INSET,
): {width: number; height: number} {
  const availW = Math.max(0, containerWidth - inset * 2);
  const availH = Math.max(0, containerHeight - inset * 2);
  let width = availW;
  let height = width / aspect;
  if (height > availH) {
    height = availH;
    width = height * aspect;
  }
  return {width, height};
}

/**
 * Aspect-aware dialog width so square crops avoid dead side margins and wide
 * covers have horizontal room without bloated modal chrome.
 */
export function cropDialogWidthClass(aspect: number = 1): string {
  if (aspect <= 1.15) {
    return 'max-w-[min(calc(100vw-1.5rem),28rem)] sm:max-w-md';
  }
  if (aspect >= 2.5) {
    return 'max-w-[min(calc(100vw-1.5rem),42rem)] sm:max-w-2xl';
  }
  return 'max-w-[min(calc(100vw-1.5rem),36rem)] sm:max-w-xl';
}

/**
 * Stage box sized to both crop aspect and maxHeight (`min(100%, maxHeight * aspect)`)
 * so the active crop area fills the stage without dead left/right white bars.
 */
export function cropStageBoxStyle(
  aspect: number,
  radius?: string,
): React.CSSProperties {
  const wide = aspect >= 2.5;
  const landscape = aspect >= 1.45;
  const maxHeight = wide
    ? 'min(38dvh, 240px)'
    : landscape
      ? 'min(52dvh, 340px)'
      : 'min(54dvh, 384px)';

  return {
    aspectRatio: `${aspect}`,
    width: `min(100%, calc(${maxHeight} * ${aspect}))`,
    maxHeight,
    maxWidth: '100%',
    ...(radius ? ({'--crop-radius': radius} as React.CSSProperties) : {}),
  };
}

export function coverZoomForCrop(
  naturalWidth: number,
  naturalHeight: number,
  stageWidth: number,
  stageHeight: number,
  cropWidth: number,
): number {
  if (
    !naturalWidth ||
    !naturalHeight ||
    !stageWidth ||
    !stageHeight ||
    !cropWidth
  ) {
    return 1;
  }
  const scale = Math.min(
    stageWidth / naturalWidth,
    stageHeight / naturalHeight,
  );
  const fittedWidth = naturalWidth * scale;
  if (fittedWidth <= 0) return 1;
  return Math.min(3, Math.max(1, cropWidth / fittedWidth));
}

const ImageCropContext = React.createContext<ImageCropContextValue | null>(
  null,
);

function useImageCropContext() {
  const ctx = React.useContext(ImageCropContext);
  if (!ctx)
    throw new Error('ImageCrop components must be used within ImageCrop');
  return ctx;
}

export interface ImageCropProps {
  aspect?: number;
  file: File | null;
  onCrop: (preview: string, file?: File) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode;
  className?: string;
  /**
   * Raw CSS length (e.g. `16px`) applied to the crop frame, so the dialog
   * previews the corner radius the cropped image renders with. Omitted, the
   * frame stays a sharp rectangle.
   */
  radius?: string;
}

export function ImageCrop({
  aspect = 1,
  file,
  onCrop,
  onError,
  children,
  className,
  radius,
}: ImageCropProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({x: 0, y: 0});
  const [zoom, setZoom] = React.useState(1);
  const [minZoom, setMinZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null,
  );
  const [isApplying, setIsApplying] = React.useState(false);

  React.useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({x: 0, y: 0});
    setZoom(1);
    setMinZoom(1);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setZoomClamped = React.useCallback(
    (value: number) => {
      setZoom(Math.min(3, Math.max(minZoom, Math.round(value * 100) / 100)));
    },
    [minZoom],
  );

  const handleApply = React.useCallback(async () => {
    if (!file || !imageUrl || !croppedAreaPixels) {
      onError?.('No image or crop area');
      return;
    }
    setIsApplying(true);
    try {
      const {previewUrl, croppedFile} = await getCroppedImage({
        imageUrl,
        crop: croppedAreaPixels,
        file,
      });
      onCrop(previewUrl, croppedFile);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not crop image');
    } finally {
      setIsApplying(false);
    }
  }, [file, imageUrl, croppedAreaPixels, onCrop, onError]);

  const handleReset = React.useCallback(() => {
    setCrop({x: 0, y: 0});
    setZoom(minZoom);
    setCroppedAreaPixels(null);
  }, [minZoom]);

  const value = React.useMemo<ImageCropContextValue>(
    () => ({
      aspect,
      file,
      imageUrl,
      radius,
      crop,
      zoom,
      minZoom,
      croppedAreaPixels,
      setCrop,
      setZoom: setZoomClamped,
      setMinZoom,
      setCroppedAreaPixels,
      handleApply,
      handleReset,
      isApplying,
    }),
    [
      aspect,
      file,
      imageUrl,
      radius,
      crop,
      zoom,
      minZoom,
      croppedAreaPixels,
      setZoomClamped,
      handleApply,
      handleReset,
      isApplying,
    ],
  );

  return (
    <ImageCropContext.Provider value={value}>
      <div className={cn('flex min-h-0 w-full flex-col gap-2', className)}>
        {children}
      </div>
    </ImageCropContext.Provider>
  );
}

export interface ImageCropContentProps extends React.ComponentProps<'div'> {
  className?: string;
}

export function ImageCropContent({className, ...props}: ImageCropContentProps) {
  const {trans} = useTrans();
  const {
    imageUrl,
    radius,
    crop,
    aspect,
    zoom,
    minZoom,
    setCrop,
    setZoom,
    setMinZoom,
    setCroppedAreaPixels,
    handleReset,
  } = useImageCropContext();

  const stageRef = React.useRef<HTMLDivElement>(null);
  const cropInstructionsId = React.useId();
  const [stageSize, setStageSize] = React.useState({width: 0, height: 0});
  // Mirror for onMediaLoaded: the observer effect below may run before or
  // after the media load, so the load handler must read live dims, never a
  // stale closure.
  const stageSizeRef = React.useRef(stageSize);
  stageSizeRef.current = stageSize;

  React.useEffect(() => {
    // The stage div only exists once imageUrl is set; re-attach then so the
    // observer is never left watching a null ref from the first mount.
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      if (rect.width > 0 && rect.height > 0) {
        const next = {width: rect.width, height: rect.height};
        stageSizeRef.current = next;
        setStageSize(next);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [imageUrl]);

  // Fixed ratio from the caller (cover 16:9, avatar 1:1); a non-finite
  // aspect falls back to square explicitly so the window can never
  // silently unlock into free-form.
  const lockedAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  const cropSize = React.useMemo(
    () =>
      stageSize.width > 0 && stageSize.height > 0
        ? aspectFitCropSize(stageSize.width, stageSize.height, lockedAspect)
        : undefined,
    [stageSize, lockedAspect],
  );
  // Stable remount key: once the stage is measured, the crop engine mounts
  // fresh with the final window from the start, so no late-prop-update path
  // inside the engine can leave a stale small window behind.
  const cropperKey = cropSize
    ? `crop-${Math.round(cropSize.width)}x${Math.round(cropSize.height)}`
    : 'crop-measuring';

  const onMediaLoaded = React.useCallback(
    (media: {naturalWidth: number; naturalHeight: number}) => {
      const live = stageSizeRef.current;
      if (!live.width || !live.height) return;
      const size = aspectFitCropSize(live.width, live.height, lockedAspect);
      const cover = coverZoomForCrop(
        media.naturalWidth,
        media.naturalHeight,
        live.width,
        live.height,
        size.width,
      );
      setMinZoom(cover);
      setZoom(cover);
    },
    [lockedAspect, setMinZoom, setZoom],
  );

  const onCropComplete = React.useCallback(
    (_area: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    },
    [setCroppedAreaPixels],
  );

  if (!imageUrl) {
    return (
      <div
        className={cn(
          'flex h-72 items-center justify-center rounded-card border border-dashed bg-muted/20 text-sm text-muted-foreground',
          className,
        )}
        {...props}
      >
        <Trans message="No image selected" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex w-full justify-center">
        <div
          ref={stageRef}
          data-crop-radius={radius ? '' : undefined}
          style={cropStageBoxStyle(lockedAspect, radius)}
          className="image-crop-stage relative overflow-hidden rounded-card-sm bg-muted ring-1 ring-foreground/15 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
          role="group"
          tabIndex={0}
          aria-label={trans(message('Image crop area'))}
          aria-describedby={cropInstructionsId}
          onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            if (event.key === '+' || event.key === '=') {
              event.preventDefault();
              setZoom(zoom + 0.15);
              return;
            }
            if (event.key === '-' || event.key === '_') {
              event.preventDefault();
              setZoom(zoom - 0.15);
              return;
            }
            if (event.key === '0') {
              event.preventDefault();
              handleReset();
              return;
            }
            const step = event.shiftKey ? 20 : 6;
            const delta = {
              ArrowLeft: {x: -step, y: 0},
              ArrowRight: {x: step, y: 0},
              ArrowUp: {x: 0, y: -step},
              ArrowDown: {x: 0, y: step},
            }[event.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'];
            if (!delta) return;
            event.preventDefault();
            setCrop(previous => ({x: previous.x + delta.x, y: previous.y + delta.y}));
          }}
        >
          <span id={cropInstructionsId} className="sr-only">
            <Trans message="Drag to move the image, or use arrow keys. Hold Shift for larger steps, or press plus and minus to zoom." />
          </span>
          <Cropper
            key={cropperKey}
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            aspect={lockedAspect}
            cropSize={cropSize}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
          />
        </div>
      </div>
      <ImageCropZoomControls
        zoom={zoom}
        minZoom={minZoom}
        onZoomChange={setZoom}
      />
    </div>
  );
}

export interface ImageCropZoomControlsProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  buttonStep?: number;
  disabled?: boolean;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

/**
 * Unified zoom toolbar shared across ImageCrop and ImageSelectorDialog:
 * prominent Zoom Out / Zoom In icon buttons, accessible Slider, and
 * tabular percentage readout.
 */
export function ImageCropZoomControls({
  zoom,
  minZoom = 1,
  maxZoom = 3,
  step = 0.05,
  buttonStep = 0.15,
  disabled,
  onZoomChange,
  className,
}: ImageCropZoomControlsProps) {
  const {trans} = useTrans();
  const safeZoom = Number.isFinite(zoom) ? zoom : minZoom;
  const clamp = (next: number) =>
    Math.min(maxZoom, Math.max(minZoom, Math.round(next * 100) / 100));

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={trans(message('Zoom out'))}
        disabled={disabled || safeZoom <= minZoom + 0.001}
        onClick={() => onZoomChange(clamp(safeZoom - buttonStep))}
      >
        <ZoomOutIcon />
      </Button>

      {/* Isolate from HookForm.Field: CroppedAvatar/Cover nest inside
          avatar_url / cover_url fields, and Slider would otherwise bind
          the URL string → NaN → visibility:hidden thumb. */}
      <HookForm.FieldContext.Provider value={undefined}>
        <Slider
          min={minZoom}
          max={maxZoom}
          step={step}
          value={safeZoom}
          disabled={disabled}
          onValueChange={next => {
            const raw = Array.isArray(next) ? next[0] : next;
            onZoomChange(
              typeof raw === 'number' && Number.isFinite(raw) ? raw : minZoom,
            );
          }}
          className="flex min-w-0 flex-1 items-center"
        >
          <Slider.Label className="sr-only">
            <Trans message="Zoom" />
          </Slider.Label>
          <Slider.Control className="min-w-0 flex-1 py-1">
            <Slider.Track className="bg-foreground/12 data-horizontal:h-1.5">
              <Slider.Indicator />
            </Slider.Track>
            <Slider.Thumb
              aria-label={trans(message('Zoom'))}
              className="size-3.5 border-2 border-card bg-primary shadow-xs ring-1 ring-primary/25"
            />
          </Slider.Control>
        </Slider>
      </HookForm.FieldContext.Provider>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={trans(message('Zoom in'))}
        disabled={disabled || safeZoom >= maxZoom - 0.001}
        onClick={() => onZoomChange(clamp(safeZoom + buttonStep))}
      >
        <ZoomInIcon />
      </Button>

      <span
        aria-hidden="true"
        className="w-9 shrink-0 select-none text-end text-xs text-muted-foreground tabular-nums"
      >
        {Math.round(safeZoom * 100)}%
      </span>
    </div>
  );
}

export interface ImageCropApplyProps {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ImageCropApply({
  asChild,
  children,
  className,
}: ImageCropApplyProps) {
  const {handleApply, isApplying, croppedAreaPixels, file} =
    useImageCropContext();
  const disabled = !file || !croppedAreaPixels || isApplying;

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{
        onClick?: () => void;
        disabled?: boolean;
        className?: string;
      }>,
      {
        onClick: () => void handleApply(),
        disabled,
        className: cn(
          (children.props as {className?: string}).className,
          className,
        ),
      },
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className={className}
      onClick={() => void handleApply()}
      disabled={disabled}
    >
      {isApplying && <Spinner data-icon="inline-start" />}
      {children ?? <Trans message="Apply crop" />}
    </Button>
  );
}

export interface ImageCropResetProps {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ImageCropReset({
  asChild,
  children,
  className,
}: ImageCropResetProps) {
  const {handleReset} = useImageCropContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{
        onClick?: () => void;
        className?: string;
      }>,
      {
        onClick: () => handleReset(),
        className: cn(
          (children.props as {className?: string}).className,
          className,
        ),
      },
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={handleReset}
    >
      {children ?? (
        <>
          <RotateCcwIcon data-icon="inline-start" />
          <Trans message="Reset" />
        </>
      )}
    </Button>
  );
}

// helpers
async function getCroppedImage({
  imageUrl,
  crop,
  file,
}: {
  imageUrl: string;
  crop: Area;
  file: File;
}): Promise<{previewUrl: string; croppedFile: File}> {
  const image = await createImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  const croppedFile = await encodeCanvasToImageFile(canvas, file.name);
  const previewUrl = URL.createObjectURL(croppedFile);

  return {previewUrl, croppedFile};
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}



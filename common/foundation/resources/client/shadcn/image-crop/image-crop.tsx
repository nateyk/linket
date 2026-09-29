'use client';

import {cn} from '@ui/utils/cn';
import {Slider} from '@shadcn/forms/slider/slider';
import {Trans} from '@ui/i18n/trans';
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
  setCrop: (crop: {x: number; y: number}) => void;
  setZoom: (zoom: number) => void;
  setMinZoom: (zoom: number) => void;
  setCroppedAreaPixels: (area: Area | null) => void;
  handleApply: () => Promise<void>;
  handleReset: () => void;
  isApplying: boolean;
};

export function aspectFitCropSize(
  containerWidth: number,
  containerHeight: number,
  aspect: number,
): {width: number; height: number} {
  let width = containerWidth;
  let height = width / aspect;
  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspect;
  }
  return {width, height};
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
      setZoom(Math.min(3, Math.max(minZoom, Math.round(value * 10) / 10)));
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
      <div className={cn('flex min-h-0 w-full flex-col gap-3', className)}>
        {children}
      </div>
    </ImageCropContext.Provider>
  );
}

export interface ImageCropContentProps extends React.ComponentProps<'div'> {
  className?: string;
}

export function ImageCropContent({className, ...props}: ImageCropContentProps) {
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
  } = useImageCropContext();

  const stageRef = React.useRef<HTMLDivElement>(null);
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
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      <div
        ref={stageRef}
        data-crop-radius={radius ? '' : undefined}
        style={
          radius
            ? ({'--crop-radius': radius} as React.CSSProperties)
            : undefined
        }
        className="relative h-[min(30dvh,360px)] w-full overflow-hidden rounded-card bg-muted sm:h-[min(44dvh,440px)]"
      >
        <Cropper
          key={cropperKey}
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          minZoom={minZoom}
          aspect={lockedAspect}
          cropSize={cropSize}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onMediaLoaded={onMediaLoaded}
        />
      </div>
      <Slider
        min={minZoom}
        max={3}
        step={0.1}
        value={zoom}
        onValueChange={v => setZoom((v as number) ?? minZoom)}
      >
        <Slider.Label>
          <Trans message="Zoom" />
        </Slider.Label>
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
          </Slider.Track>
          <Slider.Thumb className="bg-primary ring-primary/30" />
        </Slider.Control>
      </Slider>
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
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-button bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
        className,
      )}
      onClick={() => void handleApply()}
      disabled={disabled}
    >
      {children ?? <Trans message="Apply crop" />}
    </button>
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
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-button border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50',
        className,
      )}
      onClick={handleReset}
    >
      {children ?? <Trans message="Reset" />}
    </button>
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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Could not create blob'))),
      getOutputMimeType(file),
    );
  });

  const previewUrl = URL.createObjectURL(blob);
  const croppedFile = new File([blob], file.name, {
    type: blob.type,
    lastModified: Date.now(),
  });

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

function getOutputMimeType(file: File): string {
  if (file.type === 'image/jpeg' || file.type === 'image/webp')
    return file.type;
  return 'image/png';
}


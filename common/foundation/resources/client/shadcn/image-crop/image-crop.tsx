'use client';

import {cn} from '@ui/utils/cn';
import {Slider} from '@shadcn/forms/slider/slider';
import {Trans} from '@ui/i18n/trans';
import * as React from 'react';
import Cropper, {type Area} from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

type ImageCropContextValue = {
  aspect: number;
  file: File | null;
  imageUrl: string | null;
  crop: {x: number; y: number};
  zoom: number;
  croppedAreaPixels: Area | null;
  setCrop: (crop: {x: number; y: number}) => void;
  setZoom: (zoom: number) => void;
  setCroppedAreaPixels: (area: Area | null) => void;
  handleApply: () => Promise<void>;
  handleReset: () => void;
  isApplying: boolean;
};

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
}

export function ImageCrop({
  aspect = 1,
  file,
  onCrop,
  onError,
  children,
  className,
}: ImageCropProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({x: 0, y: 0});
  const [zoom, setZoom] = React.useState(1);
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
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setZoomClamped = React.useCallback((value: number) => {
    setZoom(Math.min(3, Math.max(1, Math.round(value * 10) / 10)));
  }, []);

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
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const value = React.useMemo<ImageCropContextValue>(
    () => ({
      aspect,
      file,
      imageUrl,
      crop,
      zoom,
      croppedAreaPixels,
      setCrop,
      setZoom: setZoomClamped,
      setCroppedAreaPixels,
      handleApply,
      handleReset,
      isApplying,
    }),
    [
      aspect,
      file,
      imageUrl,
      crop,
      zoom,
      croppedAreaPixels,
      setZoomClamped,
      handleApply,
      handleReset,
      isApplying,
    ],
  );

  return (
    <ImageCropContext.Provider value={value}>
      <div className={cn('flex w-full flex-col gap-3', className)}>
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
    crop,
    aspect,
    zoom,
    setCrop,
    setZoom,
    setCroppedAreaPixels,
  } = useImageCropContext();

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

  // Guard the ratio: a non-finite aspect would unlock free-form selection,
  // so fall back to square explicitly.
  const lockedAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      <div className="relative h-[min(50dvh,420px)] w-full overflow-hidden rounded-card bg-muted">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={lockedAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <Slider
        min={1}
        max={3}
        step={0.1}
        value={zoom}
        onValueChange={v => setZoom((v as number) ?? 1)}
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


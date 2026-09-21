'use client';

import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';
import * as React from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PercentCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type ImageCropContextValue = {
  aspect: number;
  file: File | null;
  imageUrl: string | null;
  crop: Crop | undefined;
  completedCrop: PercentCrop | null;
  setCrop: (crop: Crop) => void;
  setCompletedCrop: (crop: PercentCrop | null) => void;
  setMediaSize: (size: {width: number; height: number} | null) => void;
  handleApply: () => Promise<void>;
  handleReset: () => void;
  isApplying: boolean;
};

export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({unit: '%', width: 90}, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
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
  const [crop, setCrop] = React.useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] =
    React.useState<PercentCrop | null>(null);
  const [mediaSize, setMediaSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  React.useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop(undefined);
    setCompletedCrop(null);
    setMediaSize(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleApply = React.useCallback(async () => {
    if (!file || !imageUrl || !completedCrop) {
      onError?.('No image or crop area');
      return;
    }
    setIsApplying(true);
    try {
      const {previewUrl, croppedFile} = await getCroppedImage({
        imageUrl,
        percent: completedCrop,
        file,
      });
      onCrop(previewUrl, croppedFile);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not crop image');
    } finally {
      setIsApplying(false);
    }
  }, [file, imageUrl, completedCrop, onCrop, onError]);

  const handleReset = React.useCallback(() => {
    if (mediaSize) {
      setCrop(centerAspectCrop(mediaSize.width, mediaSize.height, aspect));
    } else {
      setCrop(undefined);
    }
    setCompletedCrop(null);
  }, [mediaSize, aspect]);

  const value = React.useMemo<ImageCropContextValue>(
    () => ({
      aspect,
      file,
      imageUrl,
      crop,
      completedCrop,
      setCrop,
      setCompletedCrop,
      setMediaSize,
      handleApply,
      handleReset,
      isApplying,
    }),
    [
      aspect,
      file,
      imageUrl,
      crop,
      completedCrop,
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
  const {imageUrl, crop, aspect, setCrop, setCompletedCrop, setMediaSize} =
    useImageCropContext();

  const onImageLoad = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const {width, height} = e.currentTarget;
      setMediaSize({width, height});
      setCrop(centerAspectCrop(width, height, aspect));
    },
    [aspect, setCrop, setMediaSize],
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
      <div className="flex max-h-[min(50dvh,420px)] w-full items-center justify-center overflow-hidden rounded-card bg-muted">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(_pixelCrop, percentCrop) =>
            setCompletedCrop(percentCrop)
          }
          aspect={aspect}
          ruleOfThirds
        >
          <img
            src={imageUrl}
            alt=""
            onLoad={onImageLoad}
            className="max-h-[inherit] w-auto max-w-full"
          />
        </ReactCrop>
      </div>
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
  const {handleApply, isApplying, completedCrop, file} =
    useImageCropContext();
  const disabled = !file || !completedCrop || isApplying;

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
  percent,
  file,
}: {
  imageUrl: string;
  percent: PercentCrop;
  file: File;
}): Promise<{previewUrl: string; croppedFile: File}> {
  const image = await createImage(imageUrl);
  // PercentCrop is resolution-independent: resolve against the natural size
  // so large uploads crop at full quality.
  const scaleX = image.naturalWidth / 100;
  const scaleY = image.naturalHeight / 100;
  const crop = {
    x: percent.x * scaleX,
    y: percent.y * scaleY,
    width: percent.width * scaleX,
    height: percent.height * scaleY,
  };
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


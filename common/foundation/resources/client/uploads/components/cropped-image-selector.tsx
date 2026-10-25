'use client';

import {FileEntry} from '@app/gen/schemas/file-entry';
import {UploadType} from '@app/site-config';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {
  uploadMaxFileSize,
  validateEncodedImage,
} from '@common/uploads/utils/encode-cropped-image';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {
  ImageCrop,
  ImageCropApply,
  ImageCropContent,
  ImageCropReset,
} from '@shadcn/image-crop/image-crop';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {MoreVerticalIcon, UploadIcon} from 'lucide-react';
import {useCallback, useRef, useState, type CSSProperties} from 'react';

interface CroppedImageSelectorProps {
  value: string | null | undefined;
  onChange: (url: string, entry?: FileEntry) => void;
  uploadType: keyof typeof UploadType;
  aspect?: number;
  className?: string;
  previewClassName?: string;
  placeholderVariant?: 'dropzone' | 'icon' | 'text';
  fit?: 'cover' | 'contain';
  shape?: 'circle' | 'square' | 'cover';
  placeholderIcon?: React.ReactNode;
  /** Show the helper text under the control. */
  showHint?: boolean;
  /**
   * Raw CSS length for the crop frame corners, so the dialog previews the
   * radius the image will actually render with instead of a sharp rectangle.
   */
  cropRadius?: string;
  /**
   * Accessible name for the sr-only file input and the image's replace/remove
   * menu trigger (A-03/A-04). Pass the same text as the visible field label
   * (e.g. "Cover image") so the control, its label and its menu read as one
   * thing. Translated by the caller — this component never builds strings.
   * When set, the crop dialog title reuses this name.
   */
  label?: string;
}

function useCroppedUpload({
  onChange,
  uploadType,
}: Pick<CroppedImageSelectorProps, 'onChange' | 'uploadType'>) {
  const {uploadFile, uploadStatus, percentage} = useActiveUpload();
  const isUploading = uploadStatus === 'inProgress';

  const uploadCroppedFile = useCallback(
    (file: File) => {
      const restrictions = restrictionsFromConfig({uploadType});
      const error = validateEncodedImage(new UploadedFile(file), restrictions);
      if (error) {
        toast.danger(error);
        return;
      }

      uploadFile(file, {
        uploadType,
        showToastOnRestrictionFail: true,
        showToastOnBackendError: true,
        restrictions,
        onSuccess: entry => onChange(entry.url, entry),
        onError: m => m && toast.danger(m),
      });
    },
    [onChange, uploadFile, uploadType],
  );

  return {uploadCroppedFile, isUploading, percentage};
}

export function CroppedImageSelector({
  value,
  onChange,
  uploadType,
  aspect = 1,
  className,
  previewClassName,
  placeholderVariant = 'dropzone',
  fit = 'cover',
  shape = 'square',
  placeholderIcon,
  cropRadius,
  label,
}: CroppedImageSelectorProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const {uploadCroppedFile, isUploading, percentage} = useCroppedUpload({
    onChange,
    uploadType,
  });

  const handleFileSelect = useCallback((file: File) => {
    setPendingFile(file);
    setCropOpen(true);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect],
  );

  const handleCrop = useCallback(
    (_preview: string, croppedFile?: File) => {
      if (croppedFile) {
        uploadCroppedFile(croppedFile);
        setCropOpen(false);
        setPendingFile(null);
      }
    },
    [uploadCroppedFile],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const previewCls =
    shape === 'circle'
      ? 'rounded-full object-cover'
      : shape === 'cover'
        ? 'object-cover'
        : fit === 'cover'
          ? 'object-cover'
          : 'object-contain';

  const shellRadius =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'cover'
        ? 'rounded-input'
        : 'rounded-card';

  // Cover (and non-circle square) previews share the crop aspect so the
  // empty dropzone and filled tile match the dialog window.
  const aspectBoxStyle: CSSProperties | undefined =
    shape === 'cover' || shape === 'square'
      ? {aspectRatio: String(aspect)}
      : undefined;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={FileInputType.image}
        className="sr-only"
        aria-label={label}
        onChange={handleInputChange}
        disabled={isUploading}
      />

      {value ? (
        <div
          className={cn(
            'group relative overflow-hidden',
            shellRadius,
            className,
          )}
          style={aspectBoxStyle}
        >
          <img
            src={value}
            alt=""
            className={cn('size-full', previewCls, previewClassName)}
          />
          <div
            className={cn(
              'absolute opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100',
              shape === 'circle' ? 'right-1 bottom-1' : 'top-2 right-2',
            )}
          >
            <Dropdown.Root>
              <Dropdown.Trigger
                render={
                  <Button
                    size="icon-xs"
                    variant="outline"
                    aria-label={label}
                    className="size-7 rounded-full bg-card shadow-sm hover:bg-card"
                  />
                }
              >
                <MoreVerticalIcon className="size-3.5" />
              </Dropdown.Trigger>
              <Dropdown.Content align="end">
                <Dropdown.Item onClick={openPicker}>
                  <Trans message="Replace" />
                </Dropdown.Item>
                <Dropdown.Item
                  variant="destructive"
                  onClick={() => onChange('')}
                >
                  <Trans message="Remove" />
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
          </div>
          {isUploading && (
            <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{width: `${Math.min(100, Math.round(percentage))}%`}}
              />
            </div>
          )}
        </div>
      ) : placeholderIcon ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={isUploading}
          style={aspectBoxStyle}
          className={cn(
            'relative flex items-center justify-center overflow-hidden border border-dashed border-input transition-colors hover:bg-muted/40 disabled:opacity-50',
            shape === 'circle'
              ? 'aspect-square size-32 rounded-full'
              : 'w-full rounded-input p-3',
            className,
          )}
        >
          <div className="size-full">{placeholderIcon}</div>
        </button>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={isUploading}
          onDragOver={e => e.preventDefault()}
          onDragEnter={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          style={aspectBoxStyle}
          className={cn(
            'relative flex flex-col items-center justify-center gap-1 border border-dashed border-input bg-muted/20 px-3 py-3 text-center transition-colors hover:bg-muted/40 disabled:opacity-50',
            shape === 'circle'
              ? 'aspect-square size-32 rounded-full'
              : 'w-full rounded-input',
            isDragging && 'border-primary bg-primary/5',
            className,
          )}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-muted">
            <UploadIcon className="size-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">
            <Trans message="Select file to upload or drag-and-drop file" />
          </span>
          {placeholderVariant === 'dropzone' && (
            <span className="text-xs text-muted-foreground">
              <Trans message="Preferred region will be cropped" />
            </span>
          )}
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        <Trans
          message="JPG, PNG, or WebP up to :size. Large images are compressed to WebP automatically."
          values={{size: prettyBytes(uploadMaxFileSize(uploadType))}}
        />
      </p>

      <Dialog.Root
        open={cropOpen}
        onOpenChange={open => {
          setCropOpen(open);
          if (!open) {
            setPendingFile(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content
            className={cn(
              'gap-3',
              // Dialog.Content ships sm:max-w-md — unprefixed max-w-* does NOT
              // replace it (tw-merge keeps both variants). Override sm: too.
              (aspect ?? 1) <= 1.15
                ? 'max-w-[min(calc(100vw-2rem),24rem)] sm:max-w-sm'
                : (aspect ?? 1) >= 2.5
                  ? 'max-w-[min(calc(100vw-2rem),42rem)] sm:max-w-2xl'
                  : 'max-w-[min(calc(100vw-2rem),36rem)] sm:max-w-xl',
            )}
          >
            {pendingFile ? (
              <ImageCrop
                aspect={aspect}
                file={pendingFile}
                onCrop={handleCrop}
                radius={cropRadius}
              >
                <Dialog.Header className="gap-1">
                  <Dialog.Title>
                    {label ? label : <Trans message="Crop image" />}
                  </Dialog.Title>
                  <Dialog.Description>
                    <Trans message="Adjust the preferred region, then apply. Large images are compressed to WebP automatically." />
                  </Dialog.Description>
                </Dialog.Header>
                {/* flex-none: Dialog.Body defaults to flex-1 and leaves a tall
                    empty band between Zoom and the footer. */}
                <Dialog.Body className="flex-none grow-0 py-1">
                  <ImageCropContent />
                </Dialog.Body>
                <Dialog.Footer variant="muted" className="gap-2 pt-3">
                  <ImageCropReset asChild>
                    <Button type="button" variant="ghost" size="sm">
                      <Trans message="Reset" />
                    </Button>
                  </ImageCropReset>
                  <Dialog.CloseButton variant="outline" size="sm">
                    <Trans message="Cancel" />
                  </Dialog.CloseButton>
                  <ImageCropApply asChild>
                    <Button type="button" size="sm">
                      <Trans message="Apply crop" />
                    </Button>
                  </ImageCropApply>
                </Dialog.Footer>
              </ImageCrop>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="No image selected." />
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function CroppedAvatar(
  props: Omit<CroppedImageSelectorProps, 'aspect' | 'shape'> & {
    aspect?: number;
  },
) {
  // When the caller passes storefront radius (previewClassName / cropRadius),
  // do not force a circle — public avatars follow container radius, not full.
  const storefrontShape = Boolean(props.previewClassName || props.cropRadius);

  return (
    <CroppedImageSelector
      {...props}
      aspect={props.aspect ?? 1}
      shape={storefrontShape ? 'square' : 'circle'}
    />
  );
}

export function CroppedCover(
  props: Omit<CroppedImageSelectorProps, 'aspect' | 'shape'> & {
    aspect?: number;
  },
) {
  return (
    <CroppedImageSelector
      {...props}
      aspect={props.aspect ?? 16 / 9}
      shape="cover"
      className={cn('w-full', props.className)}
    />
  );
}

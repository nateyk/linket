'use client';

import {FileEntry} from '@app/gen/schemas/file-entry';
import {UploadType} from '@app/site-config';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {
  ImageCrop,
  ImageCropApply,
  ImageCropContent,
  ImageCropReset,
} from '@shadcn/image-crop/image-crop';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {MoreVerticalIcon, UploadIcon} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import {Dropdown} from '@shadcn/dropdown/dropdown';

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
      uploadFile(file, {
        uploadType,
        showToastOnRestrictionFail: true,
        showToastOnBackendError: true,
        restrictions: restrictionsFromConfig({uploadType}),
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
            shape === 'circle' ? 'rounded-full' : 'rounded-card',
            className,
          )}
        >
          <img
            src={value}
            alt=""
            className={cn('size-full', previewCls, previewClassName)}
          />
          <div
            className={cn(
              'absolute transition-opacity',
              shape === 'circle'
                ? 'right-1 bottom-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                : 'top-2 right-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
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
            <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/30">
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
          className={cn(
            'relative flex items-center justify-center overflow-hidden border border-dashed transition-colors hover:bg-muted/30 disabled:opacity-50',
            shape === 'circle'
              ? 'aspect-square size-32 rounded-full'
              : 'w-full rounded-card p-6',
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
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center transition-colors hover:bg-muted/30 disabled:opacity-50',
            shape === 'circle'
              ? 'aspect-square size-32 rounded-full'
              : 'w-full',
            isDragging && 'border-primary bg-primary/5',
            className,
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <UploadIcon className="size-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">
            <Trans message="Select file to upload or drag-and-drop" />
          </span>
          <span className="text-xs text-muted-foreground">
            <Trans message="JPG, PNG, GIF, SVG" />
          </span>
          {placeholderVariant === 'dropzone' && (
            <span className="text-xs text-muted-foreground">
              <Trans message="Preferred region will be cropped" />
            </span>
          )}
        </button>
      )}

      <Dialog.Root open={cropOpen} onOpenChange={setCropOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
            {pendingFile ? (
              <ImageCrop
                aspect={aspect}
                file={pendingFile}
                onCrop={handleCrop}
                radius={cropRadius}
              >
                <Dialog.Header>
                  <Dialog.Title>
                    <Trans message="Crop image" />
                  </Dialog.Title>
                  <Dialog.Description>
                    <Trans message="Adjust the preferred region, then apply." />
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                  <ImageCropContent />
                </Dialog.Body>
                <Dialog.Footer className="flex items-center justify-end gap-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ImageCropReset asChild>
                      <Button type="button" variant="ghost" size="sm">
                        <Trans message="Reset" />
                      </Button>
                    </ImageCropReset>
                    <Dialog.CloseButton variant="outline" size="sm">
                      <Trans message="Cancel" />
                    </Dialog.CloseButton>
                  </div>
                  <div className="ml-4">
                    <ImageCropApply asChild>
                      <Button type="button" size="sm">
                        <Trans message="Apply crop" />
                      </Button>
                    </ImageCropApply>
                  </div>
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
  return (
    <CroppedImageSelector
      {...props}
      aspect={props.aspect ?? 1}
      shape="circle"
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
      className={cn('h-32 w-full sm:h-40', props.className)}
    />
  );
}

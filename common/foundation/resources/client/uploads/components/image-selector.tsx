import {FileEntry} from '@app/gen/schemas/file-entry';
import {UploadType} from '@app/site-config';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import {UploadStrategyConfig} from '@common/uploads/uploader/strategy/upload-strategy';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Progress} from '@shadcn/progress/progress';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {AvatarPlaceholderIcon} from '@ui/avatar/avatar-placeholder-icon';
import {FadedDotsBackground} from '@ui/background/faded-dots-background';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {MoreVerticalIcon, UploadIcon} from 'lucide-react';
import type {ChangeEvent, ComponentProps, ReactElement} from 'react';
import {useCallback, useMemo, useRef} from 'react';

interface ImageSelectorProps {
  className?: string;
  disabled?: boolean;
  value: string | null | undefined;
  onChange: (newValue: string, entry?: FileEntry) => void;
  uploadType: keyof typeof UploadType;
  uploadMetadata?: Record<string, string>;
  onFileSelected?: (file: File) => void;
}

function useImageUpload({
  disabled,
  onChange,
  onFileSelected,
  uploadMetadata,
  uploadType,
}: ImageSelectorProps) {
  const {uploadFile, uploadStatus, deleteEntry, isDeletingEntry, percentage} =
    useActiveUpload();

  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadStatus === 'inProgress';

  const uploadOptions: UploadStrategyConfig = useMemo(
    () => ({
      uploadType,
      showToastOnRestrictionFail: true,
      restrictions: restrictionsFromConfig({uploadType}),
      metadata: {
        ...uploadMetadata,
      },
      onSuccess: (entry: FileEntry) => {
        onChange?.(entry.url, entry);
      },
      onError: message => {
        if (message) {
          toast.danger(message);
        }
      },
    }),
    [onChange, uploadMetadata, uploadType],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      uploadFile(file, uploadOptions);
      onFileSelected?.(file);
      e.target.value = '';
    },
    [onFileSelected, uploadFile, uploadOptions],
  );

  const openFilePicker = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const clearImage = useCallback(() => {
    deleteEntry({
      onSuccess: () => onChange?.(''),
    });
  }, [deleteEntry, onChange]);

  const inputProps: ComponentProps<'input'> = {
    ref: inputRef,
    accept: FileInputType.image,
    type: 'file',
    disabled: isUploading || disabled,
    onChange: handleFileChange,
    onClick: e => e.stopPropagation(),
  };

  return {
    clearImage,
    inputProps,
    isDeletingEntry,
    isUploading,
    openFilePicker,
    percentage,
  };
}

function ImageSelectorInput({
  className,
  disabled,
  onChange,
  onFileSelected,
  uploadMetadata,
  uploadType,
  value,
  previewClassName,
  required,
}: ImageSelectorProps & {
  autoFocus?: boolean;
  required?: boolean;
  previewClassName?: string;
}) {
  const upload = useImageUpload({
    disabled,
    onChange,
    onFileSelected,
    uploadMetadata,
    uploadType,
    value,
  });

  if (value) {
    return (
      <div
        className={cn(
          'relative isolate mb-2.5 h-20 overflow-hidden rounded-input border bg-muted p-1.5',
          className,
        )}
      >
        <input className="sr-only" {...upload.inputProps} />
        <FadedDotsBackground />
        <img
          className={cn(
            'mx-auto h-full rounded-sm object-contain',
            previewClassName,
          )}
          onClick={upload.openFilePicker}
          src={value}
          alt=""
        />
        <UploadProgress
          isUploading={upload.isUploading}
          percentage={upload.percentage}
        />
        <ImageActions
          className="absolute right-1 bottom-1 shadow-sm"
          onRemove={upload.clearImage}
          disabled={disabled || upload.isUploading || upload.isDeletingEntry}
          value={value}
          onUpload={upload.openFilePicker}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative text-sm', className)}>
      <Input
        bindToHookForm={false}
        {...upload.inputProps}
        required={required}
      />
      <UploadProgress
        isUploading={upload.isUploading}
        percentage={upload.percentage}
      />
    </div>
  );
}

function ImageSelectorSquare({
  className,
  disabled,
  onChange,
  onFileSelected,
  placeholderVariant = 'text',
  uploadMetadata,
  uploadType,
  value,
}: ImageSelectorProps & {placeholderVariant?: 'dropzone' | 'icon' | 'text'}) {
  const upload = useImageUpload({
    disabled,
    onChange,
    onFileSelected,
    uploadMetadata,
    uploadType,
    value,
  });

  return (
    <div
      className={cn(
        'relative isolate z-20 flex size-36 flex-col items-center justify-center gap-3.5 rounded-input border border-dashed border-border/80',
        (value || placeholderVariant !== 'dropzone') && 'bg-muted/80',
        className,
      )}
    >
      {value && (
        <div
          className="absolute inset-1.5 z-10 size-[calc(100%-12px)] bg-contain bg-center bg-no-repeat"
          style={value ? {backgroundImage: `url(${value})`} : undefined}
        />
      )}

      <input
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0 file:text-transparent"
        title=""
        {...upload.inputProps}
      />

      {(value || placeholderVariant !== 'dropzone') && <FadedDotsBackground />}

      {!value && placeholderVariant === 'dropzone' && (
        <Empty.Root className="p-6">
          <Empty.Header>
            <Empty.Media variant="icon">
              <UploadIcon />
            </Empty.Media>
            <Empty.Title className="text-sm">
              <Trans message="Select file to upload or drag-and-drop file" />
            </Empty.Title>
            <Empty.Description className="text-xs text-foreground">
              <Trans message="Accepted file types: JPG, PNG, GIF, SVG" />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      )}

      {(value || placeholderVariant !== 'dropzone') && (
        <ImageActions
          placeholderVariant={
            placeholderVariant === 'dropzone' ? undefined : placeholderVariant
          }
          onRemove={upload.clearImage}
          disabled={disabled || upload.isUploading || upload.isDeletingEntry}
          value={value}
          onUpload={upload.openFilePicker}
          className={cn('z-20', value && 'absolute right-1 bottom-1 shadow-sm')}
        />
      )}

      <UploadProgress
        isUploading={upload.isUploading}
        percentage={upload.percentage}
        className="z-30"
      />
    </div>
  );
}

function ImageSelectorAvatar({
  className,
  disabled,
  onChange,
  onFileSelected,
  placeholderIcon,
  previewClassName,
  uploadMetadata,
  uploadType,
  value,
}: ImageSelectorProps & {
  placeholderIcon?: ReactElement;
  previewClassName?: string;
}) {
  const upload = useImageUpload({
    disabled,
    onChange,
    onFileSelected,
    uploadMetadata,
    uploadType,
    value,
  });

  const fallbackPlaceholder = (
    <AvatarPlaceholderIcon
      viewBox="0 0 48 48"
      className={cn(
        'size-full rounded-full bg-primary/15 text-primary/15',
        previewClassName,
      )}
    />
  );

  return (
    <div
      className={cn('relative size-20 shrink-0 rounded-full', className)}
      onClick={upload.openFilePicker}
    >
      <input className="sr-only" {...upload.inputProps} />

      {value ? (
        <img
          src={value}
          className={cn(
            'size-full rounded-full object-cover',
            previewClassName,
          )}
          alt=""
        />
      ) : (
        placeholderIcon || fallbackPlaceholder
      )}

      <ImageActions
        onRemove={upload.clearImage}
        disabled={disabled || upload.isUploading || upload.isDeletingEntry}
        value={value}
        onUpload={upload.openFilePicker}
        className="absolute -right-0.5 -bottom-0.5 shadow-sm"
      />

      <UploadProgress
        isUploading={upload.isUploading}
        percentage={upload.percentage}
      />
    </div>
  );
}

interface ImageActionsProps {
  disabled?: boolean;
  onRemove: () => void;
  onUpload: () => void;
  value?: string | null;
  className?: string;
  placeholderVariant?: 'icon' | 'text';
}

function ImageActions({
  disabled,
  onUpload,
  onRemove,
  value,
  className,
  placeholderVariant,
}: ImageActionsProps) {
  if (!value) {
    if (placeholderVariant === 'text') {
      return (
        <Button
          size="sm"
          color="white"
          className={cn('shadow-sm', className)}
          onClick={e => {
            e.stopPropagation();
            onUpload();
          }}
        >
          <Trans message="Upload image" />
        </Button>
      );
    }
    return (
      <Tooltip.Root>
        <Tooltip.Trigger
          onClick={e => {
            e.stopPropagation();
            onUpload();
          }}
          render={
            <Button
              size="icon-sm"
              color="white"
              className={cn('shadow-sm', className)}
            />
          }
        >
          <UploadIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Upload image" />
        </Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button
            size="icon-sm"
            color="white"
            className={cn('shadow-sm', className)}
            onClick={e => e.stopPropagation()}
          />
        }
        disabled={disabled}
      >
        <MoreVerticalIcon />
      </Dropdown.Trigger>
      <Dropdown.Content align="start">
        <Dropdown.Item onClick={() => onUpload()}>
          {value ? <Trans message="Replace" /> : <Trans message="Upload" />}
        </Dropdown.Item>
        {!!value && (
          <Dropdown.Item variant="destructive" onClick={() => onRemove()}>
            <Trans message="Remove" />
          </Dropdown.Item>
        )}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

function UploadProgress({
  isUploading,
  percentage,
  className,
}: {
  isUploading?: boolean;
  percentage: number;
  className?: string;
}) {
  if (!isUploading) {
    return null;
  }

  return (
    <Progress.Root
      className={cn(
        'absolute right-0 bottom-0 left-0 mx-auto max-w-[calc(100%-10px)]',
        className,
      )}
      value={percentage}
    >
      <Progress.Track className="h-1">
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
  );
}

export const ImageSelector = {
  Avatar: ImageSelectorAvatar,
  Input: ImageSelectorInput,
  Square: ImageSelectorSquare,
};

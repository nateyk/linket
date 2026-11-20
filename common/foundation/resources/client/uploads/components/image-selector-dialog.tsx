import {FileEntry} from '@app/gen/schemas/file-entry';
import {UploadType} from '@app/site-config';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {
  encodeCanvasToImageFile,
  uploadMaxFileSize,
  validateEncodedImage,
} from '@common/uploads/utils/encode-cropped-image';
import {UploadStrategyConfig} from '@common/uploads/uploader/strategy/upload-strategy';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Slider} from '@shadcn/forms/slider/slider';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {cropStageBoxStyle} from '@shadcn/image-crop/image-crop';
import {Progress} from '@shadcn/progress/progress';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {toast as restrictionToast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {UploadIcon} from 'lucide-react';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Cropper, {type Area} from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

interface CropDimensions {
  width: number;
  height: number;
}

interface CropPosition {
  x: number;
  y: number;
}

interface ImageSelectorDialogProps {
  children?: Dialog.TriggerElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  cropDimensions?: CropDimensions;
  uploadType: keyof typeof UploadType;
  uploadMetadata?: Record<string, string>;
  onSelected: (newValue: string, entry?: FileEntry) => void;
}

export function ImageSelectorDialog(props: ImageSelectorDialogProps) {
  const [open, setOpen] = useControlledState(
    props.open,
    false,
    props.onOpenChange,
  );
  const {children, ...contentProps} = props;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <FileUploadProvider>
          <ImageSelectorDialogContent
            {...contentProps}
            closeDialog={() => setOpen(false)}
          />
        </FileUploadProvider>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ImageSelectorDialogContentProps extends Omit<
  ImageSelectorDialogProps,
  'children'
> {
  closeDialog: () => void;
}

function ImageSelectorDialogContent({
  cropDimensions = {width: 512, height: 512},
  closeDialog,
  onSelected,
  uploadMetadata,
  uploadType,
}: ImageSelectorDialogContentProps) {
  const {uploadFile, uploadStatus, percentage} = useActiveUpload();
  const {trans} = useTrans();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropPosition>({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const isUploading = uploadStatus === 'inProgress';
  const isBusy = isUploading || isCropping;

  useEffect(() => {
    return () => {
      if (selectedImageUrl) {
        URL.revokeObjectURL(selectedImageUrl);
      }
    };
  }, [selectedImageUrl]);

  const uploadOptions: UploadStrategyConfig = useMemo(
    () => ({
      uploadType,
      showToastOnRestrictionFail: true,
      restrictions: restrictionsFromConfig({uploadType}),
      metadata: {
        ...uploadMetadata,
      },
      onSuccess: entry => {
        onSelected(entry.url, entry);
        closeDialog();
      },
      onError: message => {
        if (message) {
          toast.error(message);
        }
      },
    }),
    [closeDialog, onSelected, uploadMetadata, uploadType],
  );

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setSelectedImageUrl(URL.createObjectURL(file));
    setCrop({x: 0, y: 0});
    setZoom(1);
    setCroppedAreaPixels(null);
    e.target.value = '';
  }, []);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const uploadCroppedImage = useCallback(async () => {
    if (!selectedFile || !selectedImageUrl || !croppedAreaPixels) {
      return;
    }

    setIsCropping(true);
    try {
      const croppedFile = await cropImageFile({
        crop: croppedAreaPixels,
        dimensions: cropDimensions,
        file: selectedFile,
        imageUrl: selectedImageUrl,
      });
      const error = validateEncodedImage(
        new UploadedFile(croppedFile),
        restrictionsFromConfig({uploadType}),
      );
      if (error) {
        restrictionToast.danger(error);
        return;
      }
      uploadFile(croppedFile, uploadOptions);
    } catch {
      toast.error(<Trans message="Could not crop image" />);
    } finally {
      setIsCropping(false);
    }
  }, [
    cropDimensions,
    croppedAreaPixels,
    selectedFile,
    selectedImageUrl,
    uploadFile,
    uploadOptions,
  ]);

  return (
    <Dialog.Content className="max-h-[calc(100dvh-1rem)] gap-2.5 overflow-y-auto p-3 sm:max-w-xl sm:p-4">
      <Dialog.Header className="gap-0.5 pr-8">
        <Dialog.Title>
          <Trans message="Upload image" />
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          <Trans message="Choose an image, reposition it and adjust Zoom before uploading." />
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Body className="-mx-3 flex-none grow-0 px-3 py-0 sm:-mx-4 sm:px-4">
        {selectedImageUrl ? (
          <>
            <div className="flex w-full justify-center">
              <div
                role="group"
                tabIndex={0}
                aria-label={trans(message('Image crop area'))}
                aria-describedby="upload-image-crop-hint"
                style={cropStageBoxStyle(cropDimensions.width / cropDimensions.height)}
                className="image-crop-stage relative overflow-hidden rounded-input bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onKeyDown={event => {
                  if (event.target !== event.currentTarget) return;
                  const step = event.shiftKey ? 20 : 6;
                  const offsets = {
                    ArrowLeft: {x: -step, y: 0},
                    ArrowRight: {x: step, y: 0},
                    ArrowUp: {x: 0, y: -step},
                    ArrowDown: {x: 0, y: step},
                  };
                  const offset = offsets[event.key as keyof typeof offsets];
                  if (!offset) return;
                  event.preventDefault();
                  setCrop(current => ({x: current.x + offset.x, y: current.y + offset.y}));
                }}
              >
                <span id="upload-image-crop-hint" className="sr-only">
                  <Trans message="Drag to reposition the image, or use arrow keys. Hold Shift for larger steps." />
                </span>
                <Cropper
                  image={selectedImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropDimensions.width / cropDimensions.height}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
                {isUploading && <UploadProgress percentage={percentage} />}
              </div>
            </div>
            <HookForm.FieldContext.Provider value={undefined}>
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onValueChange={next => setZoom((next as number) ?? 1)}
                disabled={isBusy}
                className="flex items-center gap-3"
              >
                <Slider.Label className="shrink-0 text-xs text-muted-foreground">
                  <Trans message="Zoom" />
                </Slider.Label>
                <Slider.Control className="min-w-0 flex-1 py-2">
                  <Slider.Track><Slider.Indicator /></Slider.Track>
                  <Slider.Thumb aria-label={trans(message('Zoom'))} />
                </Slider.Control>
              </Slider>
            </HookForm.FieldContext.Provider>
          </>
        ) : (
          <Dropzone
            disabled={isBusy}
            uploadType={uploadType}
            onFileChange={handleFileChange}
          />
        )}
      </Dialog.Body>

      {selectedImageUrl && (
        <Dialog.Footer className="-mx-3 -mb-3 flex-row flex-wrap items-center justify-end gap-1.5 border-t border-border/60 px-3 pt-2.5 pb-3 sm:-mx-4 sm:-mb-4 sm:px-4 sm:pt-3 sm:pb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto px-2"
            disabled={isBusy}
            onClick={() => {
              setCrop({x: 0, y: 0});
              setZoom(1);
              setCroppedAreaPixels(null);
            }}
          >
            <Trans message="Reset" />
          </Button>
          <Dialog.CloseButton variant="outline" size="sm" disabled={isBusy}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            size="sm"
            type="button"
            disabled={!croppedAreaPixels || isBusy}
            onClick={uploadCroppedImage}
          >
            <Trans message="Upload" />
          </Button>
        </Dialog.Footer>
      )}
    </Dialog.Content>
  );
}

function Dropzone({
  disabled,
  uploadType,
  onFileChange,
}: {
  disabled?: boolean;
  uploadType: keyof typeof UploadType;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={cn(
        'relative isolate flex h-36 flex-col items-center justify-center gap-3.5 rounded-card-sm border border-dashed border-border/80',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <input
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0 file:text-transparent"
        title=""
        accept={FileInputType.image}
        type="file"
        disabled={disabled}
        onChange={onFileChange}
      />

      <Empty.Root>
        <Empty.Header>
          <Empty.Media variant="icon">
            <UploadIcon />
          </Empty.Media>
          <Empty.Title className="text-sm">
            <Trans message="Select file to upload or drag-and-drop file" />
          </Empty.Title>
          <Empty.Description className="text-xs text-foreground">
            <Trans
              message="JPG, PNG, or WebP up to :size. Large images are compressed to WebP automatically."
              values={{size: prettyBytes(uploadMaxFileSize(uploadType))}}
            />
          </Empty.Description>
        </Empty.Header>
      </Empty.Root>
    </div>
  );
}

function UploadProgress({percentage}: {percentage: number}) {
  return (
    <Progress.Root
      className="absolute right-0 bottom-0 left-0 z-30 mx-auto"
      value={percentage}
    >
      <Progress.Track className="rounded-none">
        <Progress.Indicator className="rounded-none" />
      </Progress.Track>
    </Progress.Root>
  );
}

async function cropImageFile({
  crop,
  dimensions,
  file,
  imageUrl,
}: {
  crop: Area;
  dimensions: CropDimensions;
  file: File;
  imageUrl: string;
}) {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create canvas context');
  }

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    dimensions.width,
    dimensions.height,
  );

  return encodeCanvasToImageFile(canvas, file.name);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}


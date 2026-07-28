import {FileEntry} from '@app/gen/schemas/file-entry';
import {UploadType} from '@app/site-config';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {UploadStrategyConfig} from '@common/uploads/uploader/strategy/upload-strategy';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Slider} from '@shadcn/forms/slider/slider';
import {Progress} from '@shadcn/progress/progress';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {UploadIcon} from 'lucide-react';
import {nanoid} from 'nanoid';
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
    <Dialog.Content className="sm:max-w-xl">
      <Dialog.Header>
        <Dialog.Title>
          <Trans message="Upload image" />
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        {selectedImageUrl ? (
          <>
            <div className="relative mb-4 h-80 overflow-hidden rounded-input">
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
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onValueChange={next => setZoom((next as number) ?? 1)}
              disabled={isBusy}
            >
              <Slider.Label>
                <Trans message="Zoom" />
              </Slider.Label>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Indicator />
                </Slider.Track>
                <Slider.Thumb />
              </Slider.Control>
            </Slider>
          </>
        ) : (
          <Dropzone disabled={isBusy} onFileChange={handleFileChange} />
        )}
      </Dialog.Body>

      {selectedImageUrl && (
        <Dialog.Footer>
          <Button
            className="min-h-12 w-full text-base font-semibold"
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
  onFileChange,
}: {
  disabled?: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={cn(
        'relative isolate flex h-48 flex-col items-center justify-center gap-3.5 rounded-card-sm border border-dashed border-border/80',
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
            <Trans message="Accepted file types: JPG, PNG, GIF, SVG" />
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

  const blob = await canvasToBlob(canvas, getOutputMimeType(file));
  return new File([blob], getCroppedFileName(blob.type), {
    type: blob.type,
    lastModified: Date.now(),
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not create cropped image'));
      }
    }, type);
  });
}

function getOutputMimeType(file: File) {
  if (file.type === 'image/jpeg' || file.type === 'image/webp') {
    return file.type;
  }
  return 'image/png';
}

function getCroppedFileName(mimeType: string) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  return `${nanoid(12)}.${extension}`;
}

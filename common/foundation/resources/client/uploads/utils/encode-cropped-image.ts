import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {
  Restrictions,
  validateFile,
} from '@ui/utils/files/validate-file';

/** Matches server Intervention WebP quality (82). */
export const WEBP_ENCODE_QUALITY = 0.82;

const LINK_IMAGE_DEFAULT_MAX = 2 * 1024 * 1024;

export function encodedImageName(sourceName: string, mime: string): string {
  const extension =
    mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] || 'webp';
  const base = sourceName.replace(/\.[^.]+$/, '').trim() || 'image';
  return `${base}.${extension}`;
}

export function uploadMaxFileSize(uploadType: string): number {
  const types = getBootstrapData()?.uploading_types as
    | Record<string, {max_file_size?: number | string}>
    | undefined;
  const configured = types?.[uploadType]?.max_file_size;
  const parsed = configured ? parseInt(`${configured}`, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : LINK_IMAGE_DEFAULT_MAX;
}

/**
 * Encode a cropped canvas to WebP, then JPEG, then PNG.
 * Callers must size-check the returned file, not the source PNG.
 */
export async function encodeCanvasToImageFile(
  canvas: HTMLCanvasElement,
  sourceName: string,
): Promise<File> {
  const blob = await encodeCanvasBlob(canvas);
  return new File([blob], encodedImageName(sourceName, blob.type), {
    type: blob.type,
    lastModified: Date.now(),
  });
}

export function validateEncodedImage(
  file: UploadedFile,
  restrictions?: Restrictions | null,
): MessageDescriptor | undefined {
  if (!restrictions) return;

  const {maxFileSize} = restrictions;
  if (maxFileSize && file.size != null && file.size > maxFileSize) {
    return message(
      '`:file` is :actual after compression, which exceeds the :size limit',
      {
        values: {
          file: file.name,
          actual: prettyBytes(file.size),
          size: prettyBytes(maxFileSize),
        },
      },
    );
  }

  return validateFile(file, restrictions) || undefined;
}

async function encodeCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await canvasToBlob(canvas, 'image/webp', WEBP_ENCODE_QUALITY);
  if (isUsableBlob(webp, 'image/webp')) return webp;

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', WEBP_ENCODE_QUALITY);
  if (isUsableBlob(jpeg, 'image/jpeg')) return jpeg;

  const png = await canvasToBlob(canvas, 'image/png');
  if (isUsableBlob(png, 'image/png')) return png;

  throw new Error('Could not encode image');
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), type, quality);
  });
}

function isUsableBlob(
  blob: Blob | null,
  type: string,
): blob is Blob {
  return !!blob && blob.size > 0 && blob.type === type;
}

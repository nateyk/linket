import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {describe, expect, test} from 'vitest';
import {
  WEBP_ENCODE_QUALITY,
  encodeCanvasToImageFile,
  encodedImageName,
  validateEncodedImage,
} from './encode-cropped-image';

const LINK_IMAGE_LIMIT = 2 * 1024 * 1024;

function canvasReturning(blobs: Record<string, Blob | null>) {
  const calls: Array<{type?: string; quality?: number}> = [];
  const canvas = {
    toBlob(
      callback: (blob: Blob | null) => void,
      type?: string,
      quality?: number,
    ) {
      calls.push({type, quality});
      callback(type ? (blobs[type] ?? null) : null);
    },
  } as unknown as HTMLCanvasElement;
  return {canvas, calls};
}

describe('encodeCanvasToImageFile', () => {
  test('oversize source name becomes a WebP under the link image limit', async () => {
    const webp = new Blob([new Uint8Array(400_000)], {type: 'image/webp'});
    const {canvas, calls} = canvasReturning({'image/webp': webp});

    const file = await encodeCanvasToImageFile(canvas, 'Tumbnail.png');

    expect(calls[0]).toEqual({
      type: 'image/webp',
      quality: WEBP_ENCODE_QUALITY,
    });
    expect(file.type).toBe('image/webp');
    expect(file.name).toBe('Tumbnail.webp');
    expect(file.size).toBe(400_000);
    expect(file.size).toBeLessThan(LINK_IMAGE_LIMIT);
    expect(
      validateEncodedImage(new UploadedFile(file), {
        maxFileSize: LINK_IMAGE_LIMIT,
        allowedFileTypes: ['image/*'],
      }),
    ).toBeUndefined();
  });

  test('falls back to jpeg when WebP encoding is unsupported', async () => {
    const jpeg = new Blob([new Uint8Array(1200)], {type: 'image/jpeg'});
    const {canvas} = canvasReturning({
      'image/webp': new Blob([new Uint8Array(10)], {type: 'image/png'}),
      'image/jpeg': jpeg,
    });

    const file = await encodeCanvasToImageFile(canvas, 'cover.png');

    expect(file.type).toBe('image/jpeg');
    expect(file.name).toBe('cover.jpg');
  });
});

describe('validateEncodedImage', () => {
  test('rejects a WebP that is still over the limit and reports both sizes', () => {
    const bytes = new Uint8Array(2_500_000);
    const file = new File([bytes], 'Tumbnail.webp', {type: 'image/webp'});

    const error = validateEncodedImage(new UploadedFile(file), {
      maxFileSize: LINK_IMAGE_LIMIT,
    });

    expect(error?.message).toBe(
      '`:file` is :actual after compression, which exceeds the :size limit',
    );
    expect(error?.values).toMatchObject({
      file: 'Tumbnail.webp',
      actual: '2.4 MB',
      size: '2 MB',
    });
  });
});

describe('encodedImageName', () => {
  test('swaps the extension for the encoded mime', () => {
    expect(encodedImageName('Photo.PNG', 'image/webp')).toBe('Photo.webp');
    expect(encodedImageName('photo', 'image/jpeg')).toBe('photo.jpg');
  });
});

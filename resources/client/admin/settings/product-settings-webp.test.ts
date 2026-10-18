import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/admin/settings/product-settings.tsx'),
  'utf8',
);

describe('product settings webp switch', () => {
  test('binds a convert-covers-to-webp toggle', () => {
    expect(source).toContain('client.product.convert_covers_to_webp');
    expect(source).toContain('<Trans message="Convert cover images to WebP" />');
    expect(source).toContain('convert_covers_to_webp');
  });
});

describe('uploading settings webp switch', () => {
  test('binds convert-uploaded-images-to-webp', () => {
    const uploading = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/admin/settings/pages/uploading-settings/uploading-settings.tsx',
      ),
      'utf8',
    );
    expect(uploading).toContain('client.uploading.convert_images_to_webp');
    expect(uploading).toContain(
      '<Trans message="Convert uploaded images to WebP" />',
    );
  });
});

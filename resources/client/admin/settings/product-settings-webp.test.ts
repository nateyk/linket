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

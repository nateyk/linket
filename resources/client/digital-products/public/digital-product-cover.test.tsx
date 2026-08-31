import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('digital product covers', () => {
  test('public and widget product covers use the shared ProductCover', () => {
    const publicSource = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );
    const widgetSource = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
      ),
      'utf8',
    );

    expect(publicSource).toContain("import {ProductCover} from '@ui/product-cover'");
    expect(widgetSource).toContain("import {ProductCover} from '@ui/product-cover'");
    expect(publicSource).not.toContain('const [imageError, setImageError]');
    expect(widgetSource).not.toContain('const [imageError, setImageError]');
  });
});

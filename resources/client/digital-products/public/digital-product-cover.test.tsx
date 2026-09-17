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
    const cardSource = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/shared/product-card.tsx',
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
    // The storefront grid renders covers through the shared ProductCard,
    // which itself delegates to the shared ProductCover.
    expect(cardSource).toContain("import {ProductCover} from '@ui/product-cover'");
    expect(widgetSource).toContain(
      "import {ProductCard} from '@app/digital-products/shared/product-card'",
    );
    expect(publicSource).not.toContain('const [imageError, setImageError]');
    expect(cardSource).not.toContain('const [imageError, setImageError]');
    expect(widgetSource).not.toContain('const [imageError, setImageError]');
  });
});

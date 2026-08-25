import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('digital product covers', () => {
  test('replace failed public page cover images with the product placeholder', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('const [imageError, setImageError] = useState(false);');
    expect(source).toContain('product.cover?.url && !imageError');
    expect(source).toContain('onError={() => setImageError(true)}');
  });

  test('replace failed store card cover images with the product placeholder', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('const [imageError, setImageError] = useState(false);');
    expect(source).toContain('product.cover?.url && !imageError');
    expect(source).toContain('onError={() => setImageError(true)}');
  });
});

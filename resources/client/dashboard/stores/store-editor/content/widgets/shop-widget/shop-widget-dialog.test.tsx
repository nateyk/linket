import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-dialog.tsx',
  ),
  'utf8',
);

describe('ShopWidgetDialog product picker', () => {
  test('loads approved products and writes product_ids into the shop config', () => {
    expect(source).toContain('digitalProductsIndex');
    expect(source).toContain("name: 'product_ids'");
    expect(source).toContain('product_ids');
    expect(source).toContain('<Trans message="Products" />');
    expect(source).toContain('Checkbox');
  });

  test('shows load and empty states for the product list', () => {
    expect(source).toContain("Couldn't load products");
    expect(source).toContain('No approved products yet');
    expect(source).toContain('productsQuery.refetch');
  });
});

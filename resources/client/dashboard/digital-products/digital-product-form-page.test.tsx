import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('digital product form submission', () => {
  test('uses the saved resource from the API data envelope when submitting', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('const saved = response.data.data as Product;');
    expect(source).toContain(
      'await apiClient.post(`/api/v1/digital-products/${saved.id}/submit`);',
    );
  });

  test('course selectors bypass the generic product details form', () => {
    const selectionPage = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-type-selection-page.tsx',
      ),
      'utf8',
    );
    const dialog = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/create-product-dialog.tsx',
      ),
      'utf8',
    );

    expect(selectionPage).toMatch(
      /selectedType === 'course'\s*\? '\/dashboard\/my-products\/new\/course'/,
    );
    expect(dialog).toMatch(
      /selectedType === 'course'\s*\? '\/dashboard\/my-products\/new\/course'/,
    );
  });

  test('existing course edit links redirect to the course builder', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain("if (item.type === 'course')");
    expect(source).toMatch(
      /navigate\(`\/dashboard\/my-products\/\$\{item\.id\}\/course`,\s*\{\s*replace: true,?\s*\}\);/,
    );
    expect(source.indexOf('/api/v1/digital-products/${productId}')).toBeLessThan(
      source.indexOf('/api/v1/biolinks?fields_preset=minimal'),
    );
  });
});

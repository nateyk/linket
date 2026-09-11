import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('digital product form submission', () => {
  test('only enables submission for draft or rejected products', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      "product.status === 'draft' || product.status === 'rejected'",
    );
  });

  test('uses the saved resource from the API data envelope when submitting', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('saved = response.data.data as Product;');
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
    expect(dialog).toContain('useProductCreateWizard');
    expect(dialog).toContain('finishUrl');
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
    expect(
      source.indexOf('/api/v1/digital-products/${productId}'),
    ).toBeLessThan(source.indexOf('/api/v1/biolinks?fields_preset=minimal'));
  });

  test('loads product and Storefront data through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/digital-products\/\$\{productId\}`\s*,?\s*\)/,
    );
    expect(source).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/biolinks\?fields_preset=minimal'\s*,?\s*\)/,
    );
  });

  test('routes validation and upload errors to the relevant product sections', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('const [fieldErrors, setFieldErrors]');
    expect(source).toContain('getValidationErrors(reason)');
    expect(source).toContain('errors.title');
    expect(source).toContain('errors.price_cents');
    expect(source).toContain('errors.cover_file_entry_id');
    expect(source).toContain('fieldErrors.file_ids');
    expect(source).toContain('showToastOnBackendError: true');
  });

  test('warns before an approved product is returned to draft', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain("product?.status === 'approved'");
    expect(source).toContain(
      'Saving changes will return this approved product to draft.',
    );
  });
});

describe('digital product list submission', () => {
  test('loads the product list through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-products-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/digital-products\?per_page=100'\s*,?\s*\)/,
    );
  });

  test('does not require downloadable files before submitting a course', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-products-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      'disabled={submitting || (!isCourse && !product.files?.length)}',
    );
  });
});

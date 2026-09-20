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
    const flow = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-create-flow.ts',
      ),
      'utf8',
    );

    expect(selectionPage).toContain('useProductCreateWizard');
    expect(selectionPage).toContain('finishUrl');
    expect(flow).toMatch(
      /state\.type === 'course'[\s\S]*?\/dashboard\/my-products\/new\/course/,
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
    expect(source).toContain('<SharedFileUploader');
    expect(source).toContain('uploadType="digitalProductFiles"');
    const uploaderSource = fs.readFileSync(
      path.resolve('common/foundation/resources/client/ui/file-uploader.tsx'),
      'utf8',
    );
    expect(uploaderSource).toContain('showToastOnBackendError: true');
    expect(uploaderSource).toContain('showToastOnRestrictionFail: true');
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

describe('digital product file capability', () => {
  // Regression: the uploader advertised formats (AAC) that attach later
  // rejected, and the picker advertised Mobi which nothing accepted.
  // The accept list and help text must come from the server capability.
  const formSource = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );
  const pickerSource = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/product-type-picker.tsx',
    ),
    'utf8',
  );

  test('accept list comes from bootstrap, not a hardcoded string', () => {
    expect(formSource).toContain('product_file_formats');
    expect(formSource).not.toContain('accept=".pdf');
    expect(formSource).not.toContain('.aac');
  });

  test('help text comes from the server hint, not a hardcoded list', () => {
    expect(formSource).not.toContain('M4A, or AAC');
    expect(formSource).toContain('fileHint');
  });

  test('ebook picker copy no longer advertises Mobi', () => {
    expect(pickerSource).not.toContain('Mobi');
    expect(pickerSource).toContain('PDF and EPUB');
  });
});

describe('product builder preview', () => {
  // The Customer preview must render through the shared ProductCard so
  // creators see exactly what storefront customers see.
  const formSource = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );

  test('preview reuses the shared ProductCard', () => {
    const previewSource = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(previewSource).toContain(
      "import {ProductCard} from '@app/digital-products/shared/product-card'",
    );
    expect(previewSource).toContain('<ProductCard');
    expect(previewSource).toContain('meta={');
  });
});

describe('product form reassembly', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );

  test('initializes the creation provider from wizard query params', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).toContain('<ProductCreationProvider');
    expect(source).toContain('useProductCreation');
  });

  test('renders sections, progress, preview, and breadcrumb through primitives', () => {
    expect(source).toContain('<ProductFormSection');
    expect(source).toContain('<ProductFormProgress');
    expect(source).toContain('<ProductPreview');
    expect(source).toContain("from '@shadcn/breadcrumb/breadcrumb'");
    expect(source).toContain('<Breadcrumb');
    expect(source).toContain('All products');
  });

  test('invalid fields carry accessible error state', () => {
    expect(source).toContain('<ProductFormField');
    expect(source).toContain('aria-invalid');
  });
});

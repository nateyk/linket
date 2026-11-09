import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('large text responsive header UX-34', () => {
  test('allows title to wrap below action row before it collapses at enlarged text sizes', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2"');
    expect(source).toContain('max-lg:order-3 max-lg:basis-full');
    expect(source).toContain('max-lg:overflow-visible max-lg:whitespace-normal');
    expect(source).toContain('max-lg:hidden');
    expect(source).toContain('max-lg:size-11 max-lg:px-0');
    expect(source).toContain('aria-label={trans({message: \'Preview\'})}');
  });
});

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
      'await apiClient.post(`/api/v1/items/${saved.id}/submit`);',
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

    expect(selectionPage).toContain('productTypeCreateUrl(selectedType)');
    expect(flow).toContain('productTypeCreateUrl');
    expect(dialog).toContain('ProductTypePicker');
    expect(dialog).toContain('productTypeCreateUrl(selectedType)');
    expect(dialog).not.toContain('useProductCreateWizard');
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
      /navigate\(\s*`\/dashboard\/items\/\$\{item\.id\}\/course\?notice=moved-to-builder`,\s*\{\s*replace: true,?\s*\}\s*,?\s*\);/,
    );
    expect(
      source.indexOf('/api/v1/items/${productId}'),
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
      /await apiClient\.get\(\s*`\/api\/v1\/items\/\$\{productId\}`\s*,?\s*\)/,
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
    expect(source).toContain('sampleSectionKind');
    expect(source).toContain('Files buyers get after purchase');
    expect(source).toContain('Preview tracks');
    expect(source).toContain('Sample PDF');
    const uploaderSource = fs.readFileSync(
      path.resolve('common/foundation/resources/client/ui/file-uploader.tsx'),
      'utf8',
    );
    expect(uploaderSource).toContain('showToastOnBackendError: true');
    expect(uploaderSource).toContain('showToastOnRestrictionFail: true');
  });

  test('warns that a published product update may require review after an edit', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain("product?.status === 'approved' && dirty");
    expect(source).toContain(
      'Changes to approved products may require review. The published version remains available during review.',
    );
  });
});

describe('safe save and submit recovery UX-22', () => {
  test('retains persisted product ID after a failed submit rather than posting another new item', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('savedBeforeSubmitFailure');
    expect(source).toContain('productSubmissionRecovery: recovery');
    expect(source).toContain('productSubmissionErrors: validationErrors');
    expect(source).toContain('navigate(`/dashboard/items/${saved.id}/edit`');
    expect(source).toContain('saveInFlight.current');
  });

  test('unknown new-product creation or submission blocks a second mutation', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('setCreationUncertain(true)');
    expect(source).toContain("submissionRecovery === 'uncertain'");
    expect(source).toContain('Check My Items');
    expect(source).toContain('role="alert"');
  });
});

describe('optional Storefront placement UX-21', () => {
  test('distinguishes selecting Storefronts from publishing or submission requirements', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('Storefront placement is optional and does not block product submission.');
    expect(source).toContain('Optional. Choose where customers can find this product after approval.');
    expect(source).toContain('No Storefront selected');
    expect(source).toContain('[one :count Storefront selected|other :count Storefronts selected]');
    expect(source).toContain('Selection does not publish the product; approval is handled separately.');
    expect(source).not.toContain('This product is placed on storefronts, but it will not appear publicly until it is approved.');
  });

  test('keeps selection associated with existing Storefront checkboxes, not buyer links', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('checked={selectedIds.includes(page.id)}');
    expect(source).toContain('selectedIds.filter(id => id !== page.id)');
    expect(source).toContain('selectedIds.includes(page.id) ? selectedIds : [...selectedIds, page.id]');
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

    // The product list now uses paginated, filterable requests.
    expect(source).toContain("await apiClient.get('/api/v1/items', {");
    expect(source).toContain('per_page: 12,');
    expect(source).toContain('page,');
  });

  test('does not require downloadable files before submitting a course', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-products-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      'disabled={submitting || busy || (!isCourse && !product.files?.length)}',
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

describe('inline Free or Paid pricing', () => {
  test('creator selects free or paid within the editor, not an earlier wizard step', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('<BillingModePicker');
    expect(source).toContain('effectiveBilling');
    expect(source).toContain('priceForBillingMode(price, mode)');
    expect(source).toContain("effectiveBilling === 'paid' && priceCents <= 0");
    expect(source).not.toContain("isApproved={product?.status === 'approved'}");
  });
});

describe('product builder preview', () => {
  // The Customer preview must render through the shared ProductCard so
  // creators see exactly what storefront customers see.
  const previewSource = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/product-preview.tsx',
    ),
    'utf8',
  );

  test('preview reuses the shared ProductCard', () => {
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

  test('non-course authoring uses a wider shell with a distinct setup status band', () => {
    // Ebook/digital/audio were cramped at max-w-3xl with progress sharing
    // weight with the first section. Course keeps its own max-w-6xl grid.
    expect(source).toContain("effectiveFileType !== 'course' ? 'mx-auto w-full max-w-5xl");
    expect(source).toContain("effectiveFileType !== 'course' ? 'mx-auto w-full max-w-5xl py-4 sm:py-5' : 'mx-auto w-full max-w-6xl py-4 sm:py-5'");
    expect(source).not.toContain("effectiveFileType !== 'course' ? 'mx-auto w-full max-w-3xl");
    expect(source).toContain('data-testid="product-authoring-layout"');
    expect(source).toContain('data-testid="product-setup-status"');
  });
});

describe('product form error focus and skeletons', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );

  test('routes the first invalid field to a focusable id', async () => {
    const {firstInvalidFieldId} = await import('./product-create-flow');
    expect(firstInvalidFieldId({title: 'Required'})).toBe('product-title');
    expect(firstInvalidFieldId({price_cents: 'Invalid'})).toBe(
      'product-price',
    );
    expect(firstInvalidFieldId({file_ids: 'Required'})).toBe('product-files');
    expect(firstInvalidFieldId({})).toBeNull();
  });

  test('focuses the offending field and renders granular skeletons', () => {
    expect(source).toContain('firstInvalidFieldId');
    expect(source).toContain('getElementById');
    expect(source).toContain('.focus(');
    expect(source).toContain('DetailsSkeleton');
    expect(source).toContain('FilesSkeleton');
    expect(source).toContain('PreviewSkeleton');
    expect(source).toContain('id="product-files"');
  });
});

describe('keyboard shortcuts and preview', () => {
  test('handles Cmd+S to save draft', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('keydown');
    expect(source).toContain('metaKey');
    expect(source).toContain('save');
  });
  test('preview shows character count and file sizes', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('character');
    expect(source).toContain('file');
  });
});

describe('product files dropzone', () => {
  test('renders the uploader bare, without an extra card wrapper', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('uploadType="digitalProductFiles"');
    expect(source).toContain('bare');
  });
});

describe('product cover and attached files', () => {
  test('cover preview keeps a true 16:9 ratio like the storefront card', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('aspect={16 / 9}');
    expect(source).toContain('aspect-video h-auto w-full');
  });
  test('attached files reuse the Attachment primitive with type icons', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );
    expect(source).toContain("from '@shadcn/attachment/attachment'");
    expect(source).toContain('<Attachment state="done"');
    expect(source).toContain('fileTypeIcon');
    expect(source).toContain('FileArchiveIcon');
  });
});

describe('course edit redirect', () => {
  test('routes course edits into the builder with an explanatory notice', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('?notice=moved-to-builder');
  });
});

describe('P2 header: the page title owns the row', () => {
  // crit3-A/3-B: `DashboardLayout.SectionTitle` measured width 0 at
  // 1280/1440/1920 (`[844,72,0,36]` @1280, overflow:hidden), so the page
  // title AND the Approved badge never rendered. Root cause is the flex
  // chain in SectionHeader: the breadcrumb <nav> ships `w-full`, i.e. a flex
  // base size of the ENTIRE header row, while SectionTitle is
  // `flex-1` (flex-basis 0%) — there is never positive free space left for
  // the title, so it collapses to 0 and its overflow clips the badge behind
  // the action row. The breadcrumb has to stop claiming the row, and the
  // duplicated current-page crumb (same string as the title) goes with it.
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
    ),
    'utf8',
  );

  test('breadcrumb is width-constrained instead of claiming the whole header', () => {
    expect(source).toMatch(
      /<Breadcrumb[^>]*className="[^"]*\bw-auto\b[^"]*"/,
    );
    // Below 1024px, including 200% enlarged text, the breadcrumb steps
    // aside while the one h1 wraps and icon controls retain their names.
    expect(source).toMatch(
      /<Breadcrumb[^>]*className="[^"]*max-lg:hidden[^"]*"/,
    );
  });

  test('the page title is not printed twice in the header', () => {
    // Fixing the 0px title without this would put "Edit digital product" on
    // screen twice (breadcrumb crumb + SectionTitle), per crit3-A note.
    expect(source).not.toContain('<Breadcrumb.Page');
    expect(source).not.toContain('<Breadcrumb.Separator');
    // ...but the title itself (and its status badge) stays, and in a tight
    // row the TEXT truncates (min-w-0) so the badge keeps its 36px.
    expect(source).toMatch(
      /<DashboardLayout\.SectionTitle[^>]*>[\s\S]*?<span className="[^"]*min-w-0 truncate[^"]*">\s*\{pageTitle\}\s*<\/span>\s*\{product && <ProductStatus/,
    );
  });

  test('the title is rendered as the page heading via SectionTitle', () => {
    // Final-fix item 2: the same `render={<h1 />}` mechanism T7 used on the
    // selection page, so the edit page ships exactly one h1 instead of none.
    expect(source).toMatch(
      /<DashboardLayout\.SectionTitle render=\{<h1 \/>\}[^>]*>/,
    );
  });
});

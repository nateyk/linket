// resources/client/dashboard/digital-products/product-preview.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {formatPreviewPrice} from './product-preview';

describe('formatPreviewPrice', () => {
  test('formats finite input to two decimals', () => {
    expect(formatPreviewPrice('19.99')).toBe('ETB 19.99');
    expect(formatPreviewPrice('10')).toBe('ETB 10.00');
  });
  test('falls back for empty or non-numeric input', () => {
    expect(formatPreviewPrice('')).toBe('ETB 0.00');
    expect(formatPreviewPrice('abc')).toBe('ETB 0.00');
  });
});

describe('product preview wiring', () => {
  test('exports a presentational shell the course setup page can reuse', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('export function ProductFormCustomerPreview');
    expect(source).toContain(
      "import {ProductCard} from '@app/digital-products/shared/product-card'",
    );
  });

  test('preview reuses the shared product card and live context', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('useProductCreation');
    expect(source).toContain('<ProductCard');
    expect(source).toContain('Tooltip.Content');
    // Context-backed ProductPreview is a thin wrapper over the shared shell.
    expect(source).toContain('<ProductFormCustomerPreview');
  });
  test('progress shows completed ratio through shadcn progress', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-progress.tsx',
      ),
      'utf8',
    );
    expect(source).toContain("from '@shadcn/progress/progress'");
    expect(source).toContain('Progress.Root');
    expect(source).toContain('Progress.Indicator');
  });
  test('meta copy keeps the approved plural and referent-clear strings', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain(
      'message="[one :count download file|other :count download files]"',
    );
    expect(source).toContain('message=":count characters in description"');
    // The pre-approval strings must not creep back (an in-flight edit once
    // reverted them): the counter covers title + description, so the old
    // bare ":count characters" is ambiguous.
    expect(source).not.toContain('message=":count download files"');
    expect(source).not.toContain('message=":count characters"');
  });

  test('on-demand buyer preview excludes creator-only metadata', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/product-preview.tsx'),
      'utf8',
    );
    expect(source).toContain('buyerOnly?: boolean');
    expect(source).toContain('description={buyerOnly ? description : undefined}');
    expect(source).toContain('fileCount={buyerOnly ? undefined : files.length}');
  });

  test('approved update review state is read from the API flag, not inferred from draft status', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'),
      'utf8',
    );
    expect(source).toContain('hasPendingUpdate={product.has_pending_update === true}');
    expect(source).toContain('product.has_pending_update === true');
    expect(source).toContain('This product remains approved while an update is under review.');
  });

  test('status tones use semantic warning tokens, not raw amber', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('text-warning bg-warning/10');
    expect(source).not.toContain('text-amber-');
    expect(source).not.toContain('bg-amber-');
  });
});

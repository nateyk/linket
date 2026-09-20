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
  test('preview reuses the shared product card and live context', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-preview.tsx',
      ),
      'utf8',
    );
    expect(source).toContain(
      "import {ProductCard} from '@app/digital-products/shared/product-card'",
    );
    expect(source).toContain('useProductCreation');
    expect(source).toContain('<ProductCard');
    expect(source).toContain('Tooltip.Content');
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
});

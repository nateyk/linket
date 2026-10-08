import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(relative), 'utf8');

const table = read(
  'resources/client/admin/digital-products/admin-product-reviews-table.tsx',
);
const page = read(
  'resources/client/admin/digital-products/admin-product-reviews-page.tsx',
);
const columns = read(
  'resources/client/admin/digital-products/admin-product-reviews-datatable-columns.tsx',
);

describe('admin product reviews table', () => {
  test('exports a reusable table wired to the admin reviews endpoint', () => {
    expect(table).toContain('export function AdminProductReviewsTable');
    expect(table).toContain('adminProductReviewsOptions');
    expect(table).toContain('<TableSearchInput />');
    expect(table).toContain('<GenericTable');
    expect(table).toContain('<TablePagination');
  });

  test('reads the response public url and feeds it to the columns', () => {
    expect(table).toContain('public_url');
    expect(table).toContain('adminProductReviewColumns(');
  });
});

describe('admin product reviews page', () => {
  test('mounts the shared reviews table', () => {
    expect(page).toContain(
      "import {AdminProductReviewsTable} from './admin-product-reviews-table'",
    );
    expect(page).toContain('<AdminProductReviewsTable');
  });
});

describe('admin product reviews columns', () => {
  test('exposes a column factory that accepts the product public url', () => {
    expect(columns).toContain(
      'export function adminProductReviewColumns',
    );
    expect(columns).toContain('productPublicUrl');
  });

  test('offers a View action linking to the public reviews section', () => {
    expect(columns).toContain('<Trans message="View" />');
    expect(columns).toContain('#product-reviews-heading');
  });

  test('keeps the admin-only Hide/Restore/Delete actions', () => {
    expect(columns).toContain('<Trans message="Hide" />');
    expect(columns).toContain('<Trans message="Restore" />');
    expect(columns).toContain('<Trans message="Delete" />');
  });
});
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(relative), 'utf8');

const columns = read(
  'resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx',
);
const display = read(
  'resources/client/admin/digital-products/admin-digital-product-display.tsx',
);

describe('admin product shared display', () => {
  test('extracts the status badge and html helper', () => {
    expect(display).toContain('export function ProductStatusBadge');
    expect(display).toContain('export function looksLikeHtml');
    expect(display).toContain('export type AdminDigitalProduct');
  });

  test('columns import the shared display module', () => {
    expect(columns).toContain("from './admin-digital-product-display'");
  });

  test('list title links to the detail page', () => {
    expect(columns).toContain('/admin/digital-products/${product.id}');
  });
});

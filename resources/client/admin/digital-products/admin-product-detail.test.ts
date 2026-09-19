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

const routes = read('resources/client/admin/admin-routes.tsx');
const queries = read(
  'resources/client/admin/digital-products/admin-digital-product-detail-queries.ts',
);
const page = read(
  'resources/client/admin/digital-products/admin-digital-product-detail-page.tsx',
);

describe('admin product detail page', () => {
  test('registers the detail route', () => {
    expect(routes).toContain("'digital-products/:productId'");
    expect(routes).toContain('admin-digital-product-detail-page');
  });

  test('queries the admin show endpoint', () => {
    expect(queries).toContain('/api/v1/admin/digital-products/${productId}');
  });

  test('renders Details and History panels', () => {
    expect(page).toContain('function DetailsPanel');
    expect(page).toContain('function HistoryPanel');
    expect(page).toContain('<Trans message="Details" />');
    expect(page).toContain('<Trans message="History" />');
  });

  test('consumes the history event fields', () => {
    expect(page).toContain('actor_role');
    expect(page).toContain('from_status');
    expect(page).toContain('to_status');
  });
});

describe('admin product pending changes', () => {
  test('renders a Pending changes card from the resource', () => {
    expect(page).toContain('<Trans message="Pending changes" />');
    expect(page).toContain('pending_changes');
    expect(page).toContain('change.before');
    expect(page).toContain('change.after');
  });
});

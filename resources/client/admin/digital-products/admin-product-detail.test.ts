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
    expect(columns).toContain('to={`/admin/items/${product.id}`}');
  });

  test('row actions link to the detail and reviews pages', () => {
    expect(columns).toContain('<Link to={`/admin/items/${product.id}`} />');
    expect(columns).toContain(
      '<Link to={`/admin/items/${product.id}/reviews`} />',
    );
  });

  test('details menu navigates while quick review opens the dialog', () => {
    expect(columns).toContain('<Trans message="Quick review" />');
    expect(columns).toContain('setDetailsOpen(true)');
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
    expect(routes).toContain("'items/:productId'");
    expect(routes).toContain('admin-digital-product-detail-page');
  });

  test('queries the admin show endpoint', () => {
    expect(queries).toContain('/api/v1/admin/items/${productId}');
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

describe('admin product statistics tab', () => {
  test('renders a Statistics tab alongside Details and History', () => {
    expect(page).toContain('<Tabs.Tab value="statistics">');
    expect(page).toContain('<Trans message="Statistics" />');
    expect(page).toContain('<Tabs.Panel value="statistics">');
  });

  test('mounts the shared statistics panel hitting the admin endpoint', () => {
    expect(page).toContain(
      "import {StatisticsPanel} from '@app/digital-products/shared/product-statistics/statistics-panel'",
    );
    expect(page).toContain('<StatisticsPanel');
    expect(page).toContain("'adminProductStatistics'");
    expect(page).toContain(
      '`/api/v1/admin/items/${product.id}/statistics`',
    );
  });
});

describe('admin product reviews tab', () => {
  test('renders a Reviews tab alongside Details, History and Statistics', () => {
    expect(page).toContain('<Tabs.Tab value="reviews">');
    expect(page).toContain('<Trans message="Reviews" />');
    expect(page).toContain('<Tabs.Panel value="reviews">');
  });

  test('mounts the shared reviews table for the product', () => {
    expect(page).toContain(
      "import {AdminProductReviewsTable} from './admin-product-reviews-table'",
    );
    expect(page).toContain('<AdminProductReviewsTable');
    expect(page).toContain('productId={String(product.id)}');
  });
});

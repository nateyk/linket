import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(relative), 'utf8');

const routes = read('resources/client/dashboard/dashboard-routes.tsx');
const page = read(
  'resources/client/dashboard/digital-products/product-statistics-page.tsx',
);

describe('creator product statistics page', () => {
  test('registers the per-product statistics route with a lazy import', () => {
    expect(routes).toContain("path: 'my-products/:productId/statistics'");
    expect(routes).toContain(
      "import('@app/dashboard/digital-products/product-statistics-page')",
    );
  });

  test('page renders the dashboard layout shell with a Statistics title', () => {
    expect(page).toContain('export function Component()');
    expect(page).toContain('<DashboardLayout.MainSection>');
    expect(page).toContain('<Trans message="Statistics" />');
  });

  test('page wires the creator statistics endpoint into the shared panel', () => {
    expect(page).toContain('<StatisticsPanel');
    expect(page).toContain(
      "import {StatisticsPanel} from '@app/digital-products/shared/product-statistics/statistics-panel'",
    );
    expect(page).toContain("'creatorProductStatistics'");
    expect(page).toContain(
      '`/api/v1/digital-products/${productId}/statistics`',
    );
  });

  test('page resolves the product id from route params', () => {
    expect(page).toContain('useParams()');
    expect(page).toContain('productId');
  });
});
import fs from 'node:fs';
import path from 'node:path';
import {describe, test, expect} from 'vitest';

const sidebar = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/admin/admin-sidebar.tsx',
  ),
  'utf8',
);

describe('admin sidebar products navigation', () => {
  test('points the products section at the renamed items path', () => {
    expect(sidebar).toContain("DIGITAL_PRODUCTS_PATH = '/admin/items'");
  });

  test('keeps no stale digital-products links', () => {
    expect(sidebar).not.toContain('/admin/digital-products');
  });
});

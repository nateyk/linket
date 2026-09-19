import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('common/foundation/resources/client/admin/admin-sidebar.tsx'),
  'utf8',
);

describe('admin products navigation', () => {
  test('renders a Products group with All and Updated items', () => {
    expect(source).toContain('<Trans message="Products" />');
    expect(source).toContain('<Trans message="All products" />');
    expect(source).toContain('<Trans message="Updated" />');
  });

  test('links Updated to the updated scope', () => {
    expect(source).toContain('?scope=updated');
  });

  test('uses a collapsible group and filters the flat config item', () => {
    expect(source).toContain('CollapsibleTrigger');
    expect(source).toContain('item.action !== DIGITAL_PRODUCTS_PATH');
  });
});

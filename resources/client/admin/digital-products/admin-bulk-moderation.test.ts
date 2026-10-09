import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-page.tsx',
  ),
  'utf8',
);

describe('admin bulk product moderation', () => {
  test('wires table selection into the page', () => {
    expect(source).toContain('selectedRows: selectedIds');
    expect(source).toContain('onSelectedRowsChange: setSelectedIds');
  });

  test('calls the bulk endpoints', () => {
    expect(source).toContain('/api/v1/admin/items/bulk-approve');
    expect(source).toContain('/api/v1/admin/items/bulk-reject');
    expect(source).toContain('bulkReason');
  });

  test('renders the action bar', () => {
    expect(source).toContain(':count selected');
    expect(source).toContain('<Trans message="Approve" />');
    expect(source).toContain('<Trans message="Reject" />');
  });
});

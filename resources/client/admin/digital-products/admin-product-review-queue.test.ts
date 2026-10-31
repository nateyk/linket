import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const queries = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-queries.ts',
  ),
  'utf8',
);
const page = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-page.tsx',
  ),
  'utf8',
);
const columns = fs.readFileSync(
  path.resolve(
    'resources/client/admin/digital-products/admin-digital-products-datatable-columns.tsx',
  ),
  'utf8',
);

describe('admin product review queue', () => {
  test('passes the updated scope to the API', () => {
    expect(queries).toContain('scope: params.scope');
  });

  test('renders an Updates pending metric from counters', () => {
    expect(page).toContain('counters?.updated');
    expect(page).toContain('counters?.published');
    expect(page).toContain('Updates pending');
    expect(page).toContain('Published');
    expect(page).toContain('parseAsString');
  });

  test('allows approve/reject on updated rows', () => {
    expect(columns).toContain('has_pending_update');
    expect(columns).toContain('isActionable');
    expect(columns).toContain('/re-review');
  });
});

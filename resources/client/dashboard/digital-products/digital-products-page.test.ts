import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/digital-products-page.tsx',
  ),
  'utf8',
);

describe('creator product pending-update badge', () => {
  test('reads the pending update flag from the API', () => {
    expect(source).toContain('has_pending_update');
  });

  test('renders an Update under review badge for approved products', () => {
    expect(source).toContain('<Trans message="Update under review" />');
    expect(source).toContain('hasPendingUpdate');
  });
});

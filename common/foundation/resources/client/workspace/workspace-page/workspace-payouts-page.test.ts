import fs from 'node:fs';
import path from 'node:path';
import {describe, test, expect} from 'vitest';

const page = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/workspace/workspace-page/workspace-payouts-page.tsx',
  ),
  'utf8',
);

describe('workspace payouts page', () => {
  test('loads withdrawal methods from the renamed items endpoint', () => {
    expect(page).toContain('/api/v1/items/withdrawal-methods');
  });

  test('keeps no stale digital-products api calls', () => {
    expect(page).not.toContain('/api/v1/digital-products');
  });
});

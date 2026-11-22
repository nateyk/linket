import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/shared/product-statistics/statistics-panel.tsx',
  ),
  'utf8',
);

describe('StatisticsPanel error state', () => {
  test('surfaces load failures instead of returning null', () => {
    expect(source).toContain('isError');
    expect(source).toContain("Couldn't load statistics.");
    expect(source).toContain('refetch');
    expect(source).not.toMatch(/if\s*\(!data\)\s*\{\s*return null;/);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('public course curriculum', () => {
  test('loads curriculum through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toContain(
      "import {apiClient} from '@common/http/query-client';",
    );
    expect(page).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/public\/courses\/\$\{courseId\}\/curriculum`\s*,?\s*\)/,
    );
  });
});

describe('public order status polling', () => {
  test('polls order status through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toMatch(/await apiClient\.get\(\s*data\.status_endpoint\s*\)/);
  });
});

describe('public checkout', () => {
  test('starts checkout through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toMatch(
      /await apiClient\.post\(\s*data\.checkout_endpoint/,
    );
    expect(page).toMatch(
      /`\/api\/v1\/digital-products\/\$\{data\.product\.id\}\/checkout`/,
    );
  });
});

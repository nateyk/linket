import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('storefront dashboard data loading', () => {
  test('loads products, sales, and payouts through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/storefront/storefront-dashboard-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /apiClient\.get\(\s*`\/api\/v1\/storefront\/products\?page=\$\{productsPage\}`\s*\)/,
    );
    expect(source).toMatch(
      /apiClient\.get\(\s*'\/api\/v1\/storefront\/sales'\s*\)/,
    );
    expect(source).toMatch(
      /apiClient\.get\(\s*`\/api\/v1\/storefront\/payout-requests\?page=\$\{payoutsPage\}`\s*\)/,
    );
    expect(source).not.toContain('storefrontFetch');
  });
});

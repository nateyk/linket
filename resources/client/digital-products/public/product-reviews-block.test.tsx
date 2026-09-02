import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('public product reviews', () => {
  test('loads reviews through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/product-reviews-block.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.get(?:<ReviewsResponse>)?\(\s*baseUrl\s*,?\s*\)/,
    );
  });
});

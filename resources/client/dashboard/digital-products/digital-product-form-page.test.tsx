import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('digital product form submission', () => {
  test('uses the saved resource from the API data envelope when submitting', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/digital-product-form-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('const saved = response.data.data as Product;');
    expect(source).toContain(
      'await apiClient.post(`/api/v1/digital-products/${saved.id}/submit`);',
    );
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('ShopWidgetRenderer product loading', () => {
  test('loads public store products through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('fetch(');
    expect(source).toContain(
      "import {apiClient} from '@common/http/query-client';",
    );
    expect(source).toMatch(
      /apiClient\s*\.get\(\s*`\/api\/v1\/public\/stores\/\$\{storeId\}\/digital-products`\s*,?\s*\)/,
    );
  });
});

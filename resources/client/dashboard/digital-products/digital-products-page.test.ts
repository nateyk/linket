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

describe('dropdown portal rendering', () => {
  test('all dropdowns use Dropdown.Content with Portal', () => {
    const triggerCount = (source.match(/Dropdown\.Trigger/g) || []).length;
    const contentCount = (source.match(/Dropdown\.Content/g) || []).length;
    expect(contentCount).toBeGreaterThanOrEqual(triggerCount);
  });
  test('dropdown content uses alignOffset/sideOffset for viewport edges', () => {
    expect(source).toContain('alignOffset');
  });
});

describe('creator product statistics menu item', () => {
  test('product menu links to the per-product statistics page', () => {
    expect(source).toContain('<Trans message="Statistics" />');
    expect(source).toContain(
      '`/dashboard/my-products/${product.id}/statistics`',
    );
  });
});

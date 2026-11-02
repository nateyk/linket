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

describe('creator product dashboard lifecycle controls', () => {
  test('supports search, status filter, sort and pagination params', () => {
    expect(source).toContain('params: {');
    expect(source).toContain('search: search.trim() || undefined');
    expect(source).toContain('status: status || undefined');
    expect(source).toContain('sort: sort || undefined');
    expect(source).toContain('per_page: 12');
    expect(source).toContain('<Trans message="Previous" />');
    expect(source).toContain('<Trans message="Next" />');
  });

  test('exposes duplicate, archive, restore and sales-safe delete actions', () => {
    expect(source).toContain('/duplicate');
    expect(source).toContain('/archive');
    expect(source).toContain('/unarchive');
    expect(source).toContain('<Trans message="Duplicate" />');
    expect(source).toContain('<Trans message="Archive" />');
    expect(source).toContain('<Trans message="Restore to draft" />');
    expect(source).toContain('<Trans message="Delete blocked after sales" />');
    expect(source).toContain('<Trans message="Resubmit for review" />');
    expect(source).toContain('gross_revenue_cents');
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
      '`/dashboard/items/${product.id}/statistics`',
    );
  });
});

describe('product card visual hierarchy', () => {
  test('covers stay still and resting cards stay flat', () => {
    expect(source).not.toContain('group-hover:scale');
    expect(source).not.toContain('hover:scale-');
    expect(source).not.toContain('hover:shadow-md');
    expect(source).not.toContain('shadow-xs transition-shadow');
  });

  test('status lives in product content instead of floating on the cover', () => {
    expect(source).not.toContain('absolute top-3 left-3');
    expect(source).toContain('<StatusBadge');
  });
});

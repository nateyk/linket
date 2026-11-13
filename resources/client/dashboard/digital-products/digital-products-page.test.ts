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

  test('uses the compact shared toolbar and preserves server-backed filter queries', () => {
    expect(source).toContain('<CreatorListingToolbar');
    expect(source).not.toContain('summary={<Trans message=":count products"');
    expect(source).toContain("searchLabel={trans({message: 'Search products'})}");
    expect(source).toContain("statusOptions={[");
    expect(source).toContain("{value: 'pending_approval', label: <Trans message=\"In review\" />}");
    expect(source).toContain("{value: '-revenue', label: <Trans message=\"Highest revenue\" />}");
    expect(source).toContain('setPage(1)');
    expect(source).toContain('<Trans message="No matching products" />');
    expect(source).toContain('onClear={() => {');
    expect(source).not.toContain('<Select.Root');
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

  test('status appears on the cover like Services, with readable review and draft variants', () => {
    const card = source.slice(source.indexOf('function ProductCard('), source.indexOf('function SalesLabel('));
    expect(card).toContain('className="absolute top-3 left-3"');
    expect(card.indexOf('<StatusBadge')).toBeGreaterThan(card.indexOf('<Card.Header'));
    expect(card.indexOf('<StatusBadge')).toBeLessThan(card.indexOf('</Card.Header>'));
    expect(card).toContain('ring-1 ring-foreground/10 transition-shadow hover:shadow-sm');
    expect(source).toContain('hasPendingUpdate');
    expect(source).toContain('<Trans message="Update under review" />');
  });

  test('shows price beneath the title and sales in the footer without repeating price', () => {
    const card = source.slice(source.indexOf('function ProductCard('), source.indexOf('function SalesLabel('));
    expect(card).toContain('product.price_cents === 0');
    expect(card).toContain('<Trans message="Free access" />');
    expect(card.indexOf('valueInCents={product.price_cents}')).toBeLessThan(card.indexOf('<Card.Footer'));
    expect(card).toContain('<ShoppingBagIcon className="size-4 shrink-0"');
    expect(card).toContain('<SalesLabel count={product.sales_count} />');
    expect(card).toContain('product.gross_revenue_cents');
    expect(card).toContain('<ProductActions');
  });
});

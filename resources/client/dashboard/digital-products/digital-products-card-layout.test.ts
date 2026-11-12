import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/digital-products/digital-products-page.tsx'),
  'utf8',
);
const card = source.slice(source.indexOf('function ProductCard('), source.indexOf('function SalesLabel('));

describe('My Products and My Services card parity', () => {
  test('status is over the product cover, not a second row below the image', () => {
    expect(card).toContain('className="absolute top-3 left-3"');
    expect(card.indexOf('<StatusBadge')).toBeGreaterThan(card.indexOf('<Card.Header'));
    expect(card.indexOf('<StatusBadge')).toBeLessThan(card.indexOf('</Card.Header>'));
    expect(card).toContain('ring-1 ring-foreground/10 transition-shadow hover:shadow-sm');
  });

  test('keeps title, price and sales in separate concise positions', () => {
    expect(card).toContain('product.price_cents === 0');
    expect(card).toContain('<Trans message="Free access" />');
    expect(card.indexOf('valueInCents={product.price_cents}')).toBeLessThan(card.indexOf('<Card.Footer'));
    expect(card).toContain('<ShoppingBagIcon className="size-4 shrink-0"');
    expect(card).toContain('<SalesLabel count={product.sales_count} />');
    expect(card).toContain('product.gross_revenue_cents');
  });

  test('preserves edit, public link and actions for both course and file products', () => {
    expect(card).toContain("product.type === 'course' || product.is_course");
    expect(card).toContain('to={editPath}');
    expect(card).toContain('<ProductActions');
    expect(card).toContain('onDuplicate={onDuplicate}');
    expect(card).toContain('onArchive={onArchive}');
    expect(card).toContain('onDelete={onDelete}');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('common/foundation/resources/client/admin/admin-sidebar.tsx'),
  'utf8',
);

const itemsPageSource = fs.readFileSync(
  path.resolve('resources/client/admin/digital-products/admin-digital-products-page.tsx'),
  'utf8',
);

describe('admin Items navigation', () => {
  test('renders one direct Items link without a Products dropdown', () => {
    expect(source).toContain('render={<NavLink to={DIGITAL_PRODUCTS_PATH} />}');
    expect(source).toContain('<Trans message="Items" />');
    expect(source).not.toContain('CollapsibleTrigger');
    expect(source).not.toContain('<Trans message="All products" />');
    expect(source).not.toContain('<Trans message="Products" />');
  });

  test('keeps the configured Items entry filtered to avoid duplicate links', () => {
    expect(source).toContain('item.action !== DIGITAL_PRODUCTS_PATH');
  });

  test('shows All items and Updated as tabs on the Items page', () => {
    expect(itemsPageSource).toContain('<Tabs.Tab value="all">');
    expect(itemsPageSource).toContain('<Trans message="All items" />');
    expect(itemsPageSource).toContain('<Tabs.Tab value="updated">');
    expect(itemsPageSource).toContain('<Trans message="Updated" />');
    expect(itemsPageSource).toContain("scope: value === 'updated' ? 'updated' : null");
    expect(itemsPageSource).toContain('{resetPage: true}');
  });
});

describe('admin payout accounts', () => {
  test('shows a dedicated sidebar entry instead of the legacy review panel', () => {
    expect(source).toContain('to="/admin/payout-accounts"');
    expect(source).toContain('<Trans message="Payout accounts" />');
  });
});

describe('admin financial navigation consolidation', () => {
  test('filters obsolete separate financial items from main sidebar menu', () => {
    expect(source).toContain('isObsoleteAdminSidebarItem');
  });

  test('renders a single Financial fallback link if not in menu config', () => {
    expect(source).toContain('<Trans message="Financial" />');
    expect(source).toContain('render={<NavLink to="/admin/financial" />}');
  });

  test('does not render separate obsolete financial fallback items', () => {
    expect(source).not.toContain('!hasPaymentGateways');
    expect(source).not.toContain('!hasWithdrawalMethods');
    expect(source).not.toContain('!hasTransactions');
    expect(source).not.toContain('!hasWithdrawals');
  });
});

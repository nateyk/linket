import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('common/foundation/resources/client/admin/admin-sidebar.tsx'),
  'utf8',
);

describe('admin products navigation', () => {
  test('renders a Products group with All and Updated items', () => {
    expect(source).toContain('<Trans message="Products" />');
    expect(source).toContain('<Trans message="All products" />');
    expect(source).toContain('<Trans message="Updated" />');
  });

  test('links Updated to the updated scope', () => {
    expect(source).toContain('?scope=updated');
  });

  test('uses a collapsible group and filters the flat config item', () => {
    expect(source).toContain('CollapsibleTrigger');
    expect(source).toContain('item.action !== DIGITAL_PRODUCTS_PATH');
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

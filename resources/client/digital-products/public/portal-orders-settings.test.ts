import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const ordersTable = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/portal-orders-table.tsx',
  ),
  'utf8',
);
const settings = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/portal-settings-panel.tsx',
  ),
  'utf8',
);
const sidebar = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/my-portal-sidebar.tsx',
  ),
  'utf8',
);

describe('portal orders + settings', () => {
  test('orders table uses history columns and receipt actions', () => {
    expect(ordersTable).toContain('Order history');
    expect(ordersTable).toContain('<Trans message="Receipt" />');
    expect(ordersTable).toContain('<Trans message="Paid" />');
    expect(ordersTable).not.toContain('@app/account-settings');
  });

  test('settings panel links out and stays isolated from account-settings modules', () => {
    expect(settings).toContain('/account-settings');
    expect(settings).toContain('Open account settings');
    expect(settings).toContain('Switch email');
    expect(settings).not.toContain('@app/account-settings');
    expect(sidebar).toContain("onSectionChange('settings')");
    expect(sidebar).not.toContain('render={<Link to="/account-settings" />}');
  });
});

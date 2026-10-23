import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const layout = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/portal-library-layout.tsx',
  ),
  'utf8',
);
const section = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/portal-section-layout.tsx',
  ),
  'utf8',
);
const sidebar = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/my-portal-sidebar.tsx',
  ),
  'utf8',
);
const library = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/my-portal-library.tsx',
  ),
  'utf8',
);
const orderLookup = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/order-lookup-page.tsx',
  ),
  'utf8',
);

describe('portal library dashboard shell isolation', () => {
  test('uses a dedicated DashboardLayout name, not account-settings modules', () => {
    expect(layout).toContain('linket-my-portal');
    expect(layout).toContain('DashboardLayout.Root');
    expect(layout).not.toContain('@app/account-settings');
    expect(section).toContain('DashboardLayout.MainSection');
    expect(section).not.toContain('@app/account-settings');
    expect(sidebar).not.toContain('@app/account-settings');
    expect(library).not.toContain('@app/account-settings');
    expect(orderLookup).not.toContain('@app/account-settings');
    expect(library).toContain('PortalLibraryLayout');
    expect(orderLookup).toContain('MyPortalLibrary');
  });
});

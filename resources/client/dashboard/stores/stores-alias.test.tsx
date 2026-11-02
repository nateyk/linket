import {describe, test, expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('stores alias (Task 4)', () => {
  test('query keys alias', async () => {
    const {biolinksBaseKey} = await import(
      '@app/dashboard/biolink/biolinks-queries'
    );
    const {storesBaseKey} = await import(
      '@app/dashboard/stores/stores-queries'
    );
    expect(biolinksBaseKey).toEqual(storesBaseKey);
    expect(storesBaseKey).toEqual(['stores']);
  });

  test('use-selected alias', async () => {
    const biolink = await import('@app/dashboard/biolink/use-selected-biolink-id');
    const stores = await import('@app/dashboard/stores/use-selected-store-id');
    expect((biolink as any).useSelectedBiolinkId).toBeDefined();
    expect((stores as any).useSelectedStoreId).toBeDefined();
    expect((biolink as any).useSelectedBiolinkId).toEqual(
      (stores as any).useSelectedStoreId,
    );
  });

  test('editor loads at new path (filesystem)', () => {
    const storeEditorDir = path.resolve('resources/client/dashboard/stores/store-editor');
    expect(fs.existsSync(storeEditorDir)).toBe(true);
    const pagePath = path.join(storeEditorDir, 'store-editor-page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
    const content = fs.readFileSync(pagePath, 'utf8');
    expect(content.length).toBeGreaterThan(1000);
    // legacy alias should exist
    const legacyPath = path.resolve('resources/client/dashboard/biolink/biolink-editor/biolink-editor-page.tsx');
    expect(fs.existsSync(legacyPath)).toBe(true);
    const legacyContent = fs.readFileSync(legacyPath, 'utf8');
    expect(legacyContent).toContain("export * from '../../stores/store-editor/store-editor-page'");
  }, 10000);

  test('stores page loads at new path', async () => {
    const mod = await import('@app/dashboard/stores/stores-page');
    expect(mod.Component).toBeDefined();
    const legacy = await import('@app/dashboard/biolink/biolinks-page');
    expect(legacy.Component).toBeDefined();
  }, 10000);

  test('dashboard routes use stores canonical', async () => {
    const {dashboardRoutes, sharedDashboardRoutes} = await import(
      '@app/dashboard/dashboard-routes'
    );
    const strs = (dashboardRoutes[0] as any).children.map((c: any) => c.path);
    expect(strs).toContain('stores');
    expect(strs).toContain('biolinks');
    const shared = sharedDashboardRoutes('dashboard').map((r: any) => r.path);
    expect(shared).toContain('stores/:storeId');
    expect(shared).toContain('biolinks/:biolinkId');
  });

  test('internal nav uses /stores (stores-page)', () => {
    const content = fs.readFileSync(path.resolve('resources/client/dashboard/stores/stores-page.tsx'), 'utf8');
    expect(content).toContain('/stores/');
    expect(content).not.toContain('/biolinks/');
  });

  test('profile edit is grouped into the row action menu', () => {
    const content = fs.readFileSync(
      path.resolve('resources/client/dashboard/stores/stores-page.tsx'),
      'utf8',
    );
    expect(content).toContain('<Trans message="Edit profile" />');
    expect(content).toContain('<Dropdown.Item onClick={onClick}>');
    expect(content).not.toContain('<Trans message="Edit" />');
  });


  test('internal nav uses /stores (store-editor-page)', () => {
    const content = fs.readFileSync(path.resolve('resources/client/dashboard/stores/store-editor/store-editor-page.tsx'), 'utf8');
    expect(content).toContain('/stores/');
    expect(content).toContain("['storeId']");
    expect(content).not.toContain("['biolinkId']");
  });
});

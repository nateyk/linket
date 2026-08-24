import {dashboardRoutes, sharedDashboardRoutes} from '@app/dashboard/dashboard-routes';
import {describe, test, expect} from 'vitest';

describe('dashboard routes aliases', () => {
  test('canonical stores and legacy biolinks redirect', () => {
    const strs = dashboardRoutes[0].children!.map((c: any) => c.path);
    expect(strs).toContain('stores');
    // legacy should still exist as redirect
    expect(strs).toContain('biolinks');
  });

  test('sharedDashboardRoutes includes canonical stores/:storeId and legacy biolinks/:biolinkId', () => {
    const shared = sharedDashboardRoutes('dashboard').map((r: any) => r.path);
    expect(shared).toContain('stores/:storeId');
    expect(shared).toContain('biolinks/:biolinkId');
  });

  test('sharedDashboardRoutes admin also aliases', () => {
    const sharedAdmin = sharedDashboardRoutes('admin').map((r: any) => r.path);
    expect(sharedAdmin).toContain('stores/:storeId');
    expect(sharedAdmin).toContain('biolinks/:biolinkId');
  });

  test('dashboard stores loader uses storesBaseKey', async () => {
    const {storesBaseKey, biolinksBaseKey} = await import(
      '@app/dashboard/stores/stores-queries'
    );
    expect(storesBaseKey).toEqual(['stores']);
    expect(biolinksBaseKey).toEqual(['stores']);
    expect(biolinksBaseKey).toEqual(storesBaseKey);
  });
});

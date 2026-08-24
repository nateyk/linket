import {dashboardRoutes, sharedDashboardRoutes} from '@app/dashboard/dashboard-routes';
import {describe, test, expect} from 'vitest';

describe('dashboard routes aliases', () => {
  test('canonical stores and legacy biolinks redirect', () => {
    const strs = dashboardRoutes[0].children!.map((c: any) => c.path);
    expect(strs).toContain('stores');
    expect(strs).toContain('biolinks');
  });

  test('sharedDashboardRoutes includes canonical stores/:storeId and legacy biolinks/:biolinkId', () => {
    const shared = sharedDashboardRoutes('dashboard').map((r: any) => r.path);
    expect(shared).toContain('stores/:storeId');
    expect(shared).toContain('biolinks/:biolinkId');
  });
});

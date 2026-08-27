import {
  dashboardRoutes,
  sharedDashboardRoutes,
} from '@app/dashboard/dashboard-routes';
import {describe, test, expect} from 'vitest';

describe('storefront-first IA hardening — creator hides legacy link tools (Task 9)', () => {
  const legacyPaths = [
    'links',
    'links/:linkId',
    'qr-codes',
    'qr-codes/:qrCodeId',
    'folders',
    'folders/:folderId',
    'folders/:folderId/links/:linkId',
    'folders/:folderId/links/:linkId/edit',
    'custom-domains',
    'custom-domains/:domainId',
    'link-overlays',
    'link-overlays/new',
    'link-overlays/:overlayId',
    'link-pages',
    'link-pages/new',
    'link-pages/:pageId',
  ];

  test('creator dashboard does not expose admin link tools', () => {
    const dashboardPaths = sharedDashboardRoutes('dashboard').map(
      (r: any) => r.path,
    );
    for (const p of legacyPaths) {
      expect(dashboardPaths, `dashboard must not expose "${p}"`).not.toContain(
        p,
      );
    }
  });

  test('creator dashboard keeps storefront + pixels (and legacy biolink redirect)', () => {
    const paths = sharedDashboardRoutes('dashboard').map((r: any) => r.path);
    expect(paths).toContain('stores/:storeId');
    expect(paths).toContain('biolinks/:biolinkId');
    expect(paths).toContain('pixels');
  });

  test('admin retains legacy link tools', () => {
    const adminPaths = sharedDashboardRoutes('admin').map((r: any) => r.path);
    for (const p of legacyPaths) {
      expect(adminPaths, `admin must retain "${p}"`).toContain(p);
    }
    expect(adminPaths).toContain('pixels');
    expect(adminPaths).toContain('stores/:storeId');
    expect(adminPaths).toContain('biolinks/:biolinkId');
  });

  test('dashboard top-level nav is storefront-first (menus already correct)', async () => {
    // validates the dashboardRoutes children include stores + biolinks redirect, not legacy top-level links
    const children = dashboardRoutes[0].children!.map((c: any) => c.path);
    expect(children).toContain('stores');
    expect(children).toContain('biolinks');
    expect(children).not.toContain('links');
    expect(children).not.toContain('folders');
  });
});

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
    const {storesBaseKey, biolinksBaseKey} =
      await import('@app/dashboard/stores/stores-queries');
    expect(storesBaseKey).toEqual(['stores']);
    expect(biolinksBaseKey).toEqual(['stores']);
    expect(biolinksBaseKey).toEqual(storesBaseKey);
  });
});

describe('course product creation', () => {
  test('uses a dedicated course creation route', () => {
    const paths = dashboardRoutes[0].children!.map(route => route.path);

    expect(paths).toContain('my-products/new/course');
  });

  test('uses a dedicated course analytics route', () => {
    const paths = dashboardRoutes[0].children!.map(route => route.path);

    expect(paths).toContain('my-products/:productId/course/analytics');
  });
});

describe('buyer course routes', () => {
  test('does not expose learner pages in the seller dashboard', () => {
    const paths = dashboardRoutes[0].children!.map(route => route.path);

    expect(paths).not.toContain('my-courses');
    expect(paths).not.toContain('learn/:courseId');
    expect(paths).not.toContain('learn/:courseId/lessons/:lessonId');
  });
});

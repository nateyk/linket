import {
  dashboardRoutes,
  normalizeHomepageValue,
  sharedDashboardRoutes,
} from '@app/dashboard/dashboard-routes';
import {mergeBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import fs from 'node:fs';
import {afterEach, describe, test, expect} from 'vitest';

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

  test('orders is canonical and legacy sales routes redirect with filters', async () => {
    const children = dashboardRoutes[0].children!;
    expect(children.map(c => c.path)).toContain('orders');

    for (const path of ['sales-payouts', 'sales-payments']) {
      const route = children.find(c => c.path === path) as any;
      expect(route).toBeTruthy();
      expect(route.lazy).toBeUndefined();

      const redirected = await route.loader({
        request: {
          url: `http://localhost/dashboard/${path}?status=manual_review&page=2`,
        },
      });
      expect(redirected.headers.get('Location')).toBe(
        '/dashboard/orders?status=manual_review&page=2',
      );
    }
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

    expect(paths).toContain('items/new/course');
  });

  test('uses a dedicated course analytics route', () => {
    const paths = dashboardRoutes[0].children!.map(route => route.path);

    expect(paths).toContain('items/:productId/course/analytics');
  });

  test('loads course analytics only through the dashboard route tree', () => {
    const appRouterSource = fs.readFileSync(
      'resources/client/app-router.tsx',
      'utf8',
    );

    expect(appRouterSource).not.toContain('CourseAnalyticsPage');
    expect(appRouterSource).not.toContain(
      "path: 'dashboard/items/:productId/course/analytics'",
    );
  });

  test('course redirect forwards wizard params', async () => {
    const details = dashboardRoutes[0].children!.find(
      (r: any) => r.path === 'items/new/details',
    ) as any;
    const redirected = await details.loader({
      request: {
        url: 'http://localhost/dashboard/items/new/details?type=course&price_cents=1999&billing=paid',
      },
    });
    expect(redirected.headers.get('Location')).toBe(
      '/dashboard/items/new/course?price_cents=1999&billing=paid',
    );
    const passthrough = await details.loader({
      request: {
        url: 'http://localhost/dashboard/items/new/details?type=ebook',
      },
    });
    expect(passthrough).toBeNull();
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

describe('dashboard homepage setting', () => {
  const indexRoute = () =>
    dashboardRoutes[0].children!.find((r: any) => r.index) as any;

  afterEach(() => {
    mergeBootstrapData({settings: undefined} as any);
  });

  test('normalizeHomepageValue maps the legacy value to items', () => {
    expect(normalizeHomepageValue('digital-products')).toBe('items');
    expect(normalizeHomepageValue('items')).toBe('items');
    expect(normalizeHomepageValue('stores')).toBe('stores');
    expect(normalizeHomepageValue('sales-payouts')).toBe('orders');
    expect(normalizeHomepageValue('orders')).toBe('orders');
    expect(normalizeHomepageValue(undefined)).toBe('');
  });

  test('index loader redirects the old sales homepage to orders', async () => {
    mergeBootstrapData({settings: {dashboard: {homepage: 'sales-payouts'}}} as any);
    const redirected = await indexRoute().loader();
    expect(redirected.headers.get('Location')).toBe('/dashboard/orders');
  });

  test('index loader redirects a legacy stored homepage to items', async () => {
    mergeBootstrapData({settings: {dashboard: {homepage: 'digital-products'}}} as any);
    const redirected = await indexRoute().loader();
    expect(redirected.headers.get('Location')).toBe('/dashboard/items');
  });

  test('index loader redirects the renamed homepage to items', async () => {
    mergeBootstrapData({settings: {dashboard: {homepage: 'items'}}} as any);
    const redirected = await indexRoute().loader();
    expect(redirected.headers.get('Location')).toBe('/dashboard/items');
  });
});

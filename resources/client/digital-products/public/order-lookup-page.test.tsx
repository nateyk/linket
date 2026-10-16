import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/order-lookup-page.tsx',
  ),
  'utf8',
);
const libraryUi = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/my-portal-library-ui.tsx',
  ),
  'utf8',
);

describe('my-portal recovery', () => {
  test('requests and verifies codes through the shared API client', () => {
    expect(source).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-portal\/request-code'/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-portal\/verify-code'/,
    );
  });

  test('loads the portal library through the shared API client', () => {
    expect(source).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/public\/my-portal\/library'\s*\)/,
    );
  });
});

describe('my-portal protected actions', () => {
  test('handles downloads, receipts, and reviews through the shared API client', () => {
    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/downloads\/\$\{entitlement\.id\}`/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/resend-receipt`/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/review`/,
    );
    expect(source.match(/<RecoveryProblem error=\{error\} \/>/g)).toHaveLength(
      2,
    );
    expect(source).toContain('Enter the 6-digit code from your email.');
    expect(source).not.toContain('fill-amber-400');
    expect(source).not.toContain('certificate');
    expect(source).not.toContain('-mt-2');
  });
});

describe('my-portal library home', () => {
  test('renders a single scrolling library with continue, filters, and downloads', () => {
    expect(source).toContain('MyPortalLibrary');
    expect(source).toContain('PortalAccountLayout');
    expect(source).toContain('PortalContinueStrip');
    expect(source).toContain('PortalCourseFilters');
    expect(source).toContain('PortalCourseGrid');
    expect(source).toContain('DEMO_PORTAL_COURSES');
    expect(source).toContain('DEMO_DOWNLOAD_ORDERS');
    expect(source).toContain('portal-courses');
    expect(source).toContain('portal-downloads');
    expect(source).toContain('<Trans message="Downloads" />');
    expect(libraryUi).toContain('Continue learning');
    expect(libraryUi).toContain("['all', 'All']");
    expect(libraryUi).toContain("['in_progress', 'In progress']");
    expect(libraryUi).toContain("['completed', 'Completed']");
    expect(libraryUi).not.toContain('Wishlist');
    expect(libraryUi).not.toContain('$249');
    expect(libraryUi).not.toContain('View more');
    expect(source).toContain("apiClient.get('/api/v1/my-courses')");
    expect(source).toContain('/register');
  });
});

describe('my-portal account sidebar', () => {
  test('uses a sticky aside, mobile sheet, and Linket-only nav', () => {
    const sidebar = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/my-portal-sidebar.tsx',
      ),
      'utf8',
    );
    expect(sidebar).toContain('md:grid-cols-[220px_minmax(0,1fr)]');
    expect(sidebar).toContain('Account Menu');
    expect(sidebar).toContain('Purchased courses');
    expect(sidebar).toContain('Downloads');
    expect(sidebar).not.toContain('Wishlist');
    expect(sidebar).not.toContain('Create course');
    expect(sidebar).not.toContain('My certificates');
  });
});

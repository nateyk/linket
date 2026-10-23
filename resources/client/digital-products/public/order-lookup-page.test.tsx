import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (file: string) =>
  fs.readFileSync(
    path.resolve(`resources/client/digital-products/public/${file}`),
    'utf8',
  );

const entry = read('order-lookup-page.tsx');
const library = read('my-portal-library.tsx');
const recovery = read('portal-recovery.tsx');
const review = read('portal-review-dialog.tsx');
const libraryUi = read('my-portal-library-ui.tsx');

describe('my-portal recovery', () => {
  test('requests and verifies codes through the shared API client', () => {
    expect(recovery).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-portal\/request-code'/,
    );
    expect(recovery).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-portal\/verify-code'/,
    );
  });

  test('loads the portal library through the shared API client', () => {
    expect(library).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/public\/my-portal\/library'\s*\)/,
    );
  });
});

describe('my-portal protected actions', () => {
  test('handles downloads, receipts, and reviews through the shared API client', () => {
    expect(library).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/downloads\/\$\{entitlement\.id\}`/,
    );
    expect(library).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/resend-receipt`/,
    );
    expect(review).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-portal\/purchases\/\$\{order\.id\}\/review`/,
    );
    expect(recovery.match(/<RecoveryProblem error=\{error\} \/>/g)).toHaveLength(
      2,
    );
    expect(recovery).toContain('Enter the 6-digit code from your email.');
    expect(recovery).not.toContain('fill-amber-400');
    expect(recovery).not.toContain('certificate');
    expect(recovery).not.toContain('-mt-2');
  });
});

describe('my-portal library home', () => {
  test('renders a sectioned shell with overview, courses, and downloads', () => {
    expect(entry).toContain('MyPortalLibrary');
    expect(entry).toContain('RecoveryRequest');
    expect(library).toContain('PortalLibraryLayout');
    expect(library).toContain('PortalSidebar');
    expect(library).toContain('PortalSectionLayout');
    expect(library).toContain('PortalOverview');
    expect(library).toContain('parsePortalSection');
    expect(library).toContain('useSearchParams');
    expect(library).toContain('PortalCourseFilters');
    expect(library).toContain('PortalCourseGrid');
    expect(library).toContain('PortalEntitlementPack');
    expect(library).toContain('PortalOrdersTable');
    expect(library).toContain('PortalSettingsPanel');
    expect(library).toContain('DEMO_PORTAL_COURSES');
    expect(library).toContain('DEMO_DOWNLOAD_ORDERS');
    expect(library).toContain('DEMO_AUDIO_ORDERS');
    expect(library).toContain("activeSection === 'audio'");
    expect(library).toContain("activeSection === 'orders'");
    expect(library).toContain("activeSection === 'settings'");
    expect(library).toContain("activeSection === 'overview'");
    expect(library).toContain("activeSection === 'courses'");
    expect(library).toContain("activeSection === 'downloads'");
    expect(library).toContain('<Trans message="Downloads" />');
    expect(library).not.toContain('@app/account-settings');
    expect(entry).not.toContain('@app/account-settings');
    expect(libraryUi).toContain('Continue learning');
    expect(libraryUi).toContain('ToggleGroup');
    expect(libraryUi).toContain('value="all"');
    expect(libraryUi).toContain('value="in_progress"');
    expect(libraryUi).toContain('value="completed"');
    expect(libraryUi).toContain('estimateLessonsDone');
    expect(libraryUi).toContain('Review course');
    expect(libraryUi).toContain('sm:flex-row');
    expect(libraryUi).not.toContain('Wishlist');
    expect(libraryUi).not.toContain('$249');
    expect(libraryUi).not.toContain('View more');
    expect(libraryUi).not.toContain('min-[480px]:grid-cols-2');
    expect(library).toContain("apiClient.get('/api/v1/my-courses')");
    expect(library).toContain('/register');
  });
});

describe('my-portal account sidebar', () => {
  test('uses floating Sidebar primitives isolated from account-settings', () => {
    const sidebar = read('my-portal-sidebar.tsx');
    const shell = read('my-portal-shell.tsx');
    expect(sidebar).toContain('Sidebar.Root');
    expect(sidebar).toContain('PortalSidebar');
    expect(sidebar).toContain('Overview');
    expect(sidebar).toContain('My courses');
    expect(sidebar).toContain('Downloads');
    expect(sidebar).toContain('Audio library');
    expect(sidebar).toContain('Orders');
    expect(sidebar).toContain('Avatar.Root');
    expect(sidebar).not.toContain('@app/account-settings');
    expect(sidebar).not.toContain('Item.Group');
    expect(sidebar).not.toContain('Wishlist');
    expect(sidebar).not.toContain('Create course');
    expect(sidebar).not.toContain('My certificates');
    expect(shell).not.toContain('rounded-card bg-muted');
  });
});

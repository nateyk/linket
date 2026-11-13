import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(file), 'utf8');

const shell = read('common/foundation/resources/client/ui/dashboard/dashboard-layout.tsx');
const product = read('resources/client/dashboard/digital-products/digital-product-form-page.tsx');
const service = read('resources/client/dashboard/services/service-form-page.tsx');
const course = read('resources/client/dashboard/courses/create-course-page.tsx');
const store = read('resources/client/dashboard/stores/store-editor/store-editor-page.tsx');
const insights = read('resources/client/dashboard/reports/insights-page.tsx');
const overview = read('resources/client/dashboard/dashboard-home-page.tsx');
const products = read('resources/client/dashboard/digital-products/digital-products-page.tsx');
const links = read('resources/client/dashboard/links/link-details-page/link-details-page.tsx');
const folders = read('resources/client/dashboard/folders/folder-details-page/folder-details-page.tsx');
const qrCodes = read('resources/client/dashboard/qr-codes/qr-code-details-page/qr-code-details-page.tsx');

describe('dashboard header visual and semantic consistency', () => {
  test('shared header keeps one 56px divider and respects muted breadcrumb typography', () => {
    expect(shell).toContain('flex h-14 w-full min-w-0 shrink-0 items-center gap-2 border-b');
    expect(shell).not.toContain('data-[slot="breadcrumb"]:font-semibold');
    expect(shell).toContain('data-[slot="sidebar-toggle-button"]:-ms-1');
    expect(shell).toContain('text-2xl leading-8 font-semibold tracking-tight');
  });

  test.each([
    ['digital product', product, 'Back to products', '/dashboard/items'],
    ['service', service, 'Back to services', '/dashboard/services'],
    ['course', course, 'Back to products', '/dashboard/items'],
  ])('%s editor has one parent breadcrumb on desktop and a mobile back action', (_name, source, label, route) => {
    expect(source).toContain('<Breadcrumb className="w-auto max-lg:hidden">');
    expect(source).toContain('className="hidden size-4 shrink-0 text-muted-foreground rtl:rotate-180 lg:block"');
    expect(source).toContain(`aria-label={trans({message: '${label}'})}`);
    expect(source).toContain(`render={<Link to="${route}" />}`);
    expect(source).toContain('className="lg:hidden max-lg:size-11"');
    expect(source).toContain('render={<h1 />}');
    expect(source).toContain('ms-auto flex');
    expect(source).not.toContain('<Breadcrumb.Page');
  });

  test('service does not duplicate desktop back navigation and matches mobile title size', () => {
    expect(service).toContain('className="lg:hidden max-lg:size-11"');
    expect(service).toContain('max-lg:text-xl');
    expect(service).toContain('<Trans message="My Services" />');
  });

  test('Store Editor retains its selector and actions with a dividing rule and an accessible title', () => {
    expect(store).toContain('<DashboardLayout.SectionHeader>');
    expect(store).not.toContain('min-h-16 gap-2 border-none');
    expect(store.match(/<h1 className="sr-only">\{biolink.name\}<\/h1>/g)).toHaveLength(1);
    expect(store).toContain('className="me-auto min-w-0 max-w-64 shrink justify-between"');
    expect(store).toContain('<BiolinkSelector />');
    expect(store).toContain('<ShareLinkButton');
    expect(store).toContain('<Trans message="Save changes" />');
  });

  test('Insights uses the canonical header divider with semantic title and aligned tabs', () => {
    expect(insights).toContain('<DashboardLayout.SectionHeader className="max-md:h-auto max-md:flex-wrap max-md:py-2">');
    expect(insights).not.toContain('SectionHeader className="border-none"');
    expect(insights).not.toContain('compactOnMobile={false}');
    expect(insights).toContain('max-md:order-3 max-md:w-full max-md:justify-end');
    expect(insights).toContain('<DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>');
    expect(insights).toContain('className="mx-(--section-spacing) border-b"');
    expect(insights).toContain('ms-auto flex shrink-0 items-center gap-2');
  });

  test.each([
    ['link details', links],
    ['folder details', folders],
    ['QR code details', qrCodes],
  ])('%s keeps the shared header divider and aligns the following tabs', (_name, source) => {
    expect(source).toContain('<DashboardLayout.SectionHeader>');
    expect(source).not.toContain('SectionHeader className="border-none"');
    expect(source).toContain('className="mx-(--section-spacing) border-b"');
  });

  test('Overview and My Products use the same semantic page-heading primitive', () => {
    expect(overview).toContain('<DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>');
    expect(products).toContain('<DashboardLayout.SectionTitle render={<h1 />}>');
  });
});

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
const domains = read('resources/client/dashboard/custom-domains/domain-insights-page.tsx');
const newLinkPage = read('resources/client/dashboard/link-pages/create-link-page.tsx');
const editLinkPage = read('resources/client/dashboard/link-pages/edit-link-page.tsx');
const overlays = read('resources/client/dashboard/link-overlays/crupdate/crupdate-link-overlay-form.tsx');
const articleEditor = read('common/foundation/resources/client/article-editor/article-editor.tsx');

describe('dashboard header visual and semantic consistency', () => {
  test('shared header keeps one 56px divider and semantic title typography', () => {
    expect(shell).toContain('flex h-14 w-full min-w-0 shrink-0 items-center gap-2 border-b');
    expect(shell).not.toContain('data-[slot="breadcrumb"]:font-semibold');
    expect(shell).toContain('data-[slot="sidebar-toggle-button"]:-ms-1');
    expect(shell).toContain('text-2xl leading-8 font-semibold tracking-tight');
  });

  test.each([
    ['digital product', product, 'Back to products', '/dashboard/items'],
    ['service', service, 'Back to services', '/dashboard/services'],
    ['course', course, 'Back to products', '/dashboard/items'],
  ])('%s editor has a single H1 and accessible Back action, without breadcrumbs', (_name, source, label, route) => {
    expect(source).not.toContain('<Breadcrumb');
    expect(source).toContain(`aria-label={trans({message: '${label}'})}`);
    expect(source).toContain(`render={<Link to="${route}" />}`);
    expect(source).toContain('className="max-lg:size-11"');
    expect(source).toContain('render={<h1 />}');
    expect(source).toContain('ms-auto flex');
  });

  test('service and product editor titles have no Draft or Published badge', () => {
    const serviceTitle = service.split('<DashboardLayout.SectionTitle')[1]?.split('</DashboardLayout.SectionTitle>')[0];
    const productTitle = product.split('<DashboardLayout.SectionTitle')[1]?.split('</DashboardLayout.SectionTitle>')[0];
    expect(serviceTitle).toBeTruthy();
    expect(productTitle).toBeTruthy();
    expect(serviceTitle).not.toContain('<Badge');
    expect(productTitle).not.toContain('<ProductStatus');
    expect(service).toContain('max-lg:text-xl');
    expect(service).toContain('<Trans message="Create a service" />');
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
    ['link details', links, 'Back to links'],
    ['folder details', folders, 'Back to folders'],
    ['QR code details', qrCodes, 'Back to QR codes'],
    ['branded domain details', domains, 'Back to branded domains'],
  ])('%s uses a single title, accessible Back action, and no header breadcrumbs', (_name, source, label) => {
    expect(source).toContain('<DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">');
    expect(source).toContain('<DashboardLayout.SectionTitle render={<h1 />}');
    expect(source).toContain(`aria-label={trans({message: '${label}'})}`);
    expect(source).not.toContain('<Breadcrumb');
  });

  test.each([
    ['link details', links],
    ['folder details', folders],
    ['QR code details', qrCodes],
  ])('%s retains tabs aligned to the shared header divider', (_name, source) => {
    expect(source).not.toContain('SectionHeader className="border-none"');
    expect(source).toContain('className="mx-(--section-spacing) border-b"');
  });

  test('link page editors use a clear header label with accessible Back navigation', () => {
    expect(articleEditor).toContain('{backButton}');
    for (const source of [newLinkPage, editLinkPage]) {
      expect(source).not.toContain('<Breadcrumb');
      expect(source).toContain("aria-label={trans({message: 'Back to link pages'})}");
      expect(source).toContain('render={<Link to={`/${routeType}/link-pages`} />}');
    }
    // The editable article title is already an H1 in the document body.
    expect(newLinkPage).toContain('title={<Trans message="New link page" />}');
    expect(editLinkPage).toContain('title={<Trans message="Edit link page" />}');
  });

  test('link overlay editor uses the canonical divider and one H1 instead of breadcrumbs', () => {
    expect(overlays).toContain('<DashboardLayout.SectionHeader>');
    expect(overlays).toContain('<DashboardLayout.SectionTitle render={<h1 />}');
    expect(overlays).toContain("aria-label={trans({message: 'Back to overlays'})}");
    expect(overlays).not.toContain('<Breadcrumb');
    expect(overlays).not.toContain('SectionHeader className="border-none"');
  });

  test('Overview and My Products use the same semantic page-heading primitive', () => {
    expect(overview).toContain('<DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>');
    expect(products).toContain('<DashboardLayout.SectionTitle render={<h1 />}>');
  });
});

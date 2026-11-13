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
  test('shared header retains the canonical 56px divider and title typography for ordinary pages', () => {
    expect(shell).toContain('flex h-14 w-full min-w-0 shrink-0 items-center gap-2 border-b');
    expect(shell).not.toContain('data-[slot="breadcrumb"]:font-semibold');
    expect(shell).toContain('data-[slot="sidebar-toggle-button"]:-ms-1');
    expect(shell).toContain('text-2xl leading-8 font-semibold tracking-tight');
  });

  test.each([
    ['digital product', product, '/dashboard/items'],
    ['service', service, '/dashboard/services'],
    ['course', course, '/dashboard/items'],
  ])('%s editor uses parent › current-page breadcrumbs instead of a Back icon + large title', (_name, source, route) => {
    expect(source).toContain('<Breadcrumb.Root className="me-auto w-auto min-w-0 text-xl max-sm:me-0 max-sm:w-0 max-sm:flex-1 max-sm:overflow-hidden max-sm:text-sm">');
    expect(source).toContain(`<Breadcrumb.Link to="${route}">`);
    expect(source).toContain('<Breadcrumb.Separator />');
    expect(source).toContain('<Breadcrumb.Page className="max-sm:block max-sm:min-w-0 max-sm:truncate">');
    expect(source).toContain('max-sm:h-14 max-sm:flex-nowrap max-sm:gap-1 max-sm:px-2 max-sm:py-0');
    expect(source).toContain('max-sm:ms-0 max-sm:gap-1');
    expect(source).toContain('<h1 className="sr-only">');
    expect(source).not.toContain('<DashboardLayout.SectionTitle');
    expect(source).not.toContain('aria-label={trans({message: \'Back to');
    expect(source).toContain('ms-auto flex');
  });

  test('service and product headers keep status badges out of the title while preserving product review feedback', () => {
    const productHeader = product.split('</DashboardLayout.SectionHeader>')[0];
    const serviceHeader = service.split('</DashboardLayout.SectionHeader>')[0];
    expect(productHeader).not.toContain('<ProductStatus');
    expect(serviceHeader).not.toContain('<Badge');
    expect(product).toContain('hasPendingUpdate={product.has_pending_update === true}');
    expect(service).toContain('<Trans message="Create a service" />');
  });

  test('Store Editor retains its selector, divider, and accessible title', () => {
    expect(store).toContain('<DashboardLayout.SectionHeader>');
    expect(store).not.toContain('min-h-16 gap-2 border-none');
    expect(store).toContain('<h1 className="sr-only">{biolink.name}</h1>');
    expect(store).toContain('className="me-auto min-w-0 max-w-64 shrink justify-between"');
    expect(store).toContain('<BiolinkSelector />');
    expect(store).toContain('<ShareLinkButton');
    expect(store).toContain('<Trans message="Save changes" />');
  });

  test('Insights retains its canonical header, semantic title and tabs', () => {
    expect(insights).toContain('<DashboardLayout.SectionHeader className="max-md:h-auto max-md:flex-wrap max-md:py-2">');
    expect(insights).not.toContain('SectionHeader className="border-none"');
    expect(insights).not.toContain('compactOnMobile={false}');
    expect(insights).toContain('max-md:order-3 max-md:w-full max-md:justify-end');
    expect(insights).toContain('<DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>');
    expect(insights).toContain('className="mx-(--section-spacing) border-b"');
  });

  test.each([
    ['link', links, 'Links'],
    ['folder', folders, 'Folders'],
    ['QR code', qrCodes, 'QR codes'],
    ['branded domain', domains, 'Branded domains'],
  ])('%s details restore classic clickable breadcrumbs and a single hidden H1', (_name, source, label) => {
    expect(source).toContain('<DashboardLayout.SectionHeader className="max-sm:h-auto max-sm:flex-wrap max-sm:py-2">');
    expect(source).toContain('<h1 className="sr-only">');
    expect(source).toContain('<Breadcrumb.Root');
    expect(source).toContain(`<Trans message="${label}" />`);
    expect(source).toContain('<Breadcrumb.Separator />');
    expect(source).toContain('<Breadcrumb.Page>');
    expect(source).not.toContain('ArrowLeftIcon');
  });

  test.each([
    ['link', links],
    ['folder', folders],
    ['QR code', qrCodes],
  ])('%s details preserve aligned tabs', (_name, source) => {
    expect(source).toContain('className="mx-(--section-spacing) border-b"');
    expect(source).not.toContain('SectionHeader className="border-none"');
  });

  test('Link Page editors restore Link pages › New / Edit using the article editor', () => {
    expect(articleEditor).not.toContain('backButton');
    for (const source of [newLinkPage, editLinkPage]) {
      expect(source).toContain('<Breadcrumb.Root className="me-auto w-auto min-w-0 text-xl max-sm:text-sm">');
      expect(source).toContain('<Trans message="Link pages" />');
      expect(source).toContain('title={breadCrumb}');
      expect(source).not.toContain('backButton=');
    }
    expect(newLinkPage).toContain('<Trans message="New" />');
    expect(editLinkPage).toContain('<Trans message="Edit" />');
  });

  test('Overlay editing restores Overlays › Create / Update with canonical border', () => {
    expect(overlays).toContain('<DashboardLayout.SectionHeader>');
    expect(overlays).toContain('<Breadcrumb.Root className="me-auto w-auto min-w-0 text-base">');
    expect(overlays).toContain('<Trans message="Overlays" />');
    expect(overlays).toContain('<Breadcrumb.Page>');
    expect(overlays).toContain('<h1 className="sr-only">');
    expect(overlays).not.toContain('ArrowLeftIcon');
    expect(overlays).not.toContain('SectionHeader className="border-none"');
  });

  test('Overview and My Products continue using the ordinary H1 title primitive', () => {
    expect(overview).toContain('<DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>');
    expect(products).toContain('<DashboardLayout.SectionTitle render={<h1 />}>');
  });
});

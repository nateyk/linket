import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {resolveBiolinkButtonAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';

describe('ShopWidgetRenderer product loading', () => {
  test('loads public store products through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('fetch(');
    expect(source).toContain(
      "import {apiClient} from '@common/http/query-client';",
    );
    expect(source).toMatch(
      /apiClient\s*\.get\(\s*`\/api\/v1\/public\/stores\/\$\{storeId\}\/digital-products`\s*,?\s*\)/,
    );
  });
});

describe('ShopWidgetRenderer product action appearance', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx',
    ),
    'utf8',
  );

  test('paints the View action from the live appearance prop, not only saved biolink config', () => {
    expect(source).toContain('resolveBiolinkButtonAppearance');
    expect(source).toContain(
      "from '@app/short-links/renderers/biolink-renderer/biolink-appearance'",
    );
    expect(source).toContain('biolinkSurfaceEdgeClassName');
    // Preview posts a flat draft appearance; saved config alone misses live edits.
    expect(source).toMatch(
      /resolveBiolinkButtonAppearance\(\s*appearance \?\? biolink\.appearance\?\.config \?\? null,?\s*\)/,
    );
    expect(source).toContain('buttonAppearance.className');
    expect(source).toContain('style={buttonAppearance.style}');
  });

  test('keeps the action button size, link render, label and href', () => {
    expect(source).toContain('size="sm"');
    expect(source).toContain('variant="ghost"');
    expect(source).toContain('render={<a href={href} />}');
    expect(source).toContain('<Trans message="View" />');
  });

  test('keeps the card body clean: title, price and view button only', () => {
    expect(source).not.toContain('description=');
    expect(source).not.toContain('mediaOverlay=');
    expect(source).not.toContain('meta=');
    expect(source).not.toContain('ArrowRightIcon');
  });

  test('avoids dual CTAs and footer divider noise on storefront cards', () => {
    // View is the only product link; title is plain text.
    expect(source).not.toContain('titleHref=');
    expect(source).not.toContain('border-t border-[var(--biolink-border)]');
    // Landscape covers stay on ProductCard's aspect-video — never portrait 4/5.
    expect(source).not.toContain('aspect-[4/5]');
    expect(source).toContain('aspect-video');
  });

  test('teaches empty and error shop states instead of returning null', () => {
    expect(source).toContain('Nothing for sale yet');
    expect(source).toContain("Couldn't load products");
    expect(source).toContain('Empty.Root');
    expect(source).toContain('biolinkSurfaceEdgeClassName');
    expect(source).not.toContain('border-dashed');
    expect(source).not.toMatch(
      /if \(!products\.length \|\| !biolink\) return null/,
    );
  });

  test('exposes an inline retry action for load failures', () => {
    expect(source).toContain('const loadProducts = useCallback');
    expect(source).toContain('<Trans message="Retry" />');
    expect(source).toContain('onClick={loadProducts}');
    expect(source).not.toContain('Refresh the page and try again.');
  });

  test('labels the products section for assistive tech', () => {
    expect(source).toContain('aria-labelledby');
    expect(source).toContain("message('Products')");
    expect(source).toContain('min-h-9 pointer-coarse:min-h-11');
  });

  test('uses quiet product cards on the storefront', () => {
    expect(source).toMatch(/<ProductCard[\s\S]{0,80}?quiet/);
  });

  test('prefers a 2-up shop grid and only fits 3 when the column is wide', () => {
    expect(source).toContain('shopGridClassName');
    expect(source).toContain(
      'grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]',
    );
    expect(source).toContain('gap-4');
    // Fixed 3-up / full-bleed single-product overrides fight auto-fill sizing.
    expect(source).not.toContain('@4xl:grid-cols-3');
    expect(source).not.toContain("products.length === 1 && 'sm:grid-cols-1'");
  });

  test('falls back safely when the biolink carries no appearance', () => {
    // The dashboard-editor preview renders through this same renderer with no
    // appearance: the `?? null` call above must resolve theme defaults.
    for (const appearance of [null, undefined] as const) {
      const resolved = resolveBiolinkButtonAppearance(appearance);
      expect(resolved.className).toContain(
        'border-[var(--biolink-button-border)]!',
      );
      expect(resolved.style).toMatchObject({
        '--biolink-button-background': 'var(--color-primary)',
        '--biolink-button-text': 'var(--color-primary-foreground)',
      });
    }
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const read = (relative: string) =>
  fs.readFileSync(path.resolve(relative), 'utf8');

const surface = read(
  'resources/client/digital-products/public/product-page/surface.ts',
);
const tabs = read(
  'resources/client/digital-products/public/product-page/product-tabs.tsx',
);
const creator = read(
  'resources/client/digital-products/public/product-page/product-creator-card.tsx',
);
const pricing = read(
  'resources/client/digital-products/public/product-page/product-pricing-card.tsx',
);
const overview = read(
  'resources/client/digital-products/public/product-page/product-overview.tsx',
);
const summary = read(
  'resources/client/digital-products/public/product-page/product-summary.tsx',
);
const gallery = read(
  'resources/client/digital-products/public/product-page/product-gallery.tsx',
);
const page = read(
  'resources/client/digital-products/public/digital-product-public-pages.tsx',
);
const reviews = read(
  'resources/client/digital-products/public/product-reviews-block.tsx',
);

describe('product page surface chrome', () => {
  test('reuses the storefront edge token and Appearance soft-pop var', () => {
    expect(surface).toContain('biolinkSurfaceEdgeClassName');
    expect(surface).toContain(
      '[box-shadow:var(--biolink-surface-shadow,none)]',
    );
  });

  test('nested chips and badges share biolinkSurfaceEdgeClassName', () => {
    expect(summary).toContain('biolinkSurfaceEdgeClassName');
    expect(gallery).toContain('biolinkSurfaceEdgeClassName');
    expect(page).toMatch(
      /rounded-card-xs bg-\[var\(--biolink-surface\)\][\s\S]{0,80}?biolinkSurfaceEdgeClassName/,
    );
  });
});

describe('product page tabs', () => {
  test('shares Appearance segmented Tabs chrome with the storefront', () => {
    expect(tabs).toContain('resolveBiolinkSegmentedTabsAppearance');
    expect(tabs).toContain('style={segmented.style}');
    expect(tabs).toContain('appearance');
    expect(tabs).not.toContain('variant="line"');
    expect(tabs).not.toContain('rounded-full');
  });
});

describe('product page Appearance button + radius wiring', () => {
  test('Visit store, Buy rescue, and reviews Retry use buttonAppearance', () => {
    expect(creator).toContain('resolveBiolinkButtonAppearance');
    expect(creator).toContain('buttonAppearance.className');
    expect(creator).toContain('style={buttonAppearance.style}');
    expect(pricing).toContain(
      "className={cn('mt-3 w-fit', buttonAppearance.className)}",
    );
    expect(pricing).toContain('style={buttonAppearance.style}');
    expect(reviews).toContain('resolveBiolinkButtonAppearance');
    expect(reviews).toContain('className={buttonAppearance.className}');
    expect(reviews).not.toContain('color="danger"');
  });

  test('creator avatar and check wells follow Appearance roundness tokens', () => {
    expect(creator).toContain('resolveBiolinkContainerRadius');
    expect(creator).toContain('containerRadius.avatarClassName');
    expect(creator).toContain('after:rounded-[inherit]');
    expect(overview).toContain('rounded-button');
    expect(overview).not.toContain('rounded-full');
    expect(page).toContain('rounded-button bg-positive/10');
    expect(page).not.toContain('rounded-full bg-positive/10');
    expect(page).not.toContain('bg-primary/10');
  });

  test('product shell honors hideBranding with a footer lockup', () => {
    expect(page).toContain('function ProductBranding');
    expect(page).toContain('appearance?.hideBranding');
    expect(page).toContain('shouldUseLightBiolinkLogo');
    expect(page).toContain('<ProductBranding appearance={appearance} />');
  });
});

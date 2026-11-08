import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/digital-products/shared/product-card.tsx'),
  'utf8',
);

describe('shared product card integration', () => {
  test('exports a reusable ProductCard', () => {
    expect(source).toContain('export function ProductCard');
    expect(source).toContain('export interface ProductCardProps');
  });

  test('uses project aliases, not foreign registry paths', () => {
    expect(source).toContain('@shadcn/badge/badge');
    expect(source).toContain('@ui/i18n/trans');
    expect(source).toContain('@ui/utils/cn');
    expect(source).not.toContain('@/lib/utils');
    expect(source).not.toContain('@/components/ui/');
    expect(source).not.toContain('@radix-ui/react-slot');
  });
});

describe('shared product card consistency', () => {
  test('uses theme tokens and app conventions, not hardcoded values', () => {
    expect(source).toContain('rounded-card');
    expect(source).toContain('text-base leading-6 font-medium');
    expect(source).toContain('focus-visible:outline-primary');
    expect(source).not.toContain('rounded-2xl');
    expect(source).toContain('fill-current text-warning');
    expect(source).not.toContain('text-amber-500');
    expect(source).not.toContain('text-yellow-400');
    expect(source).not.toContain('text-m ');
    expect(source).toContain('size-4');
    expect(source).not.toContain('h-4 w-4');
    expect(source).not.toContain('ml-2');
  });

  test('isolates cover overlays so they stay under the sticky storefront tabs', () => {
    // The media overlay is positioned z-10. Without a card-level stacking
    // context it paints over the sticky Products/Services/About strip while
    // the grid scrolls beneath it.
    const root = source.match(
      /className=\{cn\(\s*'([^']*rounded-card[^']*)'/,
    );
    expect(root?.[1]).toContain('isolate');
  });

  test('paints carousel scrims and dots with theme tokens only', () => {
    // Scrim: theme-derived ink/white pair instead of raw black/white, so it
    // reads on light and dark grounds and over arbitrary cover art.
    expect(source).toContain('bg-foreground/60');
    expect(source).toContain('text-background');
    expect(source).toContain('hover:bg-foreground/80');
    expect(source).not.toContain('bg-black/');
    expect(source).not.toContain('hover:bg-black/');
    expect(source).not.toContain('text-white');
    // Dot strip: background + foreground ring so it survives white covers.
    expect(source).toContain('bg-background/60');
    expect(source).toContain('ring-foreground/60');
    expect(source).not.toContain('bg-white');
  });

  test('centers the dot strip with logical properties, not physical offsets', () => {
    expect(source).toContain('start-0 end-0');
    expect(source).toContain('justify-center');
    expect(source).not.toContain('left-1/2');
    expect(source).not.toContain('-translate-x-1/2');
    expect(source).not.toContain(' translate-x-');
  });

  test('keeps carousel controls reachable without a hover device', () => {
    // Coarse pointers (touch) always see the arrows; fine pointers keep the
    // reveal-on-hover behaviour, and keyboard focus reveals them either way.
    expect(source).toContain('pointer-coarse:opacity-100');
    expect(source).toContain('focus-within:opacity-100');
    expect(source).toContain('group-hover:opacity-100');
    // Arrows 32px, dot hit areas 24px (WCAG 2.5.8 minimum), pinned against
    // flex shrink so many-image cards can never compress them.
    expect(source).toContain('size-8');
    expect(source).toContain('size-6 shrink-0');
    expect(source).toMatch(/focus-visible:outline-2/);
  });

  test('respects prefers-reduced-motion for the slide', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('{duration: 0}');
    expect(source).toContain('motion-reduce:transition-none');
    // The cover never zooms, so there is no transform needing a motion guard.
    expect(source).not.toContain('group-hover:scale');
  });

  test('has no travel-domain leftovers', () => {
    expect(source).not.toContain('pricePerNight');
    expect(source).not.toContain('dateRange');
    expect(source).not.toContain('hostType');
    expect(source).not.toContain('Book Now');
    expect(source).not.toContain('/ night');
    expect(source).not.toContain('${pricePerNight}');
  });

  test('keeps accessible carousel controls and translated strings', () => {
    expect(source).toContain("import {useTrans} from '@ui/i18n/use-trans'");
    expect(source).toContain("aria-label={trans({message: 'Previous image'})}");
    expect(source).toContain("aria-label={trans({message: 'Next image'})}");
    expect(source).toContain("message: 'Go to image :number'");
    expect(source).not.toContain('aria-label="Previous image"');
    expect(source).not.toContain('aria-label="Next image"');
    expect(source).not.toContain('aria-label={`Go to image');
    expect(source).toContain('<Trans message="Top rated" />');
    expect(source).toContain('AnimatePresence');
    expect(source).toContain("import {ProductCover} from '@ui/product-cover'");
    expect(source).not.toContain('const [imageError, setImageError]');
  });

  test('keeps motion minimal: carousel only, no entrance or hover motion', () => {
    expect(source).toContain('AnimatePresence');
    expect(source).not.toContain('whileInView');
    expect(source).not.toContain('whileHover');
    expect(source).not.toContain('staggerChildren');
    expect(source).not.toContain('itemVariants');
    expect(source).not.toContain('hover:underline');
  });

  test('quiet single-cover path skips the carousel motion wrapper', () => {
    expect(source).toContain('quiet && !showCarouselUI');
    expect(source).toContain('Storefront single cover: skip AnimatePresence');
  });

  test('forwards an optional root style for Appearance soft-pop', () => {
    expect(source).toContain('style?: CSSProperties');
    expect(source).toContain('style={style}');
  });

  test('cover imagery sits still on hover; chrome stays on the card', () => {
    expect(source).toContain("'group flex h-full");
    expect(source).not.toContain('group-hover:scale');
    expect(source).toContain('hover:shadow-md');
    expect(source).not.toContain('group-hover/card');
  });
});

describe('shared product card meta slot', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/digital-products/shared/product-card.tsx'),
    'utf8',
  );

  test('exposes a meta slot rendered between description and footer', () => {
    expect(source).toContain('meta?: ReactNode');
    expect(source).toContain('{meta}');
  });
});

describe('shared product cover loading', () => {
  const coverSource = fs.readFileSync(
    path.resolve('common/foundation/resources/client/ui/product-cover.tsx'),
    'utf8',
  );

  test('lazy-loads covers by default with async decoding', () => {
    expect(coverSource).toContain("loading = 'lazy'");
    expect(coverSource).toContain("loading?: 'lazy' | 'eager'");
    expect(coverSource).toContain('loading={loading}');
    expect(coverSource).toContain('decoding="async"');
    // Above-the-fold call sites (product gallery hero) opt out with eager;
    // they are owned by other workstreams, so only the default is enforced here.
    expect(coverSource).not.toContain('loading="eager"');
  });
});

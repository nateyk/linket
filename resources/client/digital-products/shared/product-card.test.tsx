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
    expect(source).toContain("@shadcn/badge/badge");
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
    expect(source).not.toContain('rounded-2xl');
    expect(source).toContain('fill-current text-amber-500');
    expect(source).not.toContain('text-yellow-400');
    expect(source).not.toContain('text-m ');
    expect(source).toContain('size-4');
    expect(source).not.toContain('h-4 w-4');
    expect(source).not.toContain('ml-2');
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
    expect(source).toContain('aria-label="Previous image"');
    expect(source).toContain('aria-label="Next image"');
    expect(source).toContain('<Trans message="Top rated" />');
    expect(source).toContain('AnimatePresence');
    expect(source).toContain(
      "import {ProductCover} from '@ui/product-cover'",
    );
    expect(source).not.toContain('const [imageError, setImageError]');
  });

  test('keeps motion calm: carousel only, no entrance choreography', () => {
    expect(source).toContain('AnimatePresence');
    expect(source).not.toContain('whileInView');
    expect(source).not.toContain('whileHover');
    expect(source).not.toContain('staggerChildren');
    expect(source).not.toContain('itemVariants');
    expect(source).not.toContain('hover:underline');
  });
});

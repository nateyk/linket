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

  test('paints the View product action from the appearance button design', () => {
    expect(source).toContain(
      "import {resolveBiolinkButtonAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';",
    );
    expect(source).toMatch(
      /resolveBiolinkButtonAppearance\(\s*biolink\.appearance\?\.config \?\? null,?\s*\)/,
    );
    expect(source).toContain('className={buttonAppearance.className}');
    expect(source).toContain('style={buttonAppearance.style}');
  });

  test('keeps the action button size, link render, label and href', () => {
    expect(source).toContain('size="sm"');
    expect(source).toContain('render={<a href={href} />}');
    expect(source).toContain('<Trans message="View product" />');
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

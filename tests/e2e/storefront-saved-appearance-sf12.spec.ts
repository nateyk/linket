import fs from 'node:fs';
import path from 'node:path';
import Color from 'colorjs.io';
import {expect, test, type Page, type TestInfo} from '@playwright/test';

/**
 * SF-12: measured persisted Appearance on disposable, public store/product/
 * service pages, NOT OS dark-mode simulation or full WCAG certification.
 */
const baseUrl = process.env.E2E_BASE_URL ?? '';
const isolated =
  process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  process.env.DB_DATABASE === 'belink_test' &&
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(baseUrl);

const variants = [
  {name: 'light', color: '#1e293b'},
  {name: 'dark', color: '#f9fafb'},
  {name: 'gradient', color: '#111827'},
] as const;

type Variant = (typeof variants)[number];
type Surface = 'store' | 'product' | 'service';

function productIdFromFixture(): number {
  const file = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(file), 'Missing isolated buyer fixture').toBe(true);
  const fixture = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    database: string;
    product_id: number;
  };
  expect(fixture.database).toBe('belink_test');
  return fixture.product_id;
}

function publicRoute(variant: Variant, surface: Surface, productId: number) {
  const slug = `sf12-appearance-${variant.name}`;
  if (surface === 'store') return `/${slug}`;
  if (surface === 'product') return `/${slug}/products/${productId}`;
  return `/${slug}/services/sf12-qa-service-${variant.name}`;
}

function luminance(color: Color): number {
  return color.to('srgb').luminance;
}

function ratio(a: Color, b: Color): number {
  const brighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (brighter + 0.05) / (darker + 0.05);
}

/** A near-opaque panel is checked against black AND white backing seats. */
function worstCasePanelRatio(foreground: string, background: string): number {
  const text = new Color(foreground).to('srgb');
  const panel = new Color(background).to('srgb');
  const alpha = panel.alpha ?? 1;
  return Math.min(
    ...[0, 1].map(seat =>
      ratio(
        text,
        new Color(
          'srgb',
          (panel.coords as number[]).map(
            channel => channel * alpha + seat * (1 - alpha),
          ),
        ),
      ),
    ),
  );
}

async function readSavedTokens(page: Page) {
  const root = page.locator('[style*="--biolink-text"]').first();
  await expect(root).toBeVisible({timeout: 30000});
  return root.evaluate(node => {
    const css = getComputedStyle(node);
    return {
      foreground: css.getPropertyValue('--biolink-text').trim(),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hasGradient: [...document.querySelectorAll<HTMLElement>('[style]')].some(
        item => item.style.backgroundImage.includes('linear-gradient(135deg'),
      ),
    };
  });
}

function assertSavedTokens(
  tokens: Awaited<ReturnType<typeof readSavedTokens>>,
  variant: Variant,
  surface: Surface,
) {
  expect(tokens.reducedMotion).toBe(true);
  const expected = new Color(variant.color).to('srgb');
  const actual = new Color(tokens.foreground).to('srgb');
  const difference = Math.max(
    ...(actual.coords as number[]).map(
      (value, index) => Math.abs(value - (expected.coords as number[])[index]),
    ),
  );
  expect(difference, `${surface} ignored saved ${variant.name} text color`)
    .toBeLessThan(0.02);
  if (variant.name === 'gradient') {
    expect(tokens.hasGradient, 'Saved public gradient background missing').toBe(true);
  }
}

async function verifyPanelContrast(
  page: Page,
  info: TestInfo,
  variant: Variant,
  surface: Exclude<Surface, 'store'>,
  url: string,
) {
  const card = page.locator('[data-slot="card"]').first();
  await expect(card).toBeVisible();
  const colors = await card.evaluate(node => {
    const css = getComputedStyle(node);
    return {text: css.color, surface: css.backgroundColor};
  });
  const contrastRatio = worstCasePanelRatio(colors.text, colors.surface);
  await info.attach(`${variant.name}-${surface}-contrast.json`, {
    body: Buffer.from(
      JSON.stringify({url, variant: variant.name, colors, contrastRatio}, null, 2),
    ),
    contentType: 'application/json',
  });
  expect(
    contrastRatio,
    `WCAG 2.2 AA normal text on ${variant.name} ${surface} panel`,
  ).toBeGreaterThanOrEqual(4.5);
}

async function attachPageScreenshot(
  page: Page,
  info: TestInfo,
  variant: Variant,
  surface: Surface,
) {
  const label = `sf12-saved-${variant.name}-${surface}-375`;
  const file = info.outputPath(`${label}.png`);
  await page.screenshot({path: file, fullPage: true});
  await info.attach(label, {path: file, contentType: 'image/png'});
}

async function verifyPublishedAppearance(
  page: Page,
  info: TestInfo,
  variant: Variant,
  surface: Surface,
) {
  const url = publicRoute(variant, surface, productIdFromFixture());
  await page.setViewportSize({width: 375, height: 812});
  const response = await page.goto(url);
  expect(response?.ok(), `Expected published ${surface} route ${url}`).toBe(true);
  assertSavedTokens(await readSavedTokens(page), variant, surface);
  if (surface === 'product' || surface === 'service') {
    await verifyPanelContrast(page, info, variant, surface, url);
  }
  await attachPageScreenshot(page, info, variant, surface);
}

test.describe('SF-12 actual saved Appearance across published pages', () => {
  test.skip(!isolated, 'Requires disposable belink_test on loopback');
  test.use({reducedMotion: 'reduce'});
  test.setTimeout(70_000);

  for (const variant of variants) {
    for (const surface of ['store', 'product', 'service'] as const) {
      test(`${variant.name} persisted Appearance on ${surface} page`, async ({page}, info) => {
        await verifyPublishedAppearance(page, info, variant, surface);
      });
    }
  }
});

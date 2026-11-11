import fs from 'node:fs';
import path from 'node:path';
import Color from 'colorjs.io';
import {expect, test} from '@playwright/test';

/**
 * SF-12 persisted Appearance acceptance, run only on disposable synthetic
 * stores. Verifies the actual saved store config across published routes,
 * not merely a dark-mode OS preference. No writes or buyer actions in browser.
 *
 * Native browser-toolbar zoom, real screen readers, and screen-based gradient
 * contrast still require separate human evidence.
 */
const baseUrl = process.env.E2E_BASE_URL ?? '';
const isolated =
  process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  process.env.DB_DATABASE === 'belink_test' &&
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(baseUrl);

const variants = [
  {name: 'light', color: '#1e293b', background: '#f8fafc'},
  {name: 'dark', color: '#f9fafb', background: '#111827'},
  {name: 'gradient', color: '#111827', background: 'linear-gradient'},
] as const;

function luminance(color: Color): number {
  return color.to('srgb').luminance;
}

function ratio(a: Color, b: Color): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Shared panels use 99%-opaque painted surfaces. Evaluate the worst possible
 * underlying opaque seat (black or white); this is stricter than relying on
 * an estimated background screenshot pixel under semi-transparent cards.
 */
function worstCasePanelRatio(foreground: string, background: string): number {
  const fg = new Color(foreground).to('srgb');
  const surface = new Color(background).to('srgb');
  const alpha = surface.alpha ?? 1;

  return Math.min(
    ...[0, 1].map(seat =>
      ratio(
        fg,
        new Color(
          'srgb',
          (surface.coords as number[]).map(
            channel => channel * alpha + seat * (1 - alpha),
          ),
        ),
      ),
    ),
  );
}

test.describe('SF-12 actual saved Appearance across published pages', () => {
  test.skip(!isolated, 'Requires disposable belink_test and loopback browser environment');
  test.use({reducedMotion: 'reduce'});
  test.setTimeout(70_000);

  for (const variant of variants) {
    for (const surface of ['store', 'product', 'service'] as const) {
      test(`${variant.name} persisted Appearance on ${surface} page`, async ({page}, info) => {
        const fixtureFile = path.resolve('storage/app/e2e/buyer-fixture.json');
        expect(fs.existsSync(fixtureFile), 'Missing isolated buyer fixture').toBe(true);
        const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as {
          database: string;
          product_id: number;
        };
        expect(fixture.database).toBe('belink_test');
        const slug = `sf12-appearance-${variant.name}`;
        const url =
          surface === 'store'
            ? `/${slug}`
            : surface === 'product'
              ? `/${slug}/products/${fixture.product_id}`
              : `/${slug}/services/sf12-qa-service`;

        await page.setViewportSize({width: 375, height: 812});
        const response = await page.goto(url);
        expect(response?.ok(), `Expected published ${surface} route: ${url}`).toBe(true);
        await expect(page.locator('[style*="--biolink-text"]').first()).toBeVisible({
          timeout: 30000,
        });

        // The original saved config must be propagated to the actual public
        // route, not replaced by default dashboard / system dark mode tokens.
        const root = page.locator('[style*="--biolink-text"]').first();
        const tokens = await root.evaluate(element => {
          const css = getComputedStyle(element);
          return {
            foreground: css.getPropertyValue('--biolink-text').trim(),
            surface: css.getPropertyValue('--biolink-surface-strong').trim(),
            pageColor: css.color,
            mutedText: css.getPropertyValue('--biolink-muted-text').trim(),
            hasGradient: [...document.querySelectorAll<HTMLElement>('[style]')].some(
              node => node.style.backgroundImage.includes('linear-gradient(135deg'),
            ),
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          };
        });
        expect(tokens.reducedMotion).toBe(true);
        const expected = new Color(variant.color).to('srgb');
        const actual = new Color(tokens.foreground).to('srgb');
        const maxDifference = Math.max(
          ...(actual.coords as number[]).map(
            (channel, index) =>
              Math.abs(channel - (expected.coords as number[])[index]),
          ),
        );
        expect(maxDifference, `${surface} did not receive saved ${variant.name} text color`)
          .toBeLessThan(0.02);
        if (variant.name === 'gradient') {
          expect(tokens.hasGradient, 'Saved public gradient background is missing').toBe(true);
        }

        // Evaluate real computed card foreground/background rather than
        // inferred theme tokens. Profile shell isn't a shadcn Card surface.
        if (surface !== 'store') {
          const card = page.locator('[data-slot="card"]').first();
          await expect(card).toBeVisible();
          const colors = await card.evaluate(node => {
            const css = getComputedStyle(node);
            return {text: css.color, surface: css.backgroundColor};
          });
          const measured = worstCasePanelRatio(colors.text, colors.surface);
          await info.attach(`${variant.name}-${surface}-contrast.json`, {
            body: Buffer.from(
              JSON.stringify(
                {url, variant: variant.name, colors, worstCaseContrastRatio: measured},
                null,
                2,
              ),
            ),
            contentType: 'application/json',
          });
          expect(
            measured,
            `WCAG 2.2 AA normal text contrast on ${variant.name} ${surface} card`,
          ).toBeGreaterThanOrEqual(4.5);
        }

        const screenshot = info.outputPath(
          `sf12-saved-${variant.name}-${surface}-375.png`,
        );
        await page.screenshot({path: screenshot, fullPage: true});
        await info.attach(`saved-${variant.name}-${surface}`, {
          path: screenshot,
          contentType: 'image/png',
        });
      });
    }
  }
});

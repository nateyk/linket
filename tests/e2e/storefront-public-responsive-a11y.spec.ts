import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type Page, type TestInfo} from '@playwright/test';

/**
 * SF-12 read-only public storefront acceptance on a disposable test instance.
 *
 * Example:
 * LINKET_ISOLATED_E2E=1 APP_ENV=testing DB_DATABASE=belink_test \
 * E2E_NO_SERVER=1 E2E_BASE_URL=http://127.0.0.1:8081 \
 * npx playwright test tests/e2e/storefront-public-responsive-a11y.spec.ts
 *
 * A seeded buyer fixture is required. These tests never create a purchase,
 * mutate a store or submit an inquiry. They are not native 200% browser zoom
 * tests; a separate human toolbar-zoom and screen-reader review is required.
 */
const baseUrl = process.env.E2E_BASE_URL ?? '';
const isolated =
  process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  (process.env.DB_DATABASE ?? '').toLowerCase().includes('test') &&
  /^https?:\/\/(127\.0\.0\.1|localhost|linket\.ddev\.site)(:\d+)?\/?$/.test(baseUrl);

type PublicFixture = {
  database: string;
  store_slug: string;
  product_url: string;
  product_title: string;
};

function loadFixture(): PublicFixture {
  const file = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(file), 'Seed buyer E2E data before running SF-12').toBe(true);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as PublicFixture;
  expect(data.database.toLowerCase()).toContain('test');
  expect(data.store_slug).toBeTruthy();
  expect(data.product_title).toBeTruthy();
  expect(new URL(data.product_url, baseUrl).origin).toBe(new URL(baseUrl).origin);
  return data;
}

const widths = [
  {width: 320, height: 900, name: 'reflow 320'},
  {width: 360, height: 800, name: 'mobile 360'},
  {width: 375, height: 812, name: 'mobile 375'},
  {width: 430, height: 932, name: 'mobile 430'},
  {width: 768, height: 1024, name: 'tablet 768'},
  {width: 1024, height: 768, name: 'tablet 1024'},
  {width: 1440, height: 900, name: 'desktop 1440'},
] as const;

async function captureAndCheckReflow(
  page: Page,
  info: TestInfo,
  label: string,
) {
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  if (overflow > 1) {
    const offenders = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            right: Math.round(rect.right),
            className: typeof element.className === 'string'
              ? element.className.slice(0, 100) : '',
          };
        })
        .filter(x => x.right > width + 1)
        .slice(0, 12);
    });
    console.log('SF12_OVERFLOW', JSON.stringify({label, overflow, offenders}));
  }
  const file = info.outputPath(`sf12-${label}.png`);
  await page.screenshot({path: file, fullPage: true});
  await info.attach(label, {path: file, contentType: 'image/png'});
  expect(overflow, `${label}: horizontal overflow in published UI`).toBeLessThanOrEqual(1);
}

test.describe('SF-12 published storefront and product responsive evidence', () => {
  test.skip(!isolated, 'Requires loopback / DDEV server and disposable test DB');
  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    reducedMotion: 'reduce',
  });
  test.setTimeout(90_000);

  for (const size of widths) {
    test(`${size.name}: store and product remain readable without horizontal overflow`, async ({page}, info) => {
      const fixture = loadFixture();
      await page.setViewportSize({width: size.width, height: size.height});

      const storeResponse = await page.goto(`/${fixture.store_slug}`);
      expect(storeResponse?.ok()).toBe(true);
      // Creator Profile includes hidden mobile/desktop branches at different sizes.
      // Select the *visible* published card, not a hidden CSS branch.
      await expect(
        page.getByRole('heading', {level: 3, name: fixture.product_title})
          .filter({visible: true}).first(),
      ).toBeVisible({timeout: 30000});
      await captureAndCheckReflow(page, info, `store-${size.width}`);

      const productResponse = await page.goto(fixture.product_url);
      expect(productResponse?.ok()).toBe(true);
      const title = page.getByRole('heading', {name: fixture.product_title, level: 1});
      await expect(title).toBeVisible({timeout: 30000});
      const titleWrap = await title.evaluate(element => getComputedStyle(element).overflowWrap);
      expect(titleWrap, 'Product title must support long text reflow').toMatch(/^(anywhere|break-word)$/);
      await captureAndCheckReflow(page, info, `product-${size.width}`);
    });
  }

  test('keyboard focus reaches the published product action without submitting checkout', async ({page}) => {
    const fixture = loadFixture();
    await page.setViewportSize({width: 360, height: 800});
    await page.goto(fixture.product_url);
    await expect(page.getByRole('heading', {name: fixture.product_title, level: 1})).toBeVisible();

    const action = page.getByRole('button', {name: /Buy now|Get for free|Temporarily unavailable/i}).first();
    await expect(action).toBeVisible();
    if (await action.isEnabled()) {
      await action.focus();
      await expect(action).toBeFocused();
    }
  });
});

/**
 * A published service page is optional until an isolated service fixture is
 * seeded. Keep this read-only and independent of service inquiry submission.
 */
test.describe('SF-12 optional public service page evidence', () => {
  const serviceUrl = process.env.LINKET_E2E_PUBLIC_SERVICE_URL;
  test.skip(!isolated || !serviceUrl, 'Requires isolated public service fixture URL');
  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    reducedMotion: 'reduce',
  });

  for (const size of widths) {
    test(`${size.name}: service details and packages reflow without clipping`, async ({page}, info) => {
      const route = new URL(serviceUrl!, baseUrl);
      expect(route.origin).toBe(new URL(baseUrl).origin);
      await page.setViewportSize({width: size.width, height: size.height});
      const response = await page.goto(route.toString());
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      const packageTabs = page.getByRole('tablist', {name: 'Packages'});
      if (await packageTabs.count()) {
        await expect(packageTabs.getByRole('tab').first()).toBeVisible();
      }
      await captureAndCheckReflow(page, info, `service-${size.width}`);
    });
  }
  test('mobile package tabs and quote dialog work by keyboard without sending an inquiry', async ({page}) => {
    const route = new URL(serviceUrl!, baseUrl);
    expect(route.origin).toBe(new URL(baseUrl).origin);
    await page.setViewportSize({width: 375, height: 812});
    await page.goto(route.toString());

    const list = page.getByRole('tablist', {name: 'Packages'});
    const tabs = list.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    // Base UI tabs support manual activation: arrow keys move focus, then
    // Enter or Space selects the focused package and announces aria-selected.
    await page.keyboard.press('Enter');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    // Opening and dismissing a quote is safe; submitting an inquiry is not.
    const request = page.getByRole('button', {name: 'Request this package'});
    await expect(request).toBeVisible();
    await request.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Standard');
    await expect(dialog.getByRole('textbox', {name: 'Name'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('published seller email contact is an accessible, focusable 44px target', async ({page}) => {
    const route = new URL(serviceUrl!, baseUrl);
    expect(route.origin).toBe(new URL(baseUrl).origin);
    await page.setViewportSize({width: 375, height: 812});
    await page.goto(route.toString());

    const contact = page.getByRole('link', {name: 'Email creator'});
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute('href', 'mailto:qa-creator@example.test');
    await expect(contact).not.toHaveAttribute('target', '_blank');
    await contact.focus();
    await expect(contact).toBeFocused();
    const bounds = await contact.boundingBox();
    expect(bounds, 'Seller contact link must have a rendered target').not.toBeNull();
    expect(bounds!.height, 'Seller contact touch target height').toBeGreaterThanOrEqual(44);
    expect(bounds!.width, 'Seller contact touch target width').toBeGreaterThanOrEqual(44);
  });

  test('attach system light/dark preference snapshots and theme tokens for human contrast review', async ({page}, info) => {
    const route = new URL(serviceUrl!, baseUrl);
    expect(route.origin).toBe(new URL(baseUrl).origin);
    await page.setViewportSize({width: 375, height: 812});

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({colorScheme, reducedMotion: 'reduce'});
      await page.goto(route.toString());
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      const file = info.outputPath(`sf12-system-${colorScheme}-service-375.png`);
      await page.screenshot({path: file, fullPage: true});
      await info.attach(`system-${colorScheme}-service`, {
        path: file,
        contentType: 'image/png',
      });

      // Diagnostics only: a system color-scheme preference does not override
      // a creator's stored Appearance and is NOT a WCAG contrast certification.
      const colors = await page.evaluate(() => {
        const painted =
          document.querySelector<HTMLElement>('[style*="--biolink-text"]') ??
          document.documentElement;
        const css = getComputedStyle(painted);
        return {
          declaredColorScheme: matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light',
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          text: css.getPropertyValue('--biolink-text').trim(),
          mutedText: css.getPropertyValue('--biolink-muted-text').trim(),
          surface: css.getPropertyValue('--biolink-surface').trim(),
          surfaceStrong: css.getPropertyValue('--biolink-surface-strong').trim(),
          border: css.getPropertyValue('--biolink-border').trim(),
        };
      });
      await info.attach(`system-${colorScheme}-tokens`, {
        body: Buffer.from(JSON.stringify(colors, null, 2)),
        contentType: 'application/json',
      });
      expect(colors.declaredColorScheme).toBe(colorScheme);
      expect(colors.reducedMotion).toBe(true);
    }
  });

});

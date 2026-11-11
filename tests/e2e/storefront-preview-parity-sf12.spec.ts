import Color from 'colorjs.io';
import {expect, test, type FrameLocator, type Page, type TestInfo} from '@playwright/test';

/**
 * SF-12: the real public storefront route is also the editor's iframe route.
 * Compare saved Appearance to ?preview=1, then verify an unsaved preview
 * message changes only that frame (not the published page).
 *
 * This does NOT impersonate an authenticated editor, save changes, certify
 * browser-toolbar zoom, or replace human preview/public parity acceptance.
 */
const baseUrl = process.env.E2E_BASE_URL ?? '';
const isolated =
  process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  process.env.DB_DATABASE === 'belink_test' &&
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(baseUrl);

const variants = [
  {name: 'light', saved: '#1e293b', draft: '#f9fafb', draftBg: '#111827'},
  {name: 'dark', saved: '#f9fafb', draft: '#1e293b', draftBg: '#f8fafc'},
  {name: 'gradient', saved: '#111827', draft: '#f9fafb', draftBg: '#111827'},
] as const;

type Variant = (typeof variants)[number];
const themeRootSelector = '[style*="--biolink-text"]';
const frameSelector = 'iframe[data-sf12-preview-frame="true"]';

function expectSameColor(actual: string, expected: string) {
  const actualRgb = new Color(actual).to('srgb').coords as number[];
  const expectedRgb = new Color(expected).to('srgb').coords as number[];
  expect(
    Math.max(...actualRgb.map((value, index) => Math.abs(value - expectedRgb[index]))),
    `Expected ${actual} to match ${expected}`,
  ).toBeLessThan(0.02);
}

async function publicTextColor(page: Page) {
  const root = page.locator(themeRootSelector).first();
  await expect(root).toBeVisible();
  return root.evaluate(element =>
    getComputedStyle(element).getPropertyValue('--biolink-text').trim(),
  );
}

async function previewTextColor(frame: FrameLocator) {
  const root = frame.locator(themeRootSelector).first();
  await expect(root).toBeVisible();
  return root.evaluate(element =>
    getComputedStyle(element).getPropertyValue('--biolink-text').trim(),
  );
}

async function mountRealPreviewFrame(page: Page, slug: string) {
  await page.evaluate(value => {
    const iframe = document.createElement('iframe');
    iframe.dataset.sf12PreviewFrame = 'true';
    iframe.title = 'SF-12 isolated preview parity fixture';
    iframe.width = '390';
    iframe.height = '844';
    iframe.src = `/${value}?preview=1`;
    window.addEventListener('message', event => {
      if (event.origin !== location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== 'linket:store-preview-ready') return;
      iframe.dataset.sf12Ready = 'true';
    });
    document.body.appendChild(iframe);
  }, slug);
  await expect(page.locator('iframe[data-sf12-ready="true"]')).toHaveCount(1);
  return page.frameLocator(frameSelector);
}

async function postUnsavedDraft(page: Page, variant: Variant) {
  const payload = {
    biolink: {},
    appearance: {
      bgConfig: {backgroundColor: variant.draftBg, color: variant.draft},
      btnConfig: {variant: 'solid', color: '#1d4ed8', textColor: '#ffffff'},
      fontConfig: {family: 'Inter'},
    },
    content: [],
    profileConfig: {display_name: 'Unsaved QA preview only'},
  };
  await page.locator(frameSelector).evaluate((element, draft) => {
    (element as HTMLIFrameElement).contentWindow?.postMessage(
      {type: 'linket:store-preview', payload: draft},
      location.origin,
    );
  }, payload);
}

async function attachScreenshot(
  info: TestInfo,
  label: string,
  locator: Page | ReturnType<Page['locator']>,
) {
  const file = info.outputPath(`${label}.png`);
  await locator.screenshot({path: file});
  await info.attach(label, {path: file, contentType: 'image/png'});
}

test.describe('SF-12 saved storefront versus real iframe preview protocol', () => {
  test.skip(!isolated, 'Requires local disposable belink_test fixture');
  test.use({reducedMotion: 'reduce'});
  test.setTimeout(75_000);

  for (const variant of variants) {
    test(`${variant.name}: published tokens match preview, while draft remains isolated`, async ({page}, info) => {
      const slug = `sf12-appearance-${variant.name}`;
      await page.setViewportSize({width: 1440, height: 900});
      const response = await page.goto(`/${slug}`);
      expect(response?.ok()).toBe(true);

      const publishedBefore = await publicTextColor(page);
      expectSameColor(publishedBefore, variant.saved);
      await attachScreenshot(info, `${variant.name}-published-before`, page);

      const preview = await mountRealPreviewFrame(page, slug);
      const initialPreview = await previewTextColor(preview);
      expectSameColor(initialPreview, publishedBefore);

      await postUnsavedDraft(page, variant);
      // Poll the actual computed preview style rather than relying on a
      // postMessage promise, which resolves before React commits the draft.
      await expect.poll(async () => {
        const actual = new Color(await previewTextColor(preview)).to('srgb').coords as number[];
        const expected = new Color(variant.draft).to('srgb').coords as number[];
        return Math.max(
          ...actual.map((channel, index) => Math.abs(channel - expected[index])),
        );
      }).toBeLessThan(0.02);
      expectSameColor(await publicTextColor(page), publishedBefore);

      const frame = page.locator(frameSelector);
      await attachScreenshot(info, `${variant.name}-unsaved-preview`, frame);
    });
  }
});

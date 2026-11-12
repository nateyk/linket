import fs from 'node:fs';
import path from 'node:path';
import Color from 'colorjs.io';
import {expect, test, type Page, type TestInfo} from '@playwright/test';

/**
 * SF-04: exercise an ACTUAL authenticated creator's Appearance Save control
 * against an independent, anonymous published storefront in disposable MySQL.
 * Unlike preview-protocol tests, this executes the real UI and mutation.
 * Does not certify human review, native browser zoom, screen readers or deploy.
 */
const local = process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  process.env.DB_DATABASE === 'belink_test' &&
  process.env.E2E_BASE_URL === 'http://127.0.0.1:8081';

type Fixture = {store_id: number; slug: string};
const themeRootSelector = '[style*="--biolink-text"]';

function fixture(): Fixture {
  const file = path.resolve('storage/app/e2e/sf04-save-parity.json');
  expect(fs.existsSync(file), 'SF-04 fixture must be seeded locally').toBe(true);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Fixture;
  expect(data.slug).toBe('sf04-save-parity');
  expect(Number.isInteger(data.store_id)).toBe(true);
  return data;
}

async function readTextColor(page: Page) {
  const root = page.locator(themeRootSelector).first();
  await expect(root).toBeVisible();
  return root.evaluate(element =>
    getComputedStyle(element).getPropertyValue('--biolink-text').trim(),
  );
}

function channels(cssColor: string) {
  return new Color(cssColor).to('srgb').coords as number[];
}

function isSameColor(a: string, b: string) {
  return Math.max(...channels(a).map((value, i) =>
    Math.abs(value - channels(b)[i]),
  )) < 0.02;
}

async function attach(page: Page, info: TestInfo, name: string) {
  const file = info.outputPath(`sf04-${name}.png`);
  await page.screenshot({path: file, fullPage: true});
  await info.attach(name, {path: file, contentType: 'image/png'});
}

test('SF-04 logged-in Appearance Save survives reload and updates published page, not unsaved drafts', async ({browser, page}, info) => {
  test.skip(!local, 'Requires isolated loopback + disposable belink_test DB');
  test.setTimeout(120_000);

  const data = fixture();
  const visitorContext = await browser.newContext({viewport: {width: 390, height: 844}, baseURL: process.env.E2E_BASE_URL});
  const visitor = await visitorContext.newPage();
  const target = '#334155';

  try {
    const original = await visitor.goto(`/${data.slug}`);
    expect(original?.ok()).toBe(true);
    const savedBefore = await readTextColor(visitor);
    // Wait for asynchronous product data, not merely the theme root:
    // the original pre-Save screenshot could capture loading skeletons.
    await expect(visitor.getByText('E2E Buyer Digital Guide', {exact: true}).first()).toBeVisible();
    await attach(visitor, info, 'published-before');

    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/login');
    await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
    await page.getByRole('textbox', {name: 'Email Address'})
      .fill('e2e-buyer-creator@example.test');
    await page.getByRole('textbox', {name: 'Password'})
      .fill('E2eBuyerCreator!23');
    await page.getByRole('button', {name: 'Login', exact: true}).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 15000});

    await page.goto(`/dashboard/stores/${data.store_id}/appearance`);
    await expect(page.getByText('Customize your public storefront, products, and services.')).toBeVisible();
    await page.getByText('Choose the storefront font and text color.').click();

    const textColor = page.getByRole('textbox', {name: 'Color'});
    await expect(textColor).toBeVisible();
    const save = page.getByRole('button', {name: 'Save changes', exact: true});
    await expect(save).toBeDisabled();

    const preview = page.frameLocator('iframe[title="Live preview of the store page on an iPhone 14 Pro"]');
    await expect(preview.locator(themeRootSelector).first()).toBeVisible();

    await textColor.fill(target);
    await textColor.press('Tab');
    await expect(save).toBeEnabled();

    await expect.poll(async () => isSameColor(await preview.locator(themeRootSelector).first()
      .evaluate(element => getComputedStyle(element).getPropertyValue('--biolink-text').trim()), target)).toBe(true);
    // A draft in the builder must not leak into the public page before Save.
    await visitor.reload();
    expect(isSameColor(await readTextColor(visitor), savedBefore)).toBe(true);
    await attach(page, info, 'authenticated-draft-preview');

    await save.click();
    await expect(page.getByRole('status').filter({hasText: 'Changes saved'})).toBeVisible();
    await expect(save).toBeDisabled();
    await visitor.reload();
    await expect.poll(async () => isSameColor(await readTextColor(visitor), target)).toBe(true);
    await expect(visitor.getByText('E2E Buyer Digital Guide', {exact: true}).first()).toBeVisible();
    await attach(visitor, info, 'published-after-save');

    await page.reload();
    await expect(page.getByText('Customize your public storefront, products, and services.')).toBeVisible();
    await page.getByText('Choose the storefront font and text color.').click();
    await expect(page.getByRole('textbox', {name: 'Color'})).toHaveValue(target);
    await expect(page.getByRole('button', {name: 'Save changes', exact: true})).toBeDisabled();
    await attach(page, info, 'authenticated-reloaded');
  } finally {
    await visitorContext.close();
  }
});

/**
 * Genuine Amharic interface smoke test in the authenticated store builder.
 * This checks server-selected locale and rendered controls, not seller text.
 * No mutation or Save: the independent SF-04 test above covers persistence.
 */
test('SF-12 authenticated Appearance builder renders real Amharic controls', async ({page}, info) => {
  test.skip(!local, 'Requires isolated loopback + disposable belink_test DB');
  test.setTimeout(90_000);
  const data = fixture();

  await page.setViewportSize({width: 375, height: 812});
  await page.goto('/login');
  await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
  await page.getByRole('textbox', {name: 'Email Address'}).fill('e2e-buyer-creator@example.test');
  await page.getByRole('textbox', {name: 'Password'}).fill('E2eBuyerCreator!23');
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 15000});

  await page.goto(`/dashboard/stores/${data.store_id}/appearance?lang=am`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.getByText('ገጽታ', {exact: true}).first()).toBeVisible();
  await expect(page.getByText('የሕዝብ መደብር ገጽዎን፣ ምርቶችዎን እና አገልግሎቶችዎን ያብጁ።')).toBeVisible();
  await expect(page.getByText('ዳራ', {exact: true}).first()).toBeVisible();
  await page.getByText('የመደብር ገጹን ፊደል ቅርጽና የጽሑፍ ቀለም ይምረጡ።').click();
  await expect(page.getByRole('textbox', {name: 'ቀለም'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'አስቀምጥ', exact: true})).toBeDisabled();

  await attach(page, info, 'amharic-authenticated-builder-mobile');
});

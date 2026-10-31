import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {expect, test} from '@playwright/test';

type PlatformFixture = {
  database: string;
  product_url: string;
  product_title: string;
  buyer_name: string;
  account_number: string;
  price_label: string;
  file_marker: string;
};

function loadFixture(): PlatformFixture {
  const fixturePath = path.resolve('storage/app/e2e/platform-fixture.json');
  expect(fs.existsSync(fixturePath), 'platform fixture missing — run linket:prepare-buyer-e2e').toBeTruthy();
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as PlatformFixture;
  expect(fixture.database.toLowerCase()).toContain('test');
  return fixture;
}

test.describe('isolated telebirr platform journey', () => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires LINKET_ISOLATED_E2E=1 against disposable db_test + mocked Verify.et');

  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  for (const viewport of [
    {name: 'desktop', width: 1280, height: 900},
    {name: 'mobile', width: 390, height: 844},
  ]) {
    test(`${viewport.name} storefront shows ETB 2470 and a mocked Telebirr payment delivers the file`, async ({page}) => {
      test.setTimeout(120_000);
      const fixture = loadFixture();
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await page.goto(fixture.product_url);
      await expect(page.getByRole('heading', {name: fixture.product_title})).toBeVisible({timeout: 30000});
      await expect(page.getByText(fixture.price_label).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

      await page.getByRole('button', {name: /Buy now/i}).first().click();
      const buyerEmail = `nathnael-${randomUUID().slice(0, 8)}@example.test`;
      await page.getByLabel(/^Name$/i).fill(fixture.buyer_name);
      await page.getByLabel(/^Email$/i).fill(buyerEmail);
      await page.locator('#digital-product-buyer-details').evaluate((form: HTMLFormElement) => form.requestSubmit());

      await expect(page.getByTestId('buyer-payment-status')).toContainText(/Pending payment/i, {timeout: 30000});
      await expect(page.getByText(fixture.account_number)).toBeVisible({timeout: 15000});
      await expect(page.getByText(/Mintesnot Teshome/i).first()).toBeVisible();

      const reference = `SYNTH${Date.now().toString().slice(-8)}`;
      expect(reference).not.toBe('DJR9DBHTEF');
      await page.getByLabel(/Transaction reference/i).fill(reference);
      await page.getByRole('button', {name: /Verify payment/i}).click();
      await expect(page.getByTestId('buyer-payment-status')).toContainText(/^Paid$/i, {timeout: 30000});

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('link', {name: /field-guide\.pdf/i}).first().click();
      const download = await downloadPromise;
      const saved = await download.path();
      expect(saved).toBeTruthy();
      expect(fs.readFileSync(saved!, 'utf8')).toContain(fixture.file_marker);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
  }
});

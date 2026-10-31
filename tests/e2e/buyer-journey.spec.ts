import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {expect, test} from '@playwright/test';

type BuyerFixture = {
  database: string;
  store_slug: string;
  product_id: number;
  product_url: string;
  product_title: string;
  buyer_email: string;
  buyer_name: string;
  account_number: string;
};

function loadFixture(): BuyerFixture {
  const fixturePath = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(fixturePath), 'buyer fixture missing — run linket:prepare-buyer-e2e').toBeTruthy();
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as BuyerFixture;
  expect(fixture.database.toLowerCase()).toContain('test');
  return fixture;
}

function readRecoveryCode(email: string): string {
  const codePath = path.resolve('storage/app/e2e/last-recovery-code.json');
  expect(fs.existsSync(codePath)).toBeTruthy();
  const payload = JSON.parse(fs.readFileSync(codePath, 'utf8')) as {email: string; code: string};
  expect(payload.email).toBe(email);
  expect(payload.code).toMatch(/^\d{6}$/);
  return payload.code;
}

test.describe('isolated buyer journey', () => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires LINKET_ISOLATED_E2E=1 against disposable db_test + mocked Verify.et');

  // CrawlerDetect treats Playwright's default HeadlessChrome UA as a bot and
  // returns the SEO prerender stub (no Buy button). Use a normal Chrome UA.
  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  test('mobile 390px checkout states and unpaid/rejected stay locked', async ({page}) => {
    test.setTimeout(90_000);
    const fixture = loadFixture();
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(fixture.product_url);
    await expect(page.getByRole('heading', {name: fixture.product_title})).toBeVisible({timeout: 30000});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.getByRole('button', {name: /Buy now/i}).first().click();
    const buyerEmail = `e2e-reject-${randomUUID().slice(0, 8)}@example.test`;
    await page.getByLabel(/^Name$/i).fill(fixture.buyer_name);
    await page.getByLabel(/^Email$/i).fill(buyerEmail);
    const buyerForm = page.locator('#digital-product-buyer-details');
    if (await buyerForm.count()) {
      await buyerForm.evaluate((form: HTMLFormElement) => form.requestSubmit());
    } else {
      await page.getByRole('button', {name: /Continue|Start payment|Pay/i}).first().click();
    }
    // Mobile checkout may already be on instructions by the time submit resolves;
    // assert UI state rather than racing a specific network URL.
    await expect(page.getByTestId('buyer-payment-status')).toContainText(/Pending payment/i, {timeout: 30000});
    await expect(page.getByText(fixture.account_number)).toBeVisible({timeout: 15000});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.getByLabel(/Transaction reference/i).fill(`REJECT${Date.now().toString().slice(-8)}`);
    await expect(page.getByRole('button', {name: /Verify payment/i})).toBeEnabled({timeout: 15000});
    await page.getByRole('button', {name: /Verify payment/i}).click();
    await expect(page.getByTestId('buyer-payment-status')).toContainText(/Rejected/i, {timeout: 30000});
    await expect(page.getByRole('link', {name: /e2e-guide\.pdf|guide/i})).toHaveCount(0);
  });

  test('storefront → checkout → verified payment → download → recovery → re-download', async ({page}) => {
    test.setTimeout(180_000);
    const fixture = loadFixture();
    const buyerEmail = `e2e-${randomUUID().slice(0, 8)}@example.test`;

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(fixture.product_url);
    await expect(page.getByRole('heading', {name: fixture.product_title})).toBeVisible({timeout: 30000});
    await page.getByRole('button', {name: /Buy now/i}).first().click();
    await page.getByLabel(/^Name$/i).fill(fixture.buyer_name);
    await page.getByLabel(/^Email$/i).fill(buyerEmail);
    await page
      .locator('#digital-product-buyer-details')
      .evaluate((form: HTMLFormElement) => form.requestSubmit());

    await expect(page.getByRole('heading', {name: /Pay the creator directly/i})).toBeVisible({timeout: 30000});
    await expect(page.getByTestId('buyer-payment-status')).toContainText(/Pending payment/i, {
      timeout: 30000,
    });
    await expect(page.getByText(fixture.account_number)).toBeVisible({timeout: 15000});

    const reference = `E2E${Date.now().toString().slice(-10)}`;
    await page.getByLabel(/Transaction reference/i).fill(reference);
    await expect(page.getByRole('button', {name: /Verify payment/i})).toBeEnabled({timeout: 15000});
    await page.getByRole('button', {name: /Verify payment/i}).click();

    // Avoid matching FAQ copy that contains "payment is confirmed".
    await expect(page.getByTestId('buyer-payment-status')).toContainText(/^Paid$/i, {timeout: 30000});
    await expect(
      page.getByText(/Payment confirmed\. Your purchased files are ready to download/i),
    ).toBeVisible({timeout: 15000});
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', {name: /e2e-guide\.pdf/i}).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    await page.goto('/my-portal');
    // Guest /my-portal loads the library; without a portal cookie it shows
    // "Session unavailable" with a Link that sets forceRecovery state.
    await page.getByRole('link', {name: /Request a new code/i}).click();
    await expect(page.locator('#purchase-recovery-email')).toBeVisible({timeout: 15000});
    await page.locator('#purchase-recovery-email').fill(buyerEmail);
    await page.getByRole('button', {name: /Email me a sign-in code/i}).click();
    await expect(page.getByRole('alert')).toContainText(/Check your inbox/i, {timeout: 30000});
    await expect(page.locator('#purchase-code')).toBeVisible();

    const code = await test.step('read mocked recovery code', async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          return readRecoveryCode(buyerEmail.toLowerCase());
        } catch {
          await page.waitForTimeout(250);
        }
      }
      return readRecoveryCode(buyerEmail.toLowerCase());
    });

    await page.locator('#purchase-code, input[inputmode="numeric"]').fill(code);
    await page.getByRole('button', {name: /Verify code/i}).click();
    await expect(page).toHaveURL(/\/my-portal/, {timeout: 15000});
    await expect(
      page.getByRole('heading', {name: fixture.product_title}).or(
        page.getByRole('table').getByText(fixture.product_title),
      ),
    ).toBeVisible({timeout: 15000});

    // Avoid matching the sidebar "Downloads" nav button; file actions are "Download <name>".
    const fileDownload = page.getByRole('button', {name: /Download e2e-guide\.pdf/i});
    if (!(await fileDownload.count())) {
      await page.getByRole('button', {name: /^Downloads\b/i}).click();
      await expect(fileDownload).toBeVisible({timeout: 15000});
    }

    // Portal downloads POST for a signed URL then navigate (may not fire Playwright "download").
    const [downloadApi] = await Promise.all([
      page.waitForResponse(
        response =>
          response.url().includes('/my-portal/purchases/') &&
          response.url().includes('/downloads/') &&
          response.request().method() === 'POST' &&
          response.ok(),
        {timeout: 30000},
      ),
      fileDownload.click(),
    ]);
    const payload = (await downloadApi.json()) as {url?: string};
    expect(payload.url).toBeTruthy();
    const fileResponse = await page.request.get(payload.url!);
    expect(fileResponse.ok()).toBeTruthy();
    expect(fileResponse.headers()['content-type'] ?? '').toMatch(/pdf|octet-stream/i);

    await page.getByRole('button', {name: /^Orders$/i}).click();
    await expect(page.getByRole('button', {name: /^Report$/i}).first()).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', {name: /^Report$/i}).first().click();
    await expect(page.getByRole('heading', {name: /Report a payment problem/i})).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('combobox').selectOption('missing_file');
    await page.getByRole('textbox', {name: /Details/i}).fill(
      'Isolated E2E dispute: file download needs support review.',
    );
    const disputeResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/my-portal/purchases/') &&
        response.url().includes('/disputes') &&
        response.request().method() === 'POST',
      {timeout: 30000},
    );
    await page.getByRole('button', {name: /Submit request/i}).click();
    const disputeResponse = await disputeResponsePromise;
    expect([200, 201]).toContain(disputeResponse.status());
    const disputeBody = (await disputeResponse.json()) as {
      dispute?: {id?: string; lifecycle_status?: string};
    };
    expect(disputeBody.dispute?.id).toBeTruthy();
    expect(disputeBody.dispute?.lifecycle_status ?? 'open').toMatch(/open/i);
    await expect(page.getByText(/Support request submitted/i)).toBeVisible({
      timeout: 15000,
    });
  });
});

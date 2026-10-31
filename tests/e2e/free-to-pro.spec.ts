import fs from 'node:fs';
import path from 'node:path';
import {expect, test} from '@playwright/test';

type AllowanceFixture = {
  database: string;
  email: string;
  product_url: string;
  biolink_id: number;
  product_id: number;
  payment_method_id: number;
  upgrade_message: string;
  checkout_block_message: string;
  buyer_block_message: string;
};

function loadFixture(): AllowanceFixture {
  const fixturePath = path.resolve('storage/app/e2e/allowance-fixture.json');
  expect(fs.existsSync(fixturePath), 'allowance fixture missing — run linket:prepare-buyer-e2e').toBeTruthy();
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as AllowanceFixture;
  expect(fixture.database.toLowerCase()).toContain('test');
  return fixture;
}

test.describe('isolated free allowance exhaustion', () => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires LINKET_ISOLATED_E2E=1 against disposable db_test');

  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  test('orders, billing, and the storefront agree that the eleventh sale needs Pro', async ({page}) => {
    test.setTimeout(90_000);
    const fixture = loadFixture();

    await page.goto(fixture.product_url);
    const blockedBuy = page.getByRole('button', {name: fixture.buyer_block_message});
    await expect(blockedBuy.first()).toBeVisible();
    await expect(blockedBuy.first()).toBeDisabled();

    const blocked = await page.request.post(
      `/api/v1/public/biolinks/${fixture.biolink_id}/digital-products/${fixture.product_id}/checkout`,
      {
        data: {
          buyer_name: 'Nathnael',
          buyer_email: 'nathnael-eleventh-browser@example.test',
          creator_payment_method_id: fixture.payment_method_id,
        },
        headers: {Referer: 'https://linket.ddev.site', Accept: 'application/json'},
      },
    );
    expect(blocked.status()).toBe(422);
    const body = (await blocked.json()) as {errors?: {payment?: string[]}};
    expect(body.errors?.payment?.[0]).toBe(fixture.checkout_block_message);

    await page.goto('/login');
    await page.getByRole('textbox', {name: 'Email Address'}).fill(fixture.email);
    await page.getByRole('textbox', {name: 'Password'}).fill('JourneyPassword123!');
    await page.getByRole('button', {name: 'Login'}).click();
    await page.waitForURL(url => !url.pathname.endsWith('/login'), {timeout: 20_000});

    await page.goto('/dashboard/orders');
    await expect(page.getByText('10 verified orders')).toBeVisible();
    await page.getByRole('tab', {name: 'Billing'}).click();
    await expect(page.getByText('Free verified-sales allowance', {exact: true})).toBeVisible();
    await expect(page.getByText('10 of 10 verified sales used')).toBeVisible();
    await expect(page.getByText('0 available · 0 awaiting payment verification')).toBeVisible();
    await expect(page.getByRole('status').filter({hasText: fixture.upgrade_message})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Upgrade to Pro'})).toBeVisible();
  });
});

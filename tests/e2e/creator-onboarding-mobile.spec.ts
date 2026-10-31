import {randomUUID} from 'node:crypto';
import {expect, test} from '@playwright/test';

test('a creator uploads a product and sees updated checklist progress on mobile', async ({page}) => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires an explicitly configured isolated test server and database');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/register');
  await page.locator('#register-email').fill(`mobile-${randomUUID()}@example.test`);
  await page.locator('#register-password').fill('JourneyPassword123!');
  await page.locator('#register-password-confirmation').fill('JourneyPassword123!');
  await page.getByRole('button', {name: 'Create account'}).click();
  await expect(page.getByText('1 of 7 setup steps complete')).toBeVisible();
  // Registration already creates a storefront, so its completed checklist item is not a link.
  await page.goto('/dashboard/stores');
  await expect(page.getByText('Link in bio', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Home'}).click();
  await expect(page.getByText('1 of 7 setup steps complete')).toBeVisible();
  await page.getByRole('link', {name: 'Upload product file'}).click();
  await expect(page).toHaveURL(/\/dashboard\/items\/new$/);
  await expect(page.getByRole('heading', {name: 'Create product'})).toBeVisible();
  await page.getByRole('link', {name: 'Home'}).click();
  await expect(page.getByText('1 of 7 setup steps complete')).toBeVisible();
  await page.getByRole('link', {name: 'Add digital product'}).click();
  await page.getByText('Digital product', {exact: true}).click();
  await page.getByRole('button', {name: 'Continue'}).click();
  await page.getByText('Free access', {exact: true}).click();
  await page.getByRole('button', {name: 'Continue'}).click();
  await page.getByPlaceholder('My digital guide').fill('Mobile test guide');
  await page.getByText('Product files', {exact: true}).first().click();
  await page.locator('input[type=file][multiple]').setInputFiles({
    name: 'guide.txt', mimeType: 'text/plain', buffer: Buffer.from('Test product content'),
  });
  await expect(page.getByText('guide.txt uploaded')).toBeVisible();
  await page.getByRole('button', {name: 'Save draft'}).click();
  await expect(page).toHaveURL(/\/dashboard\/items\/\d+\/edit/);
  await page.getByRole('link', {name: 'Home'}).click();
  await expect(page.getByText('3 of 7 setup steps complete')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const label of ['Get product approved', 'Publish product in storefront']) {
    await page.getByRole('link', {name: label}).click();
    await expect(page).toHaveURL(/\/dashboard\/items\/\d+\/edit/);
    await expect(page.getByRole('heading', {name: /Edit digital product/i})).toBeVisible();
    await page.getByRole('link', {name: 'Home'}).click();
    await expect(page.getByText('3 of 7 setup steps complete')).toBeVisible();
  }
  await page.getByRole('link', {name: 'Configure receiving account'}).click();
  await expect(page).toHaveURL(/\/account-settings\/receiving-accounts$/);
  await expect(page.getByRole('heading', {name: /receiving accounts/i})).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByText('3 of 7 setup steps complete')).toBeVisible();
  await page.getByRole('link', {name: 'Make your first sale'}).click();
  await expect(page).toHaveURL(/\/dashboard\/items$/);
  await expect(page.getByText('Mobile test guide')).toBeVisible();
});

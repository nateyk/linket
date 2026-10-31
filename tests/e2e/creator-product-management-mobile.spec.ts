import {expect, test} from '@playwright/test';

test('creator product dashboard stays usable on a phone viewport', async ({page}) => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires an explicitly configured isolated test server and database');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/login');
  // Seeded local creator from PrepareBuyerE2eCommand / local admin flows when available.
  await page.locator('#email').fill(process.env.LINKET_E2E_CREATOR_EMAIL ?? 'creator@example.test');
  await page.locator('#password').fill(process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'password');
  await page.getByRole('button', {name: /log in|sign in/i}).click();
  await page.goto('/dashboard/items');
  await expect(page.getByRole('heading', {name: /my items/i})).toBeVisible();
  await expect(page.getByLabel(/search products/i)).toBeVisible();
  await expect(page.getByText(/all statuses|draft|live/i).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', {name: /new product/i}).click();
  await expect(page.getByText(/digital product|create product/i).first()).toBeVisible();
});

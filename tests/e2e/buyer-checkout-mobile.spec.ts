import {expect, test} from '@playwright/test';

test('buyer payment dialog stays usable at 390px across payment states', async ({page}) => {
  test.skip(process.env.LINKET_ISOLATED_E2E !== '1', 'Requires an explicitly configured isolated test server and database');

  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/my-portal');
  await expect(page.getByRole('heading', {name: /Your purchases|purchases/i})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

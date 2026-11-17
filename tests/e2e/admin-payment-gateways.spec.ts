import {test, expect} from '@playwright/test';

test.describe.configure({retries: 0});

test.describe('Retired Verify.et admin gateway links', () => {
  test('legacy routes return to platform Chapa settings without exposing Verify.et credentials', async ({page}) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(dashboard|admin)/);

    for (const route of [
      '/admin/financial/payment-gateways',
      '/admin/items/payment-methods',
      '/admin/settings/payment-gateways',
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/financial\/general$/, {timeout: 30000});
      await expect(page.getByText('Payment gateways', {exact: true})).toHaveCount(0);
      await expect(page.getByLabel('API key', {exact: true})).toHaveCount(0);
    }
  });
});

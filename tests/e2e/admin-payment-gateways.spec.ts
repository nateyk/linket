import {test, expect} from '@playwright/test';

test.describe.configure({retries: 0});

test.describe('Admin payment gateways', () => {
  test('admin can open payment methods and receiving account reviews with search', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(dashboard|admin)/);

    await page.goto('/admin/financial/payment-gateways');
    await expect(page.getByText(/payment gateways/i).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Banks and wallets', {exact: true})).toBeVisible();
    await expect(page.getByText('Verify.et connection', {exact: true})).toBeVisible();
    await expect(page.getByLabel('API key', {exact: true})).toHaveValue('');
    await expect(page.getByLabel('Webhook signing secret', {exact: true})).toHaveValue('');
    await expect(page.getByLabel('Webhook URL', {exact: true})).toHaveAttribute('readonly', '');
    await expect(page.getByRole('tab', {name: /receiving account reviews/i})).toHaveCount(0);

    await page.goto(
      '/admin/financial/payment-gateways?search=' + encodeURIComponent('admin@admin.com') + '&lifecycle=pending_ownership_review',
    );
    await expect(page).toHaveURL(/\/admin\/financial\/withdrawal-methods\?/, {timeout: 30000});
    await expect(page.getByText(/receiving accounts/i).first()).toBeVisible({
      timeout: 30000,
    });

    await page.goto('/admin/financial/withdrawal-methods/legacy');
    await expect(
      page.getByText(/creator withdrawal methods/i).first(),
    ).toBeVisible({timeout: 30000});
    await expect(page.getByText(/verify\.et method catalog/i)).toHaveCount(0);
    await expect(
      page.getByRole('button', {name: /^Receiving accounts$/i}).first(),
    ).toBeVisible();
  });
});



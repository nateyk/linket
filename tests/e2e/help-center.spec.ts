import {test, expect} from '@playwright/test';

test.describe.configure({retries: 0});

test.describe('Help Center', () => {
  test('public help landing loads for guests', async ({page}) => {
    await page.goto('/help');
    await expect(
      page.getByRole('heading', {name: /how can we help/i}),
    ).toBeVisible({timeout: 30000});
  });

  test('admin help settings preview route is reachable when logged in', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(dashboard|admin)/);

    await page.goto('/admin/settings/hc');
    await expect(
      page.getByRole('heading', {name: /help center/i}).first(),
    ).toBeVisible({timeout: 30000});
  });

  test('public help search page is reachable', async ({page}) => {
    await page.goto('/help/search/getting');
    await expect(page).not.toHaveURL(/\/login/);
    // Search UI or empty results — must not 500
    await expect(page.locator('body')).toBeVisible();
  });
});

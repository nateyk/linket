import {test, expect} from '@playwright/test';

test.describe.configure({retries: 0});

test.describe('Help Center', () => {
  const stamp = Date.now().toString(36);
  const categoryName = `E2E Category ${stamp}`;
  const articleTitle = `E2E Article ${stamp}`;

  test('admin manages content and visitor reads and reacts', async ({
    page,
  }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@admin.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Create a category
    await page.goto('/admin/settings/help');
    await page.click('button:has-text("New category")');
    await page.fill('input[name="name"]', categoryName);
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator(`text=${categoryName}`)).toBeVisible();

    // category persists after reload
    await page.reload();
    await expect(page.locator(`text=${categoryName}`)).toBeVisible();

    // 3. Create an article
    await page.click('[role="tab"]:has-text("Articles")');
    await page.click('button:has-text("New article")');
    await page.fill('input[name="title"]', articleTitle);
    await page.fill('textarea[name="short_description"]', 'E2E short description');
    const editor = page.locator('.tiptap').first();
    await editor.click();
    await page.keyboard.type('E2E article body content.');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator(`text=${articleTitle}`)).toBeVisible();

    // 4. Public index shows the category
    await page.goto('/help');
    await expect(
      page.locator('h1:has-text("Hi, how can we help?")'),
    ).toBeVisible();
    await expect(page.locator(`text=${categoryName}`).first()).toBeVisible();

    // 5. Search narrows to matching content
    await page.fill('input[name="search"]', articleTitle);
    await page.press('input[name="search"]', 'Enter');
    await expect(page).toHaveURL(/search=/);
    await expect(page.locator(`text=${articleTitle}`).first()).toBeVisible();

    // 6. Open the article and submit feedback
    await page.locator(`a:has-text("${articleTitle}")`).first().click();
    await expect(page.locator(`h1:has-text("${articleTitle}")`)).toBeVisible();
    await expect(page.locator('text=E2E article body content.')).toBeVisible();
    await page.click('button:has-text("Yes")');
    await expect(
      page.locator('text=Thanks for your feedback!'),
    ).toBeVisible();
  });
});

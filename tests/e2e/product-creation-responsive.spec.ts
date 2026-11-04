import {expect, test} from '@playwright/test';

/**
 * Read-only authenticated viewport evidence for all four creation types.
 * Run only against an explicitly configured isolated Linket test database:
 *
 * LINKET_ISOLATED_E2E=1 E2E_NO_SERVER=1 E2E_BASE_URL=https://linket.ddev.site \
 *   npx playwright test tests/e2e/product-creation-responsive.spec.ts
 *
 * Screenshots attach to Playwright's HTML report. No product is submitted,
 * saved, published, purchased or downloaded by these tests.
 */
test.describe('product creation responsive evidence', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires explicitly configured isolated test server and database',
  );

  const viewports = [
    {name: 'mobile', width: 360, height: 800},
    {name: 'tablet', width: 768, height: 1024},
    {name: 'desktop', width: 1440, height: 900},
  ] as const;

  const types = [
    {type: 'digital', heading: /create digital product/i, section: 'Files buyers receive'},
    {type: 'ebook', heading: /create e-book/i, section: 'Book files'},
    {type: 'audio', heading: /create audio/i, section: 'Full audio files'},
    {type: 'course', heading: /create course/i, section: 'Course details'},
  ] as const;

  for (const viewport of viewports) {
    test(`${viewport.name} — all four editors and Preview are reachable without page overflow`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await page.goto('/login');
      await page.locator('#email').fill(
        process.env.LINKET_E2E_CREATOR_EMAIL ?? 'creator@example.test',
      );
      await page.locator('#password').fill(
        process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'password',
      );
      await page.getByRole('button', {name: /log in|sign in/i}).click();

      await page.goto('/dashboard/items/new');
      await expect(page.getByRole('heading', {name: 'What are you selling?'})).toBeVisible();
      await expect(page.getByRole('radio')).toHaveCount(4);
      await expect(page.getByRole('button', {name: 'Continue'})).toBeDisabled();

      for (const item of types) {
        await page.goto(`/dashboard/items/new/${item.type}`);
        await expect(page.getByRole('heading', {name: item.heading, level: 1})).toBeVisible();
        await expect(page.getByRole('heading', {name: item.section})).toBeVisible();

        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        );
        expect(overflow, `${item.type} must not overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

        const preview = page.getByRole('button', {name: 'Preview'});
        await expect(preview).toBeVisible();
        await preview.click();
        await expect(page.getByRole('dialog', {name: 'Customer preview'})).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', {name: 'Customer preview'})).toBeHidden();
        await expect(preview).toBeFocused();

        const screenshotPath = testInfo.outputPath(
          `${item.type}-${viewport.width}px.png`,
        );
        await page.screenshot({path: screenshotPath, fullPage: true});
        await testInfo.attach(`${item.type} ${viewport.width}px`, {
          path: screenshotPath,
          contentType: 'image/png',
        });
      }
    });
  }
});

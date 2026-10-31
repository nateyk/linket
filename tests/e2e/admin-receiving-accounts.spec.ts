import {expect, test, type Page} from '@playwright/test';

test.describe.configure({retries: 0});

async function dismissAdminAlerts(page: Page) {
  const closeButtons = page.locator(
    '[data-site-alert] button, [data-slot="alert"] button',
  );
  const count = await closeButtons.count();
  for (let index = 0; index < Math.min(count, 3); index += 1) {
    await closeButtons.nth(index).click({timeout: 1000}).catch(() => undefined);
  }
}

async function loginAsAdmin(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.context().clearCookies();
    await page.goto('/login');
    const email = page.locator('input[name="email"], #email').first();
    const password = page.locator('input[name="password"], #password').first();
    await email.fill(process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com');
    await password.fill(process.env.E2E_ADMIN_PASSWORD ?? 'password');
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page).toHaveURL(/.*(dashboard|admin)/, {timeout: 20000});
      await dismissAdminAlerts(page);
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

test.describe('Admin receiving accounts', () => {
  test('guest cannot open receiving-account reviews', async ({page}) => {
    await page.goto('/admin/financial/withdrawal-methods');
    await expect(page).toHaveURL(/login|signin|auth/i, {timeout: 30000});
  });

  test('search, filter, review dialog, and legacy separation', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/withdrawal-methods');

    await expect(page.getByText('Receiving accounts').first()).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByText(/legacy creator withdrawal destinations/i),
    ).toBeVisible();
    const legacyLink = page
      .getByRole('link', {name: /legacy payout methods/i})
      .or(page.getByRole('button', {name: /legacy payout methods/i}));
    await expect(legacyLink).toBeVisible();

    await page.getByLabel('Search').fill('admin@admin.com');
    await expect
      .poll(async () => page.url(), {timeout: 15000})
      .toMatch(/search=admin/);
    await expect(page.getByLabel('Loading')).toHaveCount(0, {timeout: 15000});

    const pending = page.getByRole('button', {name: /^Pending:/i});
    if (await pending.isVisible()) {
      await pending.click();
      await expect
        .poll(async () => page.url(), {timeout: 15000})
        .toMatch(/lifecycle=pending_ownership_review/);
      await expect(page.getByLabel('Loading')).toHaveCount(0, {timeout: 15000});
    }

    const review = page.getByRole('button', {name: /^Review$/i}).first();
    if ((await review.count()) > 0) {
      await expect(review).toBeVisible({timeout: 15000});
      await review.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/review receiving account/i)).toBeVisible({
        timeout: 15000,
      });
      await expect(
        dialog.getByText(/checkout (eligible|unavailable)/i).first(),
      ).toBeVisible();
      await expect(
        dialog
          .getByRole('button', {
            name: /approve account|reject|suspend|restore|record verify\.et/i,
          })
          .first(),
      ).toBeVisible();
      await page.keyboard.press('Escape');
    }

    await legacyLink.first().click();
    await expect(page).toHaveURL(/\/withdrawal-methods\/legacy/);
    await expect(
      page.getByText(/creator withdrawal methods/i).first(),
    ).toBeVisible({timeout: 30000});
    await expect(
      page.getByRole('button', {name: /^Receiving accounts$/i}).first(),
    ).toBeVisible();
    await expect(page.getByText(/verify\.et method catalog/i)).toHaveCount(0);
  });


  test('creators deep link lands on receiving accounts with search', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/creators?search=admin@admin.com');
    const manage = page
      .locator('a[href*="/admin/creators/"]:visible')
      .filter({hasText: /^Manage$/i})
      .first();
    await expect(manage).toBeVisible({timeout: 30000});
    await manage.click();
    await expect(page).toHaveURL(/\/admin\/creators\/\d+/);

    await page
      .getByRole('link', {name: /open receiving accounts/i})
      .or(page.getByRole('button', {name: /open receiving accounts/i}))
      .click();
    await expect(page).toHaveURL(
      /\/admin\/financial\/withdrawal-methods\?.*search=/,
      {timeout: 30000},
    );
    await expect(page.getByText('Receiving accounts').first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByLabel('Search')).toHaveValue(/admin@admin\.com/i);
  });

  test('review dialog close, Escape, and focus restoration', async ({page}) => {
    await loginAsAdmin(page);
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/admin/financial/withdrawal-methods');
    await expect(page.getByLabel('Loading')).toHaveCount(0, {timeout: 15000});

    const review = page.getByRole('button', {name: /^Review$/i}).first();
    await expect(review).toBeVisible({timeout: 30000});
    await review.focus();
    await review.click();

    const dialog = page.getByRole('dialog').filter({
      hasText: /review receiving account/i,
    });
    await expect(dialog).toBeVisible({timeout: 15000});
    await expect(
      dialog.getByRole('button', {name: /^Close$/i}),
    ).toBeVisible();

    await dialog.getByRole('button', {name: /^Close$/i}).click();
    await expect(dialog).toHaveCount(0, {timeout: 10000});
    await expect(review).toBeFocused({timeout: 10000});

    await review.click();
    await expect(dialog).toBeVisible({timeout: 15000});
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0, {timeout: 10000});
    await expect(review).toBeFocused({timeout: 10000});
  });

  test('confirm approve dialog ignores backdrop dismissal', async ({page}) => {
    await loginAsAdmin(page);
    await page.goto('/admin/financial/withdrawal-methods?lifecycle=pending_ownership_review');
    await expect(page.getByLabel('Loading')).toHaveCount(0, {timeout: 15000});

    const review = page.getByRole('button', {name: /^Review$/i}).first();
    if ((await review.count()) === 0) {
      test.info().annotations.push({
        type: 'note',
        description: 'No pending receiving accounts for confirm-dismiss check.',
      });
      return;
    }

    await review.click();
    const reviewDialog = page.getByRole('dialog').filter({
      hasText: /review receiving account/i,
    });
    await expect(reviewDialog).toBeVisible({timeout: 15000});
    const approve = reviewDialog.getByRole('button', {name: /^Approve account$/i});
    if ((await approve.count()) === 0) {
      test.info().annotations.push({
        type: 'note',
        description: 'Opened account is not pending approval.',
      });
      return;
    }

    await approve.click();
    const confirm = page.getByRole('dialog').filter({
      hasText: /approve this receiving account/i,
    });
    await expect(confirm).toBeVisible({timeout: 10000});
    await page
      .locator('[data-slot="dialog-backdrop"]')
      .last()
      .click({position: {x: 4, y: 4}})
      .catch(() => undefined);
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', {name: /^Cancel$/i}).click();
    await expect(confirm).toHaveCount(0, {timeout: 10000});
    await expect(reviewDialog).toBeVisible();
  });

  for (const width of [320, 360, 390] as const) {
    test(`legacy withdrawal table has no page overflow at ${width}px`, async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({width, height: 844});
      await page.goto('/admin/financial/withdrawal-methods/legacy');
      await expect(
        page.getByText(/legacy payout destinations are for creator withdrawals/i),
      ).toBeVisible({timeout: 30000});
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 2);
      await expect(
        page.getByText(/Withdrawal destinations/i).first(),
      ).toBeVisible();
      await expect(page.getByRole('button', {name: /^Actions$/i}).first()).toBeVisible({
        timeout: 15000,
      });
    });
  }
});










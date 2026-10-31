import {expect, test, type Page} from '@playwright/test';

test.describe.configure({retries: 0});

async function dismissAdminAlerts(page: Page) {
  const closeButtons = page.locator(
    '[data-slot="alert"] button, [role="alert"] button',
  );
  const count = await closeButtons.count();
  for (let index = 0; index < Math.min(count, 3); index += 1) {
    await closeButtons.nth(index).click({timeout: 1000}).catch(() => undefined);
  }
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  const email = page.locator('input[name="email"], #email').first();
  const password = page.locator('input[name="password"], #password').first();
  await email.fill(process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com');
  await password.fill(process.env.E2E_ADMIN_PASSWORD ?? 'password');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/.*(dashboard|admin)/, {timeout: 30000});
  await dismissAdminAlerts(page);
}

async function openFirstManage(page: Page) {
  const manage = page
    .locator('a[href*="/admin/creators/"]:visible')
    .filter({hasText: /^Manage$/i})
    .first();
  await expect(manage).toBeVisible({timeout: 30000});
  await manage.click();
  await expect(page).toHaveURL(/\/admin\/creators\/\d+/, {timeout: 30000});
}

test.describe('Admin creator management', () => {
  test('directory filters, URL persistence, and mobile headers', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/admin/creators');

    await expect(page.getByText('Creator directory')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/^Creators$/).first()).toBeVisible();
    await expect(page.getByRole('tab', {name: /receiving accounts/i})).toHaveCount(
      0,
    );
    await expect(page.getByText('Receiving account reviews')).toHaveCount(0);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(400);

    await page.getByRole('button', {name: /needs attention/i}).click();
    await expect(page).toHaveURL(/attention=1/, {timeout: 15000});
    await page.reload();
    await expect(page).toHaveURL(/attention=1/);
    await expect(
      page.getByRole('button', {name: /needs attention/i}),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/admin/creators?attention=1');
    await page.goto('/admin/creators?status=active');
    await expect(page).toHaveURL(/status=active/, {timeout: 15000});
    await page.goBack();
    await expect(page).toHaveURL(/attention=1/, {timeout: 15000});

    await page.goto('/admin/creators?search=orders-demo&plan=free');
    await expect(page.getByLabel('Search')).toHaveValue(/orders-demo/i);
    await expect(
      page
        .locator('a[href*="/admin/creators/"]:visible')
        .filter({hasText: /^Manage$/i})
        .first(),
    ).toBeVisible({timeout: 30000});
    await expect(
      page.locator('text=/orders demo creator/i').locator('visible=true').first(),
    ).toBeVisible();

    await page.setViewportSize({width: 320, height: 720});
    await expect(page.getByLabel('Creator actions')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(330);
  });

  test('detail tabs, sales pagination, and suspend/restore flow', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/creators?search=orders-demo-creator');
    await openFirstManage(page);

    await expect(page.getByText(/orders demo creator/i).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('tab', {name: /receiving accounts/i})).toHaveCount(
      0,
    );
    await expect(
      page
        .getByRole('link', {name: /open receiving accounts/i})
        .or(page.getByRole('button', {name: /open receiving accounts/i})),
    ).toBeVisible();

    await page.getByRole('tab', {name: /orders & sales/i}).click();
    await expect(page).toHaveURL(/tab=orders/);
    await expect(
      page.getByText(/pending payment orders do not consume/i).or(
        page.getByText(/only paid orders count toward verified sales/i),
      ),
    ).toBeVisible({timeout: 15000});
    await expect(page.getByRole('columnheader', {name: /payment/i})).toBeVisible({
      timeout: 15000,
    });

    await dismissAdminAlerts(page);
    const next = page.getByRole('button', {name: /^next$/i});
    if (await next.isEnabled()) {
      await next.scrollIntoViewIfNeeded();
      await next.click();
      await expect(page.getByRole('columnheader', {name: /order/i})).toBeVisible();
    }

    await page.setViewportSize({width: 360, height: 800});
    await expect(page.getByLabel('Creator actions')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(370);

    await page.goto('/admin/creators?search=admin@admin.com');
    const adminManage = page
      .locator('a[href*="/admin/creators/"]')
      .filter({hasText: /^Manage$/i});
    if ((await adminManage.count()) === 0) {
      test.info().annotations.push({
        type: 'note',
        description: 'No admin creator row for suspend smoke; skipped.',
      });
      return;
    }
    await adminManage.first().click();
    await expect(page).toHaveURL(/\/admin\/creators\/\d+/);

    const suspend = page.getByRole('button', {name: /suspend/i}).first();
    const reactivate = page.getByRole('button', {name: /reactivate/i}).first();
    if (await suspend.isVisible()) {
      await suspend.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({timeout: 10000});
      const reason = dialog.locator('textarea').first();
      if (await reason.count()) {
        await reason.fill('E2E creator management suspension check');
      }
      await dialog.getByRole('button', {name: /suspend|confirm|ban/i}).last().click();
      await expect(
        page.getByRole('button', {name: /reactivate/i}).first(),
      ).toBeVisible({timeout: 20000});
      await page.getByRole('button', {name: /reactivate/i}).first().click();
      await expect(
        page.getByRole('button', {name: /suspend/i}).first(),
      ).toBeVisible({timeout: 20000});
    } else if (await reactivate.isVisible()) {
      await reactivate.click();
      await expect(
        page.getByRole('button', {name: /suspend/i}).first(),
      ).toBeVisible({timeout: 20000});
    }
  });

  test('empty filter state and loading recovery', async ({page}) => {
    await loginAsAdmin(page);
    await page.goto(
      '/admin/creators?search=' + encodeURIComponent('no-such-creator-xyz-999'),
    );
    await expect(page.getByText(/no matching creators/i)).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole('button', {name: /clear filters/i}).first().click();
    await expect(page).not.toHaveURL(/search=/);
    await expect(page.getByText('Creator directory')).toBeVisible();
  });
});

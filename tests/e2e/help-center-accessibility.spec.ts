import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type Page} from '@playwright/test';

type Fixture = {
  database: string;
  admin: {email: string; password: string};
  published_article: {title: string; url: string};
  category: {name: string};
};

function fixture(): Fixture {
  const host = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').hostname;
  expect(['127.0.0.1', 'localhost', 'linket.ddev.site']).toContain(host);
  const data = JSON.parse(
    fs.readFileSync(path.resolve('storage/app/e2e/hc-fixture.json'), 'utf8'),
  ) as Fixture;
  expect(data.database.toLowerCase()).toContain('test');
  return data;
}

async function login(page: Page, account: Fixture['admin']) {
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(account.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(account.password);
  await page.getByRole('button', {name: 'Login'}).click();
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 45_000});
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await page.setViewportSize({width, height: 800});
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(1);
}

test.describe('Help Center accessibility acceptance (isolated browser)', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires an explicitly isolated, disposable Help Center database',
  );

  test('public article uses named heading and main landmark at mobile widths', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const {published_article: article} = fixture();
    await page.goto(article.url);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', {level: 1, name: article.title})).toBeVisible();
    await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);

    for (const width of [320, 390, 640]) {
      await expectNoHorizontalOverflow(page, width);
    }
    await testInfo.attach('public-help-center-390px', {
      body: await page.screenshot({fullPage: true}),
      contentType: 'image/png',
    });
  });

  test('category dialog opens by keyboard, announces labels and restores focus', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await login(page, fixture().admin);
    await page.goto('/admin/help/arrange');
    const trigger = page.getByRole('button', {name: 'New category'});
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', {name: 'Name'})).toBeFocused();
    await expect(dialog.getByRole('textbox', {name: 'Description'})).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('admin tabs and category actions are keyboard reachable', async ({page}) => {
    test.setTimeout(90_000);
    await login(page, fixture().admin);
    await page.goto('/admin/help/arrange');
    const articles = page.getByRole('tab', {name: 'All articles'});
    await articles.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/articles/);
    const structure = page.getByRole('tab', {name: 'Structure'});
    await structure.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/arrange/);

    const category = page.getByRole('button', {name: fixture().category.name, exact: true});
    await category.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/arrange\/categories\/\d+/);
  });

  test('shared admin sidebar and editor remain usable at zoom-equivalent widths', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await login(page, fixture().admin);
    await page.goto('/admin/help/arrange');
    for (const width of [320, 390, 640]) {
      await expectNoHorizontalOverflow(page, width);
    }
    await testInfo.attach('admin-help-center-390px', {
      body: await page.screenshot({fullPage: true}),
      contentType: 'image/png',
    });

    await page.goto('/admin/help/articles/new');
    await expect(page.getByRole('heading', {name: 'Title'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Create', exact: true})).toBeVisible();
    await expectNoHorizontalOverflow(page, 390);
  });
});

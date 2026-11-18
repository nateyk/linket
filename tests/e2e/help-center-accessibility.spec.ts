import {loadIsolatedHcFixture, loginToHc} from './help-center-isolated-helpers';
import {expect, test, type Page} from '@playwright/test';

type Fixture = {
  database: string;
  admin: {email: string; password: string};
  a11y_accounts: Record<'dialog' | 'navigation' | 'responsive', {email: string; password: string}>;
  published_article: {title: string; url: string};
  category: {name: string};
};

const fixture = () => loadIsolatedHcFixture<Fixture>();

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
    await loginToHc(page, fixture().a11y_accounts.dialog);
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
    await loginToHc(page, fixture().a11y_accounts.navigation);
    await page.goto('/admin/help/arrange');
    const structure = page.getByRole('tab', {name: 'Structure'});
    const articles = page.getByRole('tab', {name: 'All articles'});

    await expect(structure).toHaveAttribute('aria-selected', 'true');
    await structure.press('ArrowRight');
    await expect(articles).toBeFocused();
    await articles.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/articles(?:\?|$)/);

    // Each destination renders a new tab list. Wait for the destination's
    // controls and selected tab, not just the address bar, before sending
    // keyboard input to the newly mounted page.
    await expect(page.getByRole('link', {name: 'Add article'})).toBeVisible();
    await expect(articles).toHaveAttribute('aria-selected', 'true');
    await articles.press('ArrowLeft');
    await expect(structure).toBeFocused();
    await structure.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/arrange(?:\?|$)/);
    await expect(structure).toHaveAttribute('aria-selected', 'true');

    const category = page.getByRole('button', {name: fixture().category.name, exact: true});
    await expect(category).toBeVisible();
    await category.press('Enter');
    await expect(page).toHaveURL(/\/admin\/help\/arrange\/categories\/\d+/);
  });

  test('shared admin sidebar and editor remain usable at zoom-equivalent widths', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await loginToHc(page, fixture().a11y_accounts.responsive);
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

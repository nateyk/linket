import fs from 'node:fs';
import path from 'node:path';
import {expect, test} from '@playwright/test';

type HcFixture = {
  database: string;
  admin: {email: string; password: string};
  free_creator: {email: string; password: string};
  pro_creator: {email: string; password: string};
  buyer: {email: string; password: string};
  published_article: {id: number; title: string; slug: string; url: string};
  draft_article: {id: number; title: string; slug: string; url: string};
  ticket: {id: number; subject: string; customer_url: string; agent_url: string};
  routes: {
    help_landing: string;
    help_search: string;
    new_ticket: string;
    admin_hc_settings: string;
    agent_hc_arrange: string;
    agent_inbox: string;
  };
};

function loadFixture(): HcFixture {
  const fixturePath = path.resolve('storage/app/e2e/hc-fixture.json');
  expect(
    fs.existsSync(fixturePath),
    'hc fixture missing — run linket:prepare-hc-e2e',
  ).toBeTruthy();
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as HcFixture;
  expect(fixture.database.toLowerCase()).toContain('test');
  return fixture;
}

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(email);
  await page.getByRole('textbox', {name: 'Password'}).fill(password);
  await page.getByRole('button', {name: 'Login'}).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'), {timeout: 45_000});
}

test.describe('isolated Help Center + support', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires LINKET_ISOLATED_E2E=1 against disposable db_test',
  );

  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  test('public HC: landing, published article, search; draft blocked; mobile 390px', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const fixture = loadFixture();

    await page.setViewportSize({width: 390, height: 844});
    await page.goto(fixture.routes.help_landing);
    await expect(
      page.getByRole('heading', {name: /how can we help/i}),
    ).toBeVisible({timeout: 30000});
    await expect(
      page.getByText(fixture.published_article.title).first(),
    ).toBeVisible({timeout: 30000});
    await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await page.goto(fixture.published_article.url);
    await expect(
      page.getByRole('heading', {name: fixture.published_article.title}).first(),
    ).toBeVisible({timeout: 30000});
    await expect(page.locator('main, article, .prose').first()).toContainText(
      /Welcome|Browse help|Open a ticket|published article/i,
      {timeout: 15000},
    );

    await page.goto(fixture.draft_article.url);
    await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);
    await expect(
      page.getByText(/This draft must stay unpublished/i),
    ).toHaveCount(0);

    await page.goto(fixture.routes.help_search);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  for (const persona of ['free_creator', 'pro_creator', 'buyer'] as const) {
    test(`${persona} can browse published HC and open ticket portal`, async ({page}) => {
      test.setTimeout(120_000);
      const fixture = loadFixture();
      const creds = fixture[persona];

      await page.setViewportSize({width: 1280, height: 900});
      await login(page, creds.email, creds.password);

      await page.goto(fixture.routes.help_landing);
      await expect(page.getByText(fixture.published_article.title).first()).toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);

      await page.goto(fixture.published_article.url);
      await expect(
        page
          .getByRole('heading', {name: fixture.published_article.title})
          .or(page.getByText(fixture.published_article.title))
          .first(),
      ).toBeVisible({timeout: 30000});

      await page.goto(fixture.routes.new_ticket);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page
          .getByRole('listitem')
          .filter({hasText: /new ticket/i})
          .or(page.getByRole('heading', {name: /new ticket/i}))
          .or(page.getByLabel(/subject/i))
          .or(page.getByText(/subject/i))
          .first(),
      ).toBeVisible({timeout: 30000});
    });
  }

  test('buyer ticket: sees public reply, not staff note; admin can open inbox ticket', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const fixture = loadFixture();

    await login(page, fixture.buyer.email, fixture.buyer.password);
    await page.goto(fixture.ticket.customer_url);
    await expect(page.getByText(fixture.ticket.subject).first()).toBeVisible({timeout: 30000});
    await expect(page.getByText(/reviewing your request/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText(/Private staff note/i)).toHaveCount(0);

    await page.goto('/logout').catch(() => undefined);
    await page.context().clearCookies();

    await login(page, fixture.admin.email, fixture.admin.password);
    await page.goto(fixture.ticket.agent_url);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .getByText(fixture.ticket.subject)
        .or(page.getByText(/reviewing your request|staff note|E2E HC/i))
        .first(),
    ).toBeVisible({timeout: 30000});
  });

  test('admin HC settings + arrange manager reachable', async ({page}) => {
    test.setTimeout(120_000);
    const fixture = loadFixture();

    await login(page, fixture.admin.email, fixture.admin.password);

    await page.goto(fixture.routes.admin_hc_settings);
    await expect(
      page.getByRole('heading', {name: /help center/i}).first(),
    ).toBeVisible({timeout: 30000});

    await page.goto(fixture.routes.agent_hc_arrange);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .getByText(/E2E Getting Started|categories|articles|arrange/i)
        .first(),
    ).toBeVisible({timeout: 30000});
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type Browser, type Page} from '@playwright/test';

type Credentials = {email: string; password: string};
type HcFixture = {
  database: string;
  admin: Credentials;
  agent: Credentials;
  buyer: Credentials;
  category: {id: number; name: string};
  section: {id: number; name: string};
  published_article: {id: number; title: string; url: string};
  draft_article: {id: number; title: string; url: string};
};

function fixture(): HcFixture {
  // The suite mutates data. Never allow an arbitrary remote URL to be targeted
  // even when a fixture file exists on the developer's machine.
  const host = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').hostname;
  expect(
    ['127.0.0.1', 'localhost', 'linket.ddev.site'].includes(host),
    `Refusing destructive E2E tests against non-local host: ${host}`,
  ).toBe(true);
  const filename = path.resolve('storage/app/e2e/hc-fixture.json');
  expect(fs.existsSync(filename), 'Run linket:prepare-hc-e2e against the disposable test database').toBe(true);
  const data = JSON.parse(fs.readFileSync(filename, 'utf8')) as HcFixture;
  expect(data.database.toLowerCase()).toContain('test');
  return data;
}

async function login(page: Page, credentials: Credentials) {
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(credentials.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(credentials.password);
  await page.getByRole('button', {name: 'Login'}).click();
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 45_000});
}

function uniqueName(subject: string): string {
  return `E2E ${subject} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

function articleResponse(page: Page, operation: 'create' | 'update') {
  return page.waitForResponse(response => {
    const url = new URL(response.url());
    const request = response.request();
    if (request.method() !== 'POST' || !response.ok()) return false;
    // The shared Axios client tunnels PUT as POST with an override header.
    if (operation === 'update') {
      return /\/api\/v1\/hc\/articles\/\d+$/.test(url.pathname) &&
        (url.searchParams.get('_method') === 'PUT' ||
          request.headers()['x-http-method-override'] === 'PUT');
    }
    return /\/api\/v1\/hc\/articles$/.test(url.pathname) &&
      !url.searchParams.has('_method');
  });
}

async function createDraftArticle(
  page: Page,
  sectionId: number,
  title: string,
  body: string,
): Promise<number> {
  await page.goto('/admin/help/arrange/sections/' + sectionId);
  await page.getByRole('link', {name: 'New article'}).click();
  await expect(page).toHaveURL(new RegExp('/admin/help/arrange/sections/' + sectionId + '/articles/new'));
  await page.getByRole('heading', {name: 'Title'}).click();
  await page.getByPlaceholder('Title').fill(title);
  await page.locator('.tiptap[contenteditable="true"]').fill(body);

  const created = articleResponse(page, 'create');
  await page.getByRole('button', {name: 'Create', exact: true}).click();
  const response = await (await created).json() as {article: {id: number}};
  const id = response.article.id;
  expect(id).toBeGreaterThan(0);
  await expect(page).toHaveURL(new RegExp('/admin/help/articles/' + id + '/edit'));
  await expect(page.getByRole('button', {name: 'Publish'})).toBeEnabled();
  return id;
}

async function saveDraftAndCheckMobileEditor(page: Page, body: string): Promise<void> {
  const editor = page.locator('.tiptap[contenteditable="true"]');
  await editor.fill(body);
  const saved = articleResponse(page, 'update');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await saved;
  await page.reload();
  await expect(editor).toContainText(body);

  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', {name: 'Publish'})).toBeVisible();
  await page.setViewportSize({width: 1280, height: 900});
}

async function verifyGuestPublishingAndRemoval(
  page: Page,
  browser: Browser,
  title: string,
  body: string,
): Promise<void> {
  const published = articleResponse(page, 'update');
  await page.getByRole('button', {name: 'Publish'}).click();
  await published;
  await expect(page.getByRole('button', {name: 'Unpublish'})).toBeVisible();

  const href = await page.getByRole('link', {name: 'Preview in Help Center'}).getAttribute('href');
  expect(href).toBeTruthy();
  const publicUrl = new URL(href!, page.url()).toString();
  const guestContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
  });
  try {
    const guest = await guestContext.newPage();
    await guest.goto(publicUrl);
    await expect(guest.getByRole('heading', {name: title}).first()).toBeVisible({timeout: 30_000});
    await expect(guest.getByText(body).first()).toBeVisible();
    const searchUrl = '/hc/search/' + encodeURIComponent(title);

    // Check the API separately so a search-index failure cannot be hidden by
    // a browser query/router issue. Keep the actual UI assertion afterwards.
    const searchResponse = await guest.request.get('/api/v1/search/articles', {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        // Direct Playwright APIRequestContext calls do not add the browser's
        // Referer; Linket correctly rejects non-frontend API access with 401.
        Referer: guest.url(),
      },
      params: {query: title, perPage: '30'},
    });
    const searchBody = await searchResponse.text();
    expect(
      searchResponse.ok(),
      `Guest search API HTTP ${searchResponse.status()}: ${searchBody.slice(0, 600)}`,
    ).toBeTruthy();
    const found = JSON.parse(searchBody) as {
      pagination: {data: Array<{id: number; title: string}>};
    };
    expect(found.pagination.data.map(article => article.title)).toContain(title);

    await guest.goto(searchUrl);
    await expect(guest.getByRole('link', {name: title, exact: true})).toBeVisible();

    await guest.goto(publicUrl);
    const unpublished = articleResponse(page, 'update');
    await page.getByRole('button', {name: 'Unpublish'}).click();
    await unpublished;
    await expect(page.getByRole('button', {name: 'Publish'})).toBeVisible();

    await guest.reload();
    await expect(guest.getByText(body)).toHaveCount(0);
    await guest.goto(searchUrl);
    await expect.poll(async () => {
      await guest.reload();
      return guest.getByRole('link', {name: title, exact: true}).count();
    }, {timeout: 30_000, intervals: [1000, 2000, 4000]}).toBe(0);
  } finally {
    await guestContext.close();
  }
}

async function deleteArticleFromSection(
  page: Page,
  sectionId: number,
  title: string,
): Promise<void> {
  await page.goto('/admin/help/arrange/sections/' + sectionId);
  const articleRow = page.locator('div.cursor-pointer').filter({
    has: page.getByRole('button', {name: title, exact: true}),
  }).first();
  await expect(articleRow).toBeVisible();
  await articleRow.getByRole('button', {name: 'More actions'}).click();
  await page.getByRole('menuitem', {name: 'Delete'}).click();
  await page.getByRole('alertdialog').getByRole('button', {name: 'Delete'}).click();
  await expect(page.getByRole('button', {name: title, exact: true})).toHaveCount(0);
}

test.describe('isolated Help Center product acceptance', () => {
  // This suite is intentionally never run against production or a shared DB.
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires isolated, disposable Help Center Playwright fixtures',
  );

  test('admin creates a category and section without leaving the shared admin shell', async ({page}) => {
    test.setTimeout(120_000);
    const {admin} = fixture();
    await login(page, admin);
    await page.goto('/admin/help/arrange');
    const categoryName = uniqueName('Category');
    const sectionName = uniqueName('Section');

    await page.getByRole('button', {name: 'New category'}).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', {name: 'Name'}).fill(categoryName);
    await dialog.getByRole('button', {name: 'Create', exact: true}).click();
    await expect(page).toHaveURL(/\/admin\/help\/arrange\/categories\/\d+/, {timeout: 30_000});
    await expect(page.getByText(categoryName).first()).toBeVisible();
    await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();

    await page.getByRole('button', {name: 'New section'}).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', {name: 'Name'}).fill(sectionName);
    await dialog.getByRole('button', {name: 'Create', exact: true}).click();
    await expect(page).toHaveURL(/\/admin\/help\/arrange\/sections\/\d+/, {timeout: 30_000});
    await expect(page.getByText(sectionName).first()).toBeVisible();

    for (const width of [390, 320]) {
      await page.setViewportSize({width, height: 844});
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll('body *')]
          .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 8)
          .map(element => ({tag: element.tagName, className: String(element.className).slice(0, 100)})),
      }));
      expect(overflow.width, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(width);
      await expect(page.getByRole('link', {name: 'Back'})).toBeVisible();
    }
    await page.getByRole('link', {name: 'Back'}).click();
    await expect(page).toHaveURL(/\/admin\/help\/arrange\/categories\/\d+/);
  });

  test('admin creates, edits, publishes, unpublishes and deletes an article', async ({page, browser}) => {
    test.setTimeout(180_000);
    const {admin, section} = fixture();
    const title = uniqueName('Article');
    const initialBody = 'Initial article body for ' + title;
    const revisedBody = 'Revised article body for ' + title;

    await login(page, admin);
    await createDraftArticle(page, section.id, title, initialBody);
    await saveDraftAndCheckMobileEditor(page, revisedBody);
    await verifyGuestPublishingAndRemoval(page, browser, title, revisedBody);
    await deleteArticleFromSection(page, section.id, title);
  });

  test('published search is public while drafts remain private', async ({page}) => {
    const {published_article: published, draft_article: draft} = fixture();
    await page.goto('/hc/search/getting');
    await expect(page.getByRole('link', {name: published.title, exact: true}).first()).toBeVisible({timeout: 30_000});
    await expect(page.getByText(draft.title)).toHaveCount(0);
    await page.goto(draft.url);
    await expect(page.getByText(draft.title)).toHaveCount(0);
  });

  test('public article edit links open the correct admin and agent dashboards', async ({page, browser}) => {
    test.setTimeout(120_000);
    const {admin, agent, published_article: published} = fixture();

    await login(page, admin);
    await page.goto(published.url);
    const adminEdit = page.getByRole('link', {name: 'Edit article'});
    await expect(adminEdit).toHaveAttribute('href', `/admin/help/articles/${published.id}/edit`);
    await adminEdit.click();
    await expect(page).toHaveURL(new RegExp(`/admin/help/articles/${published.id}/edit`));
    await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeVisible();

    const agentContext = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    });
    try {
      const agentPage = await agentContext.newPage();
      await login(agentPage, agent);
      await agentPage.goto(published.url);
      const agentEdit = agentPage.getByRole('link', {name: 'Edit article'});
      await expect(agentEdit).toHaveAttribute('href', `/agent/hc/articles/${published.id}/edit`);
      await agentEdit.click();
      await expect(agentPage).toHaveURL(new RegExp(`/agent/hc/articles/${published.id}/edit`));
      await expect(agentPage.getByRole('button', {name: 'Save', exact: true})).toBeVisible();
    } finally {
      await agentContext.close();
    }
  });

  test('an agent can manage content without switching into the admin shell; buyer cannot edit', async ({page, browser}) => {
    test.setTimeout(120_000);
    const {agent, buyer, draft_article: draft} = fixture();
    await login(page, agent);
    await page.goto('/agent/hc/arrange');
    await expect(page).toHaveURL(/\/agent\/hc\/arrange/);
    await expect(page.getByRole('button', {name: 'New category'})).toBeVisible();
    await page.goto('/admin/help/arrange');
    await expect(page.getByRole('button', {name: 'New category'})).toHaveCount(0);

    const buyerContext = await browser.newContext({baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173'});
    try {
      const buyerPage = await buyerContext.newPage();
      await login(buyerPage, buyer);
      await buyerPage.goto(`/agent/hc/articles/${draft.id}/edit`);
      // The route guard must prevent displaying an editor with draft content.
      await expect(buyerPage.getByRole('button', {name: 'Save', exact: true})).toHaveCount(0);
      await expect(buyerPage.getByText('This draft must stay unpublished for public users.')).toHaveCount(0);
    } finally {
      await buyerContext.close();
    }
  });
});

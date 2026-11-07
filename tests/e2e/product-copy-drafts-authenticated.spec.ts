import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {expect, test, type Page} from '@playwright/test';

/**
 * Authenticated, unmocked Laravel + MySQL acceptance for PR-05.
 * The fixture is seeded by linket:prepare-ai-copy-e2e against a disposable
 * database. Synthetic drafts are inserted by the server; no live AI calls.
 */
type Scenario = {
  id: number;
  draft_id: string;
  original_description: string;
};
type Fixture = {
  database: string;
  creator_email: string;
  creator_password: string;
  other_email: string;
  other_password: string;
  products: {apply: Scenario; discard: Scenario};
};

const isolated =
  process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  !!process.env.LINKET_AI_COPY_E2E_DB?.includes('test') &&
  process.env.DB_DATABASE === process.env.LINKET_AI_COPY_E2E_DB &&
  process.env.E2E_BASE_URL === 'http://127.0.0.1:18085';

function readFixture(): Fixture {
  const location = path.resolve('storage/app/e2e/ai-copy-fixture.json');
  expect(
    fs.existsSync(location),
    'A prepared isolated fixture must exist',
  ).toBe(true);
  const fixture = JSON.parse(fs.readFileSync(location, 'utf8')) as Fixture;
  expect(fixture.database).toBe(process.env.DB_DATABASE);
  expect(fixture.creator_email).toMatch(/^e2e-ai-copy-.*@example\.test$/);
  expect(fixture.products.apply.id).toBeGreaterThan(0);
  expect(fixture.products.discard.id).toBeGreaterThan(0);
  return fixture;
}

async function signIn(page: Page, email: string, password: string) {
  const errors: string[] = [];
  page.on('pageerror', error =>
    errors.push('page: ' + error.message.slice(0, 250)),
  );
  page.on('console', event => {
    if (event.type() === 'error')
      errors.push('console: ' + event.text().slice(0, 250));
  });
  page.on('response', response => {
    if (response.status() >= 400)
      errors.push(
        'HTTP ' + response.status() + ' ' + new URL(response.url()).pathname,
      );
  });
  const loginPage = await page.goto('/login');
  const heading = page.getByRole('heading', {name: 'Login to your account'});
  try {
    await expect(heading).toBeVisible({timeout: 20000});
  } catch {
    const text = (await page.locator('body').innerText()).slice(0, 500);
    const scripts = await page
      .locator('script[src]')
      .evaluateAll(nodes =>
        nodes.slice(0, 8).map(node => (node as HTMLScriptElement).src),
      );
    throw new Error(
      `Isolated login not rendering: HTTP ${loginPage?.status()} URL=${page.url()} BODY=${JSON.stringify(text)} SCRIPTS=${JSON.stringify(scripts)} ERRORS=${JSON.stringify(errors.slice(-12))}`,
    );
  }
  await page.getByRole('textbox', {name: 'Email Address'}).fill(email);
  await page.getByRole('textbox', {name: 'Password'}).fill(password);
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 20000});
}

async function browserApi(
  page: Page,
  url: string,
  method: 'GET' | 'PATCH' | 'POST' = 'GET',
  data?: Record<string, unknown>,
) {
  // page.request does not send the dashboard's same-origin Referer/CSRF
  // headers, so it exercises a different authentication boundary.
  // Browser fetch runs with the actual logged-in session and its referer.
  return page.evaluate(
    async ({url, method, data}) => {
      const csrf = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]',
      )?.content;
      const xsrfCookie = document.cookie
        .split('; ')
        .find(entry => entry.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(csrf ? {'X-CSRF-TOKEN': csrf} : {}),
          ...(xsrfCookie
            ? {'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie)}
            : {}),
        },
        ...(data ? {body: JSON.stringify(data)} : {}),
      });
      return {
        status: response.status,
        cacheControl: response.headers.get('cache-control'),
        body: await response.json().catch(() => ({})),
      };
    },
    {url, method, data},
  );
}

function forbidGenerations(page: Page) {
  // A real generation request would require calling a provider. Block it
  // even if another UI callback accidentally starts one during acceptance.
  return page.route('**/copy-proposals', route =>
    route.fulfill({
      status: 503,
      json: {message: 'Synthetic E2E forbids provider calls'},
    }),
  );
}

test.describe('PR-05 durable AI drafts — authenticated Laravel browser acceptance', () => {
  test.skip(
    !isolated,
    'Needs explicit isolated database and loopback test server',
  );
  test.describe.configure({mode: 'serial'});
  test.setTimeout(90000);

  test('375px: creator saves private review, reopens it and applies once through real autosave', async ({
    page,
  }, testInfo) => {
    const fixture = readFixture();
    const product = fixture.products.apply;
    await page.setViewportSize({width: 375, height: 812});
    await forbidGenerations(page);
    await signIn(page, fixture.creator_email, fixture.creator_password);
    await page.goto(`/dashboard/items/${product.id}/edit`);

    await expect(
      page.getByRole('heading', {name: 'Edit digital product'}),
    ).toBeVisible();
    const review = page.getByRole('textbox', {
      name: /Suggested description — edit before use/,
    });
    await expect(review).toBeVisible({timeout: 20000});
    await expect(review).toHaveValue('Suggested apply printable exercises.');
    const copy = 'Creator-reviewed full-app browser exercises.';
    await review.fill(copy);
    const reviewSaved = page.waitForResponse(
      response =>
        new URL(response.url()).pathname.endsWith(
          '/copy-drafts/' + product.draft_id,
        ) &&
        response.status() === 200 &&
        ['PATCH', 'POST'].includes(response.request().method()),
    );
    await page.getByRole('button', {name: 'Save private draft'}).click();
    await reviewSaved;
    await expect(
      page.getByRole('status').filter({hasText: 'Private review saved'}),
    ).toBeVisible();

    const privateRead = await browserApi(
      page,
      `/api/v1/creator-ai/products/${product.id}/copy-drafts/${product.draft_id}`,
    );
    expect(privateRead.status).toBe(200);
    expect(privateRead.cacheControl).toContain('no-store');
    expect(
      (privateRead.body as {data: {description: string}}).data.description,
    ).toBe(copy);

    await page.reload();
    const reopened = page.getByRole('textbox', {
      name: /Suggested description — edit before use/,
    });
    await expect(reopened).toHaveValue(copy);
    const overflow = await page.evaluate(() =>
      Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    );
    expect(
      overflow,
      'Narrow editor has no horizontal scroll',
    ).toBeLessThanOrEqual(1);

    const saveRequest = page.waitForResponse(
      response =>
        new URL(response.url()).pathname ===
          `/api/v1/items/${product.id}/draft` &&
        response.status() === 200 &&
        ['PUT', 'POST'].includes(response.request().method()),
      {timeout: 30000},
    );
    await page.getByRole('button', {name: 'Apply', exact: true}).click();
    await saveRequest;

    await expect
      .poll(async () => {
        const res = await browserApi(
          page,
          `/api/v1/creator-ai/products/${product.id}/copy-drafts/${product.draft_id}`,
        );
        if (res.status !== 200) return '';
        return (res.body as {data: {state: string}}).data.state;
      })
      .toBe('applied');
    const productGet = await browserApi(page, `/api/v1/items/${product.id}`);
    expect(productGet.status).toBe(200);
    const saved = (
      productGet.body as {data: {description: string; content_revision: number}}
    ).data;
    expect(saved.description).toContain(copy);
    expect(saved.content_revision).toBe(1);

    const capture = testInfo.outputPath('ai-private-copy-375px.png');
    await page.screenshot({path: capture, fullPage: true});
    await testInfo.attach('Authenticated AI copy 375px', {
      path: capture,
      contentType: 'image/png',
    });
  });

  test('1440px: Discard changes only the private draft, never the real product', async ({
    page,
  }) => {
    const fixture = readFixture();
    const product = fixture.products.discard;
    await page.setViewportSize({width: 1440, height: 900});
    await forbidGenerations(page);
    await signIn(page, fixture.creator_email, fixture.creator_password);
    await page.goto(`/dashboard/items/${product.id}/edit`);
    await expect(
      page.getByRole('textbox', {
        name: /Suggested description — edit before use/,
      }),
    ).toHaveValue('Suggested discard printable exercises.');
    const discarded = page.waitForResponse(
      response =>
        new URL(response.url()).pathname.endsWith(
          '/copy-drafts/' + product.draft_id + '/discard',
        ) && response.status() === 200,
    );
    await page.getByRole('button', {name: 'Discard'}).click();
    await discarded;
    await expect(
      page.getByRole('status').filter({hasText: 'Suggestion discarded'}),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {name: 'Suggest copy'}),
    ).toBeFocused();
    const productGet = await browserApi(page, `/api/v1/items/${product.id}`);
    expect(
      (productGet.body as {data: {description: string}}).data.description,
    ).toBe(product.original_description);
    const saved = await browserApi(
      page,
      `/api/v1/creator-ai/products/${product.id}/copy-drafts/${product.draft_id}`,
    );
    expect((saved.body as {data: {state: string}}).data.state).toBe(
      'discarded',
    );
  });

  test('other logged-in creator cannot read, review or discard a private draft', async ({
    page,
  }) => {
    const fixture = readFixture();
    const product = fixture.products.apply;
    await signIn(page, fixture.other_email, fixture.other_password);
    const path = `/api/v1/creator-ai/products/${product.id}/copy-drafts/${product.draft_id}`;
    const get = await browserApi(page, path);
    expect(get.status).toBe(404);
    const patch = await browserApi(page, path, 'PATCH', {
      version: 0,
      description: 'Unauthorized overwrite.',
    });
    expect(patch.status).toBe(404);
    const discard = await browserApi(page, path + '/discard', 'POST', {
      version: 0,
    });
    expect(discard.status).toBe(404);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type BrowserContext, type Page} from '@playwright/test';

type ReviewType = 'digital' | 'ebook' | 'audio' | 'course';

type ReviewFixture = {
  database: string;
  review_product_id: number;
  review_product_ids: Record<ReviewType, number>;
};

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

function fixture(): ReviewFixture {
  const fixturePath = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(fixturePath), 'Guarded buyer fixture is required').toBeTruthy();
  const value = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as ReviewFixture;
  expect(value.database.toLowerCase()).toContain('test');
  expect(value.review_product_id).toBeGreaterThan(0);
  return value;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
  await page.getByRole('textbox', {name: 'Email Address'}).fill(email);
  await page.getByRole('textbox', {name: 'Password'}).fill(password);
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, {timeout: 15000});
}

function reviewRequest(response: {url(): string; request(): {method(): string}}, id: number, action: string) {
  return new URL(response.url()).pathname === `/api/v1/admin/items/${id}/${action}`
    && response.request().method() === 'POST';
}

async function rejectInAdmin(page: Page, id: number, reason: string) {
  const button = page.getByRole('button', {name: 'Reject', exact: true});
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {name: 'Reject product'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', {name: 'Rejection reason'}).fill(reason);
  const responsePromise = page.waitForResponse(response => reviewRequest(response, id, 'reject'));
  await dialog.getByRole('button', {name: 'Reject', exact: true}).click();
  const response = await responsePromise;
  expect(response.status(), 'Actual admin rejection endpoint').toBe(200);
  return response.json() as Promise<{status: string; title: string}>;
}

test('isolated real creator ↔ admin review, rejection, resubmission and approved update rollback', async ({
  browser,
}, testInfo) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Never run moderation writes outside the disposable test database',
  );
  test.setTimeout(180_000);

  const {review_product_id: id} = fixture();
  const adminContext = await browser.newContext({
    baseURL,
    viewport: {width: 1280, height: 900},
  });
  const creatorContext = await browser.newContext({
    baseURL,
    viewport: {width: 375, height: 812},
  });
  const admin = await adminContext.newPage();
  const creator = await creatorContext.newPage();
  const originalTitle = 'E2E Moderation Lifecycle Guide';

  try {
    await signIn(
      creator,
      process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test',
      process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23',
    );
    await creator.goto(`/dashboard/items/${id}/edit`);
    await expect(creator.getByRole('heading', {name: 'Edit digital product', level: 1})).toBeVisible();
    await expect(creator.locator('[aria-label="In review"]')).toBeVisible();

    // A creator session must not be able to read admin moderation details.
    const ownerAdminAccess = await creator.request.get(`/api/v1/admin/items/${id}`);
    expect([401, 403], 'Creator cannot access admin moderation API')
      .toContain(ownerAdminAccess.status());

    const reviewerPassword = process.env.LINKET_E2E_REVIEWER_PASSWORD;
    expect(reviewerPassword, 'Moderation QA requires a temporary reviewer credential')
      .toBeTruthy();
    await signIn(
      admin,
      process.env.LINKET_E2E_REVIEWER_EMAIL ?? 'e2e-product-reviewer@example.test',
      reviewerPassword!,
    );
    await admin.goto(`/admin/items/${id}`);
    await expect(admin.getByText(originalTitle).first()).toBeVisible();

    const rejected = await rejectInAdmin(admin, id, 'Explain the product content before approval.');
    expect(rejected.status).toBe('rejected');
    await creator.reload();
    await expect(creator.locator('[aria-label="Needs changes"]')).toBeVisible();
    await expect(creator.getByRole('button', {name: 'Submit for review'})).toBeEnabled();

    const resubmissionPromise = creator.waitForResponse(response =>
      new URL(response.url()).pathname === `/api/v1/items/${id}/submit`
      && response.request().method() === 'POST',
    );
    await creator.getByRole('button', {name: 'Submit for review'}).click();
    const submitted = await resubmissionPromise;
    expect(submitted.status(), 'Real creator resubmission endpoint').toBe(200);
    expect(((await submitted.json()) as {data: {status: string}}).data.status)
      .toBe('pending_approval');

    await admin.reload();
    const approvalPromise = admin.waitForResponse(response => reviewRequest(response, id, 'approve'));
    await expect(admin.getByRole('button', {name: 'Approve', exact: true})).toBeVisible();
    await admin.getByRole('button', {name: 'Approve', exact: true}).click();
    const approved = await approvalPromise;
    expect(approved.status(), 'Real admin approval endpoint').toBe(200);
    expect(((await approved.json()) as {status: string}).status).toBe('approved');

    await creator.goto(`/dashboard/items/${id}/edit`);
    await expect(creator.locator('[aria-label="Approved"]')).toBeVisible();

    // Editing an approved product must queue review without unpublishing it.
    const changedTitle = 'E2E Moderation Lifecycle Guide — pending update';
    await creator.locator('#product-title').fill(changedTitle);
    const savePromise = creator.waitForResponse(response =>
      new URL(response.url()).pathname === `/api/v1/items/${id}`
      && ['POST', 'PUT'].includes(response.request().method())
      && (response.request().method() === 'PUT'
        || response.request().headers()['x-http-method-override']?.toUpperCase() === 'PUT'),
    );
    await creator.getByRole('button', {name: 'Save draft'}).click();
    const updated = await savePromise;
    expect(updated.status(), 'Creator approved-product edit').toBe(200);
    const changed = (await updated.json()) as {
      data: {status: string; has_pending_update?: boolean};
    };
    expect(changed.data.status).toBe('approved');
    expect(changed.data.has_pending_update).toBe(true);

    await admin.reload();
    const reverted = await rejectInAdmin(admin, id, 'Keep the published title until revision is ready.');
    expect(reverted.status).toBe('approved');
    expect(reverted.title).toBe(originalTitle);
    await creator.reload();
    await expect(creator.locator('[aria-label="Approved"]')).toBeVisible();
    await expect(creator.locator('#product-title')).toHaveValue(originalTitle);

    const shot = testInfo.outputPath('real-moderation-approved-mobile.png');
    await creator.screenshot({path: shot, fullPage: true});
    await testInfo.attach('Creator approved state after rejected update — 375px', {
      path: shot,
      contentType: 'image/png',
    });
  } finally {
    await adminContext.close();
    await creatorContext.close();
  }
});

/**
 * Unlike the responsive-only mocks, these journeys use authenticated real
 * creator/admin requests against the disposable belink_test fixture.
 * Every product type has an independent review record; none is production data.
 */
for (const scenario of [
  {type: 'ebook', title: 'E2E Moderation E-book', editorTitle: 'Edit e-book'},
  {type: 'audio', title: 'E2E Moderation Audio', editorTitle: 'Edit audio'},
  {type: 'course', title: 'E2E Moderation Course', editorTitle: 'Course Builder'},
] as const) {
  test(`isolated ${scenario.type}: creator edit, rejection, resubmission and admin approval`, async ({
    browser,
  }, testInfo) => {
    test.skip(
      process.env.LINKET_ISOLATED_E2E !== '1',
      'Real review mutations require the guarded disposable belink_test database',
    );
    test.setTimeout(180_000);

    const entry = fixture();
    const id = entry.review_product_ids?.[scenario.type];
    expect(id, `Missing independent ${scenario.type} moderation fixture`)
      .toBeGreaterThan(0);
    expect(
      Object.values(entry.review_product_ids).filter(value => value === id),
      'Each product type must have its own fixture; never reuse a product id',
    ).toHaveLength(1);

    const adminContext = await browser.newContext({
      baseURL,
      viewport: {width: 1280, height: 900},
    });
    const creatorContext = await browser.newContext({
      baseURL,
      viewport: scenario.type === 'course'
        ? {width: 1280, height: 900}
        : {width: 375, height: 812},
    });
    const admin = await adminContext.newPage();
    const creator = await creatorContext.newPage();
    const extraContexts: BrowserContext[] = [];
    let approvedTitle = scenario.title;
    const editPath = scenario.type === 'course'
      ? `/dashboard/items/${id}/course`
      : `/dashboard/items/${id}/edit`;

    try {
      await signIn(
        creator,
        process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test',
        process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23',
      );
      await creator.goto(editPath);
      await expect(creator.getByRole('heading', {name: scenario.editorTitle, level: 1}))
        .toBeVisible();
      const forbidden = await creator.request.get(`/api/v1/admin/items/${id}`);
      expect([401, 403], 'Creator must not access admin review details')
        .toContain(forbidden.status());

      const reviewerPassword = process.env.LINKET_E2E_REVIEWER_PASSWORD;
      expect(reviewerPassword, 'Reviewer credential must be per-run and isolated')
        .toBeTruthy();
      await signIn(
        admin,
        process.env.LINKET_E2E_REVIEWER_EMAIL ?? 'e2e-product-reviewer@example.test',
        reviewerPassword!,
      );
      await admin.goto(`/admin/items/${id}`);
      await expect(admin.getByText(scenario.title).first()).toBeVisible();

      const rejected = await rejectInAdmin(
        admin, id, `Please clarify the ${scenario.type} content for review.`,
      );
      expect(rejected.status).toBe('rejected');
      await creator.reload();

      // Make an actual creator edit before resubmitting, not a mocked change.
      approvedTitle = `${scenario.title} — creator revision`;
      if (scenario.type === 'course') {
        const configure = creator.getByRole('button', {name: 'Configure'});
        await expect(configure).toBeVisible();
        await configure.click();
        const settings = creator.getByRole('dialog', {name: 'Course Settings'});
        await expect(settings).toBeVisible();
        await settings.getByRole('textbox', {name: 'Course Name'}).fill(approvedTitle);
        // Linket transports logical PUT via POST + method override.
        // Wait for the real persisted response, not an impossible wire PUT.
        const updated = creator.waitForResponse(response =>
          new URL(response.url()).pathname.startsWith('/api/v1/courses/')
          && ['PUT', 'POST'].includes(response.request().method())
          && (response.request().method() === 'PUT'
            || response.request().headers()['x-http-method-override']?.toUpperCase() === 'PUT'),
        );
        await settings.getByRole('button', {name: 'Save', exact: true}).click();
        expect((await updated).status(), 'Real Course settings edit').toBe(200);
        await expect(settings).toBeHidden();
      } else {
        await expect(creator.locator('[aria-label="Needs changes"]')).toBeVisible();
        await creator.locator('#product-title').fill(approvedTitle);
        const updated = creator.waitForResponse(response =>
          new URL(response.url()).pathname === `/api/v1/items/${id}`
          && ['POST', 'PUT'].includes(response.request().method())
          && (response.request().method() === 'PUT'
            || response.request().headers()['x-http-method-override']?.toUpperCase() === 'PUT'),
        );
        await creator.getByRole('button', {name: 'Save draft'}).click();
        expect((await updated).status(), 'Real creator draft edit').toBe(200);
      }

      // The Course fixture has a real chapter and published lesson. The
      // other types each have a workspace-owned private sellable file.
      const submit = creator.getByRole('button', {name: 'Submit for review'});
      await expect(submit).toBeEnabled();
      const responsePromise = creator.waitForResponse(response =>
        new URL(response.url()).pathname === `/api/v1/items/${id}/submit`
        && response.request().method() === 'POST',
      );
      await submit.click();
      const submitted = await responsePromise;
      expect(submitted.status(), 'Real per-type submission').toBe(200);
      expect(((await submitted.json()) as {data: {status: string}}).data.status)
        .toBe('pending_approval');

      await admin.reload();
      await expect(admin.getByText(approvedTitle).first()).toBeVisible();
      const approvalPromise = admin.waitForResponse(response =>
        reviewRequest(response, id, 'approve'),
      );
      await admin.getByRole('button', {name: 'Approve', exact: true}).click();
      const approved = await approvalPromise;
      expect(approved.status(), 'Real admin approval').toBe(200);
      expect(((await approved.json()) as {status: string}).status).toBe('approved');

      await creator.goto(editPath);
      let screenshotPage = creator;
      if (scenario.type === 'course') {
        await expect(creator.getByText('Published', {exact: true}).first()).toBeVisible();
        // A fresh mobile session avoids carrying desktop sidebar state into
        // a 375px screenshot; that transition previously obscured the builder.
        const mobileContext = await browser.newContext({
          baseURL,
          viewport: {width: 375, height: 812},
        });
        extraContexts.push(mobileContext);
        screenshotPage = await mobileContext.newPage();
        await signIn(
          screenshotPage,
          process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test',
          process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23',
        );
        await screenshotPage.goto(editPath);
        const title = screenshotPage.getByRole('heading', {name: 'Course Builder', level: 1});
        await expect(title).toBeVisible();
        await expect(screenshotPage.getByText('Published', {exact: true}).first()).toBeVisible();
        // A successful screenshot alone missed a severely clipped mobile H1.
        // Assert that the title really reflows rather than hiding behind actions.
        const headingMetrics = await title.evaluate(node => ({
          hiddenPixels: Math.max(0, node.scrollWidth - node.clientWidth),
          whiteSpace: getComputedStyle(node).whiteSpace,
        }));
        expect(headingMetrics.hiddenPixels, 'Course mobile heading must not clip').toBeLessThanOrEqual(1);
        expect(headingMetrics.whiteSpace, 'Course mobile heading should allow text reflow').not.toBe('nowrap');
        expect(
          await screenshotPage.evaluate(() =>
            Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          ),
          'Course Builder must not overflow mobile viewport',
        ).toBeLessThanOrEqual(1);
      } else {
        await expect(creator.locator('[aria-label="Approved"]')).toBeVisible();
        await expect(creator.locator('#product-title')).toHaveValue(approvedTitle);
        await creator.getByRole('button', {name: 'Preview', exact: true}).click();
        const preview = creator.getByRole('dialog', {name: 'Customer preview'});
        await expect(preview).toBeVisible();
        await expect(preview.getByRole('button', {name: 'Buy now'})).toBeDisabled();
        await creator.keyboard.press('Escape');
        await expect(preview).toBeHidden();
      }

      const shot = testInfo.outputPath(`reviewed-${scenario.type}-mobile-375.png`);
      await screenshotPage.screenshot({path: shot, fullPage: true});
      await testInfo.attach(`Real ${scenario.type} creator state approved — 375px`, {
        path: shot,
        contentType: 'image/png',
      });
    } finally {
      await Promise.all(extraContexts.map(context => context.close()));
      await adminContext.close();
      await creatorContext.close();
    }
  });
}

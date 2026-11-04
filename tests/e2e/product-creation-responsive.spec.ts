import {expect, test, type Page} from '@playwright/test';

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
/**
 * The app's login inputs are labelled but have no stable #email/#password
 * IDs. Use the actual accessible names observed in Playwright's RED trace.
 */
async function loginAsSeededCreator(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
  await page.getByRole('textbox', {name: 'Email Address'}).fill(
    process.env.LINKET_E2E_CREATOR_EMAIL ?? 'creator@example.test',
  );
  await page.getByRole('textbox', {name: 'Password'}).fill(
    process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'password',
  );
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 15000});
}

test('smoke: isolated creator can authenticate and open product picker', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires isolated test database and synthetic creator fixture',
  );
  await loginAsSeededCreator(page);
  await page.goto('/dashboard/items/new');
  await expect(page.getByRole('heading', {name: 'What are you selling?'})).toBeVisible();
});

test.describe('product creation responsive evidence', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires explicitly configured isolated test server and database',
  );

  const viewports = [
    {name: 'mobile-small', width: 360, height: 800},
    {name: 'mobile', width: 375, height: 812},
    {name: 'tablet', width: 768, height: 1024},
    {name: 'tablet-wide', width: 1024, height: 768},
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
      await loginAsSeededCreator(page);

      await page.goto('/dashboard/items/new');
      await expect(page.getByRole('heading', {name: 'What are you selling?'})).toBeVisible();
      await expect(page.getByRole('radio')).toHaveCount(4);
      await expect(page.getByRole('button', {name: 'Continue'})).toBeDisabled();
      const pickerCapture = testInfo.outputPath(`type-picker-${viewport.width}px.png`);
      await page.screenshot({path: pickerCapture, fullPage: true});
      await testInfo.attach(`type picker ${viewport.width}px`, {
        path: pickerCapture,
        contentType: 'image/png',
      });

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

test('mobile curriculum returns to unsaved lesson without a false discard prompt', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1' ||
      !process.env.LINKET_E2E_COURSE_ID,
    'Requires an isolated test database with a seeded course containing a lesson',
  );

  await page.setViewportSize({width: 360, height: 800});
  await loginAsSeededCreator(page);

  const courseId = process.env.LINKET_E2E_COURSE_ID;
  await page.goto(`/dashboard/items/${courseId}/course`);
  await expect(page.getByRole('heading', {name: 'Curriculum'})).toBeVisible();
  const resume = page.getByRole('button', {name: 'Continue editing'});
  await expect(resume).toBeVisible();
  await resume.click();

  const title = page.getByRole('textbox', {name: 'Lesson title'});
  await expect(title).toBeVisible();
  const original = await title.inputValue();
  const draft = `${original} (unsaved mobile QA)`;
  await title.fill(draft);

  await page.getByRole('button', {name: 'Back to curriculum'}).click();
  await expect(page.getByRole('heading', {name: 'Curriculum'})).toBeVisible();
  await expect(resume).toBeVisible();
  await resume.click();

  await expect(page.getByRole('textbox', {name: 'Lesson title'})).toHaveValue(draft);
  await expect(page.getByRole('alertdialog', {name: 'Discard unsaved changes?'})).toHaveCount(0);

  const screenshotPath = testInfo.outputPath('mobile-lesson-resumed-unsaved.png');
  await page.screenshot({path: screenshotPath, fullPage: true});
  await testInfo.attach('Course same-lesson resume 360px', {
    path: screenshotPath,
    contentType: 'image/png',
  });
  // No save, publish, reorder, upload, or API mutation is triggered.
});

test('rejects empty product drafts and Course setup without creating an item', async ({
  page,
}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires an isolated test server and seeded creator',
  );
  await page.setViewportSize({width: 375, height: 812});
  await loginAsSeededCreator(page);

  let unexpectedCreates = 0;
  page.on('request', request => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/v1/items'
    ) {
      unexpectedCreates++;
    }
  });

  for (const type of ['digital', 'ebook', 'audio', 'course'] as const) {
    await page.goto(`/dashboard/items/new/${type}`);
    const submit = page.getByRole('button', {
      name: type === 'course' ? 'Create course' : 'Save draft',
    });
    await submit.click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/items/new/${type}$`));
    if (type === 'course') {
      await expect(page.locator('#course-title')).toBeFocused();
      await expect(page.getByText('Add a course title.')).toBeVisible();
    } else {
      await expect(
        page.getByText('Choose Free access or Paid before saving.'),
      ).toBeVisible();
    }
    expect(unexpectedCreates, `Empty ${type} must not POST a product`).toBe(0);
  }
});

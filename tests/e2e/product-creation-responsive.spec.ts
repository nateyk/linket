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
    {name: 'reflow-320', width: 320, height: 900},
    {name: 'mobile-small', width: 360, height: 800},
    {name: 'mobile', width: 375, height: 812},
    {name: 'zoom-200pct-equivalent', width: 720, height: 900},
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
        const heading = page.getByRole('heading', {name: item.heading, level: 1});
        await expect(heading).toBeVisible();
        await expect(page.getByRole('heading', {name: item.section})).toBeVisible();

        // A page can avoid horizontal scroll yet leave its only title clipped
        // by header actions. Verify the full title fits at narrow widths.
        if (viewport.width <= 375) {
          const clippedTextPixels = await heading.locator('span').first().evaluate(
            span => Math.max(0, span.scrollWidth - span.clientWidth),
          );
          expect(clippedTextPixels, `${item.type} title is truncated at ${viewport.width}px`)
            .toBeLessThanOrEqual(1);
          // Also guard the parent heading: scrollWidth of the child alone
          // did not detect an ellipsis visible in the 320px screenshot.
          const titleStyles = await heading.evaluate(node => {
            const text = node.querySelector('span');
            if (!text) throw new Error('Missing product title span');
            const parent = getComputedStyle(node);
            const child = getComputedStyle(text);
            return {
              parentWhiteSpace: parent.whiteSpace,
              childWhiteSpace: child.whiteSpace,
              parentOverflow: parent.overflow,
              childOverflow: child.overflow,
              parentTextOverflow: parent.textOverflow,
              childTextOverflow: child.textOverflow,
            };
          });
          expect(titleStyles.parentWhiteSpace).not.toBe('nowrap');
          expect(titleStyles.childWhiteSpace).not.toBe('nowrap');
          expect(titleStyles.parentOverflow).toBe('visible');
          expect(titleStyles.childOverflow).toBe('visible');
          expect(titleStyles.parentTextOverflow).toBe('clip');
          expect(titleStyles.childTextOverflow).toBe('clip');
        }

        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        );
        if (overflow > 1) {
          const offenders = await page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            return [...document.querySelectorAll<HTMLElement>('*')]
              .map(el => {
                const rect = el.getBoundingClientRect();
                return {
                  tag: el.tagName.toLowerCase(),
                  role: el.getAttribute('role'),
                  slot: el.getAttribute('data-slot'),
                  className: typeof el.className === 'string' ? el.className.slice(0, 170) : '',
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  text: (el.textContent ?? '').replace(/\\s+/g, ' ').slice(0, 75),
                };
              })
              .filter(x => x.right > width + 1 && x.width > 0)
              .sort((a, b) => b.right - a.right)
              .slice(0, 18);
          });
          console.log('HORIZONTAL_OVERFLOW', JSON.stringify({type: item.type, viewport: viewport.width, overflow, offenders}));
          const overflowCapture = testInfo.outputPath(`${item.type}-${viewport.width}px-overflow.png`);
          await page.screenshot({path: overflowCapture, fullPage: true});
          await testInfo.attach(`${item.type} mobile overflow ${viewport.width}px`, {
            path: overflowCapture,
            contentType: 'image/png',
          });
        }
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

test('keyboard-only product choice and Preview support focus return', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires disposable database and synthetic creator',
  );
  await page.setViewportSize({width: 360, height: 800});
  await loginAsSeededCreator(page);
  await page.goto('/dashboard/items/new');

  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(4);
  await radios.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(radios.nth(1)).toBeChecked();

  const continueButton = page.getByRole('button', {name: 'Continue'});
  await expect(continueButton).toBeEnabled();
  await continueButton.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dashboard\/items\/new\/ebook$/);

  const preview = page.getByRole('button', {name: 'Preview'});
  await preview.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {name: 'Customer preview'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Close', exact: true}).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(preview).toBeFocused();
});

test('optional Storefront lookup failure can retry without creating or saving a product', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires disposable test database and synthetic creator',
  );
  await loginAsSeededCreator(page);

  let attempts = 0;
  let unexpectedCreates = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/items') {
      unexpectedCreates++;
    }
  });
  await page.route('**/api/v1/biolinks?fields_preset=minimal', async route => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({message: 'Isolated synthetic Storefront outage'}),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({data: []}),
      });
    }
  });

  await page.goto('/dashboard/items/new/digital?billing=free');
  const placement = page.getByRole('region', {name: 'Storefront placement (optional)'});
  await expect(placement.getByText('Unable to load Storefronts. Your product can still be saved or submitted. Retry to choose placement.')).toBeVisible();
  await expect(placement.getByText(/Create a Storefront later if you want to display it there/)).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Save draft'})).toBeEnabled();

  await placement.getByRole('button', {name: 'Retry Storefront loading'}).click();
  await expect(placement.getByText(/Create a Storefront later if you want to display it there/)).toBeVisible();
  await expect(placement.getByText(/Unable to load Storefronts/)).toHaveCount(0);
  expect(attempts).toBe(2);
  expect(unexpectedCreates).toBe(0);
});

test('invalid upload is announced and removable without submitting a product', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires disposable database and synthetic creator',
  );
  await loginAsSeededCreator(page);
  await page.goto('/dashboard/items/new/digital');
  const files = page.getByRole('region', {name: 'Files buyers receive'});
  const browse = files.getByRole('button', {name: 'Browse files', exact: true});
  const fileInput = files.locator('input[type="file"]');
  await expect(fileInput).toHaveCount(1);

  // Assert genuine keyboard activation of the upload input, without depending
  // on Chromium showing an OS file chooser in a headless CI environment.
  await fileInput.evaluate(input => {
    input.addEventListener('click', () => {
      input.setAttribute('data-keyboard-activated', 'true');
    }, {once: true});
  });
  await browse.focus();
  await expect(browse).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fileInput).toHaveAttribute('data-keyboard-activated', 'true');

  // Directly attach a synthetic invalid file for deterministic validation QA.
  // Playwright supports setting files on inputs hidden from the visual layout.
  await fileInput.setInputFiles({
    name: 'unsupported-e2e.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('synthetic invalid file'),
  });
  await expect(files.getByRole('alert')).toContainText('Unsupported file type');
  await files.getByRole('button', {name: 'Remove unsupported-e2e.exe'}).click();
  await expect(files.getByRole('alert')).toHaveCount(0);
});

async function mockSyntheticDraftEdit(page: Page, productId: number) {
  const product = {
    id: productId,
    title: 'Synthetic creator lifecycle guide',
    description: 'Isolated browser evidence',
    price_cents: 1500,
    currency: 'etb',
    status: 'draft',
    type: 'digital',
    cover: null,
    cover_file_entry_id: null,
    files: [{id: 551, name: 'guide.pdf', file_size: 2000, extension: 'pdf'}],
    samples: [],
    biolink_ids: [],
  };
  let updates = 0;
  await page.route(`**/api/v1/items/${productId}`, async route => {
    if (route.request().method() === 'PUT') updates++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({data: product}),
    });
  });
  return {get updates() {return updates;}};
}

test('a saved draft reports submission validation failure and focuses the invalid field', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Uses isolated creator and synthetic intercepted API responses',
  );
  await page.setViewportSize({width: 360, height: 800});
  await loginAsSeededCreator(page);
  const id = 999997;
  const draft = await mockSyntheticDraftEdit(page, id);
  let submissionPosts = 0;
  await page.route(`**/api/v1/items/${id}/submit`, async route => {
    submissionPosts++;
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Cannot submit synthetic draft',
        errors: {title: ['Please correct the title before review.']},
      }),
    });
  });
  await page.goto(`/dashboard/items/${id}/edit`);
  await expect(page.getByRole('heading', {name: /Edit digital product/i})).toBeVisible();
  await page.getByRole('button', {name: 'Submit for review'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Draft saved, but submission failed.'})).toBeVisible();
  await expect(page.getByText('Please correct the title before review.')).toBeVisible();
  await expect(page.locator('#product-title')).toBeFocused();
  expect(draft.updates).toBe(1);
  expect(submissionPosts).toBe(1);
});

test('unknown submission cannot silently submit a saved draft twice', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Uses isolated creator and synthetic intercepted API responses',
  );
  await loginAsSeededCreator(page);
  const id = 999996;
  const draft = await mockSyntheticDraftEdit(page, id);
  let submissionPosts = 0;
  await page.route(`**/api/v1/items/${id}/submit`, async route => {
    submissionPosts++;
    await route.abort('failed');
  });
  await page.goto(`/dashboard/items/${id}/edit`);
  await page.getByRole('button', {name: 'Submit for review'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Draft saved, but we could not confirm submission.'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Submit for review'})).toBeDisabled();
  await expect(page.getByRole('link', {name: 'Check My Items'})).toBeVisible();
  await page.getByRole('button', {name: 'Submit for review'}).evaluate(button => {
    button.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
  expect(draft.updates).toBe(1);
  expect(submissionPosts).toBe(1);
});

test('Course creation with an unknown network result never issues a second POST', async ({page}) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires disposable test database and synthetic creator',
  );
  await page.setViewportSize({width: 360, height: 800});
  await loginAsSeededCreator(page);
  let attempts = 0;
  await page.route('**/api/v1/items', async route => {
    if (route.request().method() === 'POST') {
      attempts++;
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });

  await page.goto('/dashboard/items/new/course?billing=free');
  await page.getByRole('textbox', {name: 'Course title'}).fill('Synthetic QA course');
  await page.getByRole('button', {name: 'Create course'}).click();
  await expect(page.getByRole('alert')).toContainText('We could not confirm whether the course was created.');
  await expect(page.getByRole('button', {name: 'Create course'})).toBeDisabled();
  await expect(page.getByRole('link', {name: 'Check My Items'})).toBeVisible();
  await page.locator('#course-create-form').evaluate(element => {
    (element as HTMLFormElement).requestSubmit();
  });
  expect(attempts).toBe(1);
});

test('mobile curriculum returns to unsaved lesson without a false discard prompt', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires an isolated test database with a seeded course containing a lesson',
  );

  await page.setViewportSize({width: 360, height: 800});
  await loginAsSeededCreator(page);

  const courseId = process.env.LINKET_E2E_COURSE_ID;
  if (!courseId || !/^[1-9]\d*$/.test(courseId)) {
    throw new Error('Missing numeric LINKET_E2E_COURSE_ID for isolated browser QA');
  }
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

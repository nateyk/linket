import {expect, test, type Page} from '@playwright/test';

// The harness imports the real public React pages and only synthetic test
// records. No creator accounts, payment credentials, or database required.
const fixture = '/tests/e2e/fixtures/storefront-detail-qa.html';
const browserUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

test.use({userAgent: browserUA, reducedMotion: 'reduce'});

async function openDetail(
  page: Page,
  mode: 'free' | 'paid' | 'course' | 'service' | 'unavailable',
  options: {long?: boolean; dark?: boolean} = {},
) {
  const params = new URLSearchParams({mode});
  if (options.long) params.set('long', '1');
  if (options.dark) params.set('theme', 'dark');
  await page.goto(`${fixture}?${params}`);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content, 'document-level horizontal overflow').toBeLessThanOrEqual(
    sizes.viewport + 1,
  );
}

const viewports = [320, 360, 375, 390, 430, 768, 1024, 1440];
const modes = ['free', 'course', 'service'] as const;

test.describe('SF-09/SF-10 real public pages in isolated Chromium', () => {
  test.beforeEach(async ({page}) => {
    await page.route('**/api/v1/public/courses/19/curriculum', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            chapters: [
              {
                id: 1,
                title: 'እንዴት እንጀምር ' + 'FoundationsOfDesign'.repeat(5),
                lessons: [
                  {
                    id: 2,
                    title: 'DetailedVisualHierarchy'.repeat(7),
                    duration_seconds: 300,
                    is_preview: true,
                  },
                ],
              },
            ],
          },
        }),
      }),
    );
  });

  for (const mode of modes) {
    for (const width of viewports) {
      test(`${mode} content reflows at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({width, height: 900});
        // Deliberately capture both light and dark screenshots: all the
        // sampled widths below are even, so parity-based dark mode would
        // accidentally omit the project's default light appearance.
        await openDetail(page, mode, {
          long: true,
          dark: width === 390 || width === 768,
        });
        await expectNoHorizontalOverflow(page);
        await expect(page.getByRole('heading', {level: 1})).toHaveCount(1);
        if (mode === 'service') {
          await expect(page.getByRole('tablist', {name: 'Packages'})).toBeVisible();
          await expect(page.getByRole('link', {name: 'WhatsApp'})).toHaveCount(1);
        }
        if (width === 320 || width === 390 || width === 768 || width === 1440) {
          await testInfo.attach(`${mode}-${width}px`, {
            body: await page.screenshot({fullPage: true}),
            contentType: 'image/png',
          });
        }
      });
    }
  }

  test('representative light and dark storefront pages render with normal copy', async ({
    page,
  }, testInfo) => {
    for (const mode of modes) {
      for (const dark of [false, true]) {
        const width = dark ? 390 : 1440;
        await page.setViewportSize({width, height: 860});
        await openDetail(page, mode, {dark});
        await expectNoHorizontalOverflow(page);
        await testInfo.attach(
          `${mode}-${dark ? 'dark-mobile' : 'light-desktop'}`,
          {
            body: await page.screenshot({fullPage: true}),
            contentType: 'image/png',
          },
        );
      }
    }
  });

  test('200% text resize reflows public details without horizontal clipping', async ({
    page,
  }) => {
    // This is a CSS root-text resize check, not a substitute for human
    // testing of browser toolbar zoom at 200%.
    for (const mode of modes) {
      await page.setViewportSize({width: 390, height: 840});
      await openDetail(page, mode, {long: false});
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    }
  });

  test('keyboard access, selected quote-only tier, and focus return', async ({
    page,
  }) => {
    await page.setViewportSize({width: 375, height: 812});
    await openDetail(page, 'service', {long: true});
    const customPackage = page.getByRole('tab', {name: /EnterpriseExpansion/});
    await customPackage.click();
    await expect(page.getByText('Quote only')).toBeVisible();
    const request = page.getByRole('button', {name: 'Request this package'});
    await request.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/EnterpriseExpansion/)).toBeVisible();
    await expect(dialog.getByRole('textbox', {name: 'Name'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(request).toBeFocused();
    const contact = page.getByRole('link', {name: 'WhatsApp'});
    const height = (await contact.boundingBox())?.height;
    expect(height, 'seller contact minimum touch height').toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
  });

  test('free checkout finishes without a payment modal or token URL', async ({
    page,
  }) => {
    let posts = 0;
    await page.route('**/api/v1/mock/checkout', async route => {
      posts += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body.buyer_name).toBe('Test Buyer');
      expect(body.buyer_email).toBe('buyer@example.test');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order_id: 'synthetic-free-order-id',
          status: 'paid',
          // The legacy fields must NOT redirect free customers to payment.
          reference_endpoint: '/api/v1/mock/verify',
          access_token: 'SYNTHETIC_ACCESS_TOKEN_NOT_REAL',
        }),
      });
    });
    await page.setViewportSize({width: 390, height: 844});
    await openDetail(page, 'free');
    await page.getByRole('button', {name: 'Get for free'}).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('No payment details are needed');
    await dialog.getByRole('textbox', {name: 'Name'}).fill('Test Buyer');
    await dialog.getByRole('textbox', {name: 'Email'}).fill('buyer@example.test');
    await dialog.getByRole('button', {name: 'Continue for free'}).click();
    await expect(page.getByRole('status')).toContainText('Your free order is ready');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('link', {name: 'Open My Portal'})).toHaveAttribute(
      'href',
      '/my-portal',
    );
    await expect(page.getByRole('button', {name: 'Free order complete'})).toBeDisabled();
    expect(posts).toBe(1);
    expect(page.url()).not.toContain('SYNTHETIC_ACCESS_TOKEN_NOT_REAL');
    await expectNoHorizontalOverflow(page);
  });

  test('malformed free response does not present a false success', async ({
    page,
  }) => {
    await page.route('**/api/v1/mock/checkout', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({status: 'pending_payment'}),
      }),
    );
    await openDetail(page, 'free');
    await page.getByRole('button', {name: 'Get for free'}).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', {name: 'Name'}).fill('Test Buyer');
    await dialog.getByRole('textbox', {name: 'Email'}).fill('buyer@example.test');
    await dialog.getByRole('button', {name: 'Continue for free'}).click();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });

  test('paid and unavailable modes preserve their explicit choices', async ({
    page,
  }) => {
    await openDetail(page, 'paid');
    await expect(page.getByRole('button', {name: 'Buy now'}).first()).toBeEnabled();
    await openDetail(page, 'unavailable');
    await expect(
      page.getByRole('button', {name: 'Temporarily unavailable'}).first(),
    ).toBeDisabled();
  });
});

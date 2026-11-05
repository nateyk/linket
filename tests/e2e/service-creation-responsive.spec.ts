import {expect, test, type Page} from '@playwright/test';

/**
 * Authenticated Service Creation QA against the isolated Laravel test server.
 * Never point this suite at production; it intentionally exercises creator
 * writes only when the disposable test database guard is present.
 */
const isIsolated = process.env.LINKET_ISOLATED_E2E === '1'
  && process.env.APP_ENV === 'testing'
  && process.env.DB_DATABASE === 'belink_test'
  && process.env.E2E_BASE_URL === 'http://127.0.0.1:8081';

async function signIn(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
  await page.getByRole('textbox', {name: 'Email Address'}).fill(
    process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test',
  );
  await page.getByRole('textbox', {name: 'Password'}).fill(
    process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23',
  );
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 15000});
}

test.describe('Service Creation — authenticated browser acceptance', () => {
  test.skip(!isIsolated, 'Requires disposable belink_test and loopback server');
  test.setTimeout(90_000);

  for (const viewport of [
    {name: '320px reflow', width: 320, height: 900},
    {name: '360px mobile', width: 360, height: 800},
    {name: '375px mobile', width: 375, height: 812},
    {name: '768px tablet', width: 768, height: 1024},
    {name: '1440px desktop', width: 1440, height: 900},
  ]) {
    test(`${viewport.name}: readable editor and keyboard-safe customer preview`, async ({page}, testInfo) => {
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await signIn(page);
      await page.goto('/dashboard/services/new');

      const heading = page.getByRole('heading', {name: 'Create a service', level: 1});
      await expect(heading).toBeVisible();
      const steps = page.getByRole('navigation', {name: 'Service creation steps'});
      await expect(steps).toBeVisible();
      for (const [i, label] of ['Details', 'Media', 'Packages', 'Settings'].entries()) {
        await expect(steps.getByRole('button', {name: `${label}, step ${i + 1} of 4`})).toBeVisible();
      }
      await expect(steps.getByRole('button', {name: 'Details, step 1 of 4'})).toHaveAttribute('aria-current', 'step');

      const titleSpan = heading.locator('span').first();
      if (viewport.width <= 375) {
        const style = await titleSpan.evaluate(node => {
          const css = getComputedStyle(node);
          return {
            clipped: node.scrollWidth > node.clientWidth + 1,
            textOverflow: css.textOverflow,
            whiteSpace: css.whiteSpace,
          };
        });
        expect(style.clipped, 'New service heading must not truncate on mobile').toBe(false);
        expect(style.whiteSpace).not.toBe('nowrap');
      }

      // Moving between stages is local-only and retains unsaved details.
      await page.locator('#title').fill('E2E preview draft');
      await steps.getByRole('button', {name: 'Media, step 2 of 4'}).click();
      await expect(page.getByRole('heading', {name: 'Media and links'})).toBeVisible();
      await steps.getByRole('button', {name: 'Packages, step 3 of 4'}).click();
      await expect(page.getByRole('heading', {name: 'Packages'})).toBeVisible();
      await steps.getByRole('button', {name: 'Settings, step 4 of 4'}).click();
      await expect(page.getByRole('heading', {name: 'FAQ'})).toBeVisible();
      await steps.getByRole('button', {name: 'Details, step 1 of 4'}).click();
      await expect(page.locator('#title')).toHaveValue('E2E preview draft');
      // A stage change must return the creator to visible navigation, even
      // after the previous long form has been scrolled.
      // Diagnostics for the authenticated browser regression. Report the
      // actual scroll container, nav geometry, and scroll limits.
      const geometry = await steps.evaluate(node => {
        const section = node.closest('[data-slot="section-content"]');
        const navRect = node.getBoundingClientRect();
        const sectionRect = section?.getBoundingClientRect();
        return {
          viewportHeight: window.innerHeight,
          navTop: navRect.top,
          navHeight: navRect.height,
          sectionTop: sectionRect?.top ?? null,
          sectionHeight: sectionRect?.height ?? null,
          sectionScrollTop: section?.scrollTop ?? null,
          sectionScrollHeight: section?.scrollHeight ?? null,
          sectionClientHeight: section?.clientHeight ?? null,
          documentScrollTop: document.scrollingElement?.scrollTop ?? null,
          focusedId: document.activeElement?.id ?? null,
        };
      });
      console.log('[service-stage-scroll]', JSON.stringify(geometry));
      await expect(steps).toBeInViewport({ratio: 0.5});
      await expect(page.getByRole('heading', {name: 'Basics'})).toBeInViewport();

      const horizontalOverflow = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      );
      expect(horizontalOverflow, `No page overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

      const preview = page.getByRole('button', {name: 'Preview', exact: true});
      await expect(preview).toBeVisible();
      await preview.click();
      const dialog = page.getByRole('dialog', {name: 'Customer preview'});
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('E2E preview draft')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(preview).toBeFocused();

      const screenshot = testInfo.outputPath(`service-create-${viewport.width}px.png`);
      await page.screenshot({path: screenshot, fullPage: true});
      await testInfo.attach(`Service create ${viewport.width}px`, {
        path: screenshot,
        contentType: 'image/png',
      });
    });
  }

  test('a temporary storefront API failure shows Retry without making a service', async ({page}) => {
    await signIn(page);
    let failedOnce = false;
    let attemptedCreates = 0;

    page.on('request', request => {
      if (request.method() === 'POST'
        && new URL(request.url()).pathname === '/api/v1/services') {
        attemptedCreates++;
      }
    });

    await page.route('**/api/v1/stores?per_page=100', async route => {
      if (!failedOnce) {
        failedOnce = true;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({message: 'Synthetic storefront outage'}),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/services/new');
    await expect(page.getByText('Unable to load service')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible();
    await expect(page.getByText('Create a storefront first')).toHaveCount(0);
    await page.getByRole('button', {name: 'Try again'}).click();
    await expect(page.getByRole('heading', {name: 'Create a service', level: 1})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Preview', exact: true})).toBeVisible();
    expect(attemptedCreates).toBe(0);
  });

  test('isolated creator publishes an optional-package service then edits and deletes it', async ({page}) => {
    await signIn(page);
    await page.goto('/dashboard/services/new');
    await expect(page.getByRole('heading', {name: 'Create a service', level: 1})).toBeVisible();
    const name = `E2E Service Creation ${Date.now()}`;
    await page.locator('#title').fill(name);
    await page.locator('#short_description').fill('A service supplied directly by the creator.');

    // Preview must read unsaved form state without making an API write.
    await page.getByRole('button', {name: 'Preview', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Customer preview'}).getByText(name)).toBeVisible();
    await page.keyboard.press('Escape');

    const createdPromise = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1/services'
      && response.request().method() === 'POST',
    );
    await page.getByRole('button', {name: 'Publish service'}).click();
    const created = await createdPromise;
    expect(created.status(), 'Service create endpoint with no packages/cover').toBe(201);

    const result = await created.json() as {data: {id: number; status: string; title: string}};
    expect(result.data.id).toBeGreaterThan(0);
    expect(result.data.status).toBe('published');
    expect(result.data.title).toBe(name);
    await expect(page).toHaveURL(/\/dashboard\/services(?:\?.*)?$/);

    const id = result.data.id;
    await page.goto(`/dashboard/services/${id}/edit`);
    await expect(page.getByRole('heading', {name: 'Edit service', level: 1})).toBeVisible();
    await expect(page.locator('#title')).toHaveValue(name);
    await page.getByRole('button', {name: 'Preview', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Customer preview'}).getByText(name)).toBeVisible();
    await page.keyboard.press('Escape');

    // Exercise the owner-scoped delete UI; all writes are on disposable belink_test.
    await page.getByRole('button', {name: 'Delete', exact: true}).click();
    const deletion = page.waitForResponse(response => {
      const url = new URL(response.url());
      const method = response.request().method();
      // Linket's shared HTTP client uses Laravel method override for DELETE:
      // POST /api/v1/services/:id?_method=DELETE (204), not native DELETE.
      return url.pathname === `/api/v1/services/${id}`
        && (method === 'DELETE'
          || (method === 'POST' && url.searchParams.get('_method')?.toUpperCase() === 'DELETE'));
    });
    await page.getByRole('button', {name: 'Delete service'}).click();
    expect((await deletion).status()).toBe(204);
    await expect(page).toHaveURL(/\/dashboard\/services(?:\?.*)?$/);
  });
});

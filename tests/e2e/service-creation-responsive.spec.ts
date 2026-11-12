import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test';

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

async function verifyResponsiveServiceSetup(
  page: Page,
  steps: Locator,
  width: number,
  testInfo: TestInfo,
) {
  // Screenshot-inspired layout: mobile/tablet navigation sits above the
  // editor; at xl it becomes a left rail. Both keep dashboard gutters and
  // must never squeeze the actual content into a horizontal scroll.
  const builderAlignment = await steps.evaluate(navigation => {
    const content = navigation.closest('[data-slot="section-content"]');
    const basics = document.getElementById('service-step-basics');
    const list = navigation.querySelector('ol');
    if (!content || !basics || !list) return null;
    const rail = navigation.getBoundingClientRect();
    const form = basics.getBoundingClientRect();
    return {
      gutterLeft: content.getBoundingClientRect().left
        + Number.parseFloat(getComputedStyle(content).paddingLeft),
      stepperLeft: rail.left,
      stepperRight: rail.right,
      stepperBottom: rail.bottom,
      formLeft: form.left,
      formTop: form.top,
      formWidth: form.width,
      columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
    };
  });
  expect(builderAlignment).not.toBeNull();
  if (builderAlignment) {
    expect(Math.abs(builderAlignment.stepperLeft - builderAlignment.gutterLeft),
      'Builder rail aligns with the dashboard content gutter').toBeLessThanOrEqual(2);
    expect(builderAlignment.columns,
      'Step navigation uses two phone columns, four tablet columns or one desktop rail')
      .toBe(width >= 1280 ? 1 : width >= 640 ? 4 : 2);
    if (width >= 1280) {
      expect(builderAlignment.formLeft - builderAlignment.stepperRight,
        'Desktop editor starts beside the rail with breathing room').toBeGreaterThanOrEqual(12);
      expect(builderAlignment.formWidth,
        'The editor still has enough room for a three-tier comparison').toBeGreaterThan(480);
    } else {
      expect(Math.abs(builderAlignment.formLeft - builderAlignment.stepperLeft),
        'The phone and tablet editor aligns beneath navigation').toBeLessThanOrEqual(2);
      expect(builderAlignment.formTop - builderAlignment.stepperBottom,
        'The editor follows rather than overlaps the navigation').toBeGreaterThanOrEqual(8);
    }
  }

  const setupScreenshot = testInfo.outputPath(`service-setup-${width}px.png`);
  await page.screenshot({path: setupScreenshot, fullPage: true});
  await testInfo.attach(`Service setup ${width}px`, {
    path: setupScreenshot,
    contentType: 'image/png',
  });
}

test.describe('Service Creation — authenticated browser acceptance', () => {
  test.skip(!isIsolated, 'Requires disposable belink_test and loopback server');
  test.setTimeout(90_000);

  for (const viewport of [
    {name: '320px reflow', width: 320, height: 900},
    {name: '360px mobile', width: 360, height: 800},
    {name: '375px mobile', width: 375, height: 812},
    {name: '430px large phone', width: 430, height: 932},
    {name: '768px tablet', width: 768, height: 1024},
    {name: '1024px small desktop', width: 1024, height: 768},
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

      await verifyResponsiveServiceSetup(page, steps, viewport.width, testInfo);

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

      // The outer Packages panel owns the visual surface. Inner tier choices,
      // details and features must not become their own cards again.
      await expect(
        page.locator('#service-step-packages section.bg-card, #service-step-packages section.rounded-card-sm'),
      ).toHaveCount(0);

      // Three fixed tiers, never an unbounded Add Package form. The matrix
      // must be operable with touch and keyboard at every mobile breakpoint.
      for (const tier of ['Basic', 'Standard', 'Premium']) {
        await expect(page.getByRole('region', {name: tier + ' package', exact: true})).toBeVisible();
      }
      await expect(page.getByRole('button', {name: 'Add package'})).toHaveCount(0);
      await expect(page.getByRole('textbox', {name: 'Package name'})).toHaveCount(0);

      const basic = page.getByRole('switch', {name: 'Enable Basic package'});
      await basic.click();
      await expect(basic).toHaveAttribute('aria-checked', 'true');
      await page.getByRole('region', {name: 'Basic package details'})
        .getByRole('textbox', {name: 'Delivery days'}).fill('5');

      await page.getByRole('textbox', {name: 'Add an included feature'}).fill('Vector source files');
      await page.getByRole('button', {name: 'Add feature'}).click();
      const basicFeature = page.getByRole('checkbox', {name: 'Include Vector source files in Basic'});
      await expect(basicFeature).toHaveAttribute('aria-checked', 'true');

      await page.getByRole('switch', {name: 'Enable Standard package'}).click();
      await expect(page.getByRole('region', {name: 'Standard package details'})).toBeVisible();
      await expect(page.getByRole('textbox', {name: 'Price'})).toHaveCount(1);
      await page.getByRole('button', {name: 'Edit Basic package'}).click();
      await expect(page.getByRole('region', {name: 'Basic package details'})).toBeVisible();
      await page.getByRole('checkbox', {name: 'Include Vector source files in Standard'}).click();
      await expect(page.getByRole('checkbox', {name: 'Include Vector source files in Standard'}))
        .toHaveAttribute('aria-checked', 'true');

      const packageScreenshot = testInfo.outputPath('service-packages-' + viewport.width + 'px.png');
      await page.screenshot({path: packageScreenshot, fullPage: true});
      await testInfo.attach('Service packages ' + viewport.width + 'px', {
        path: packageScreenshot,
        contentType: 'image/png',
      });

      await steps.getByRole('button', {name: 'Settings, step 4 of 4'}).click();
      await expect(page.getByRole('heading', {name: 'FAQ'})).toBeVisible();
      await steps.getByRole('button', {name: 'Details, step 1 of 4'}).click();
      await expect(page.locator('#title')).toHaveValue('E2E preview draft');
      await steps.getByRole('button', {name: 'Packages, step 3 of 4'}).click();
      await expect(page.getByRole('region', {name: 'Basic package details'})
        .getByRole('textbox', {name: 'Delivery days'})).toHaveValue('5');
      await expect(page.getByRole('checkbox', {name: 'Include Vector source files in Standard'}))
        .toHaveAttribute('aria-checked', 'true');
      await steps.getByRole('button', {name: 'Details, step 1 of 4'}).click();
      // Capture scroll ownership if this assertion fails. Do not scroll the
      // page from the test: that would conceal a real navigation regression.
      if (viewport.width === 320) {
        const layout = await steps.evaluate(navigation => {
          const ancestors: Array<Record<string, string | number>> = [];
          let current: Element | null = navigation;
          while (current && ancestors.length < 12) {
            const rect = current.getBoundingClientRect();
            const style = getComputedStyle(current);
            ancestors.push({
              tag: current.tagName,
              slot: current.getAttribute('data-slot') ?? '',
              overflowY: style.overflowY,
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              scrollTop: current.scrollTop,
              scrollHeight: current.scrollHeight,
              clientHeight: current.clientHeight,
            });
            current = current.parentElement;
          }
          return {
            focus: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,
            viewportHeight: window.innerHeight,
            windowScrollY: window.scrollY,
            documentScrollTop: document.scrollingElement?.scrollTop,
            ancestors,
          };
        });
        console.info('SERVICE_STEP_SCROLL_DIAGNOSTIC', JSON.stringify(layout));
      }
      // A stage change must return the creator to visible navigation, even
      // after the previous long form has been scrolled.
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

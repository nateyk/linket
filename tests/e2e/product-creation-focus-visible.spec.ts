import {expect, test, type Page} from '@playwright/test';

/**
 * UX-36 supplementary, non-mutating keyboard focus audit.
 * Exercises real Tab navigation and computed :focus-visible styling.
 * It does not replace NVDA/VoiceOver, native 200% toolbar zoom or human QA.
 */
const types = [
  {id: 'digital', heading: /create digital product/i},
  {id: 'ebook', heading: /create e-book/i},
  {id: 'audio', heading: /create audio/i},
  {id: 'course', heading: /create course/i},
] as const;

function requireIsolatedEnvironment() {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1' ||
      !['http://127.0.0.1:8081', 'http://localhost:8081'].includes(
        process.env.E2E_BASE_URL ?? '',
      ),
    'Keyboard focus evidence requires isolated loopback browser QA',
  );
}

async function signInCreator(page: Page) {
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

async function tabToPreview(page: Page) {
  const preview = page.getByRole('button', {name: 'Preview', exact: true}).first();
  await expect(preview).toBeVisible();
  // Use real keyboard events, not locator.focus() or DOM programmatic focus:
  // this detects unreachable controls and activates real :focus-visible.
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab');
    if (await preview.evaluate(node => node === document.activeElement)) {
      return preview;
    }
  }
  throw new Error('Preview was unreachable after 90 real Tab presses');
}

async function focusRingEvidence(page: Page) {
  return page.getByRole('button', {name: 'Preview', exact: true}).first().evaluate(node => {
    const style = getComputedStyle(node);
    const bounds = node.getBoundingClientRect();
    const elementAtCenter = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
    return {
      focusVisible: node.matches(':focus-visible'),
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
      targetInsideViewport:
        bounds.left >= 0 && bounds.right <= innerWidth &&
        bounds.top >= 0 && bounds.bottom <= innerHeight,
      targetNotObscured:
        elementAtCenter != null && (node === elementAtCenter || node.contains(elementAtCenter)),
      activeElementTag: document.activeElement?.tagName ?? null,
      width: innerWidth,
    };
  });
}

test('UX-36 real Tab focus visibly outlines Preview on all four editors in both themes', async ({
  page,
}, testInfo) => {
  requireIsolatedEnvironment();
  test.setTimeout(180_000);
  await page.setViewportSize({width: 375, height: 812});
  await signInCreator(page);

  for (const theme of ['light', 'dark'] as const) {
    for (const product of types) {
      await page.goto('/dashboard/items/new/' + product.id);
      await expect(page.getByRole('heading', {name: product.heading, level: 1})).toBeVisible();
      await page.evaluate(dark => {
        document.documentElement.classList.toggle('dark', dark);
      }, theme === 'dark');

      const preview = await tabToPreview(page);
      const evidence = await focusRingEvidence(page);
      expect(evidence.focusVisible, product.id + '/' + theme + ': must use keyboard focus-visible')
        .toBe(true);
      expect(evidence.outlineStyle, product.id + '/' + theme + ': focus outline must be painted')
        .not.toBe('none');
      expect(evidence.outlineWidth, product.id + '/' + theme + ': focus indicator at least 2px')
        .toBeGreaterThanOrEqual(2);
      expect(evidence.targetInsideViewport, product.id + '/' + theme + ': focus target in view')
        .toBe(true);
      expect(evidence.targetNotObscured, product.id + '/' + theme + ': focus target unobscured')
        .toBe(true);

      const screenshot = testInfo.outputPath('focused-preview-' + product.id + '-' + theme + '.png');
      await page.screenshot({path: screenshot, fullPage: false});
      await testInfo.attach('Keyboard-focused ' + product.id + ' ' + theme + ' 375px', {
        path: screenshot,
        contentType: 'image/png',
      });
      await testInfo.attach('Computed focus indicator ' + product.id + ' ' + theme, {
        body: Buffer.from(JSON.stringify(evidence, null, 2)),
        contentType: 'application/json',
      });

      // The existing product creation matrix already checks the dialog focus
      // trap/Escape/return path; preserve a simple opener sanity assertion.
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', {name: 'Customer preview'})).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', {name: 'Customer preview'})).toBeHidden();
      await expect(preview).toBeFocused();
    }
  }
});

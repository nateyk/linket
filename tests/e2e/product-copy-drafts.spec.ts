import {expect, test} from '@playwright/test';

// Browser contract with synthetic API storage. Real MySQL transactions are covered
// separately by CreatorAiDurableCopyDraftTest and CreatorAiProductCopyConcurrencyTest.
for (const width of [360, 375, 768, 1024, 1440]) {
  test(`private review survives reopening and keyboard discard at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    let draft: Record<string, unknown> | null = null;
    let failedReview = false;
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      const body = route.request().postDataJSON();
      let data: unknown = {};
      if (url.pathname.endsWith('/copy-availability')) data = {available: true};
      else if (url.pathname.endsWith('/copy-proposals')) {
        draft = {draft_id: '8ab61a95-2f37-4ae0-86ed-17e2d76d6933', draft_version: 0, state: 'proposed',
          title: 'Private worksheet', description: 'Printable practice exercises.', source_fingerprint: 'a'.repeat(64)};
        data = draft;
      } else if (url.pathname.endsWith('/discard')) { draft = null; data = {state: 'discarded'}; }
      else if (url.pathname.endsWith('/copy-drafts')) data = draft ?? {};
      else if (url.pathname.includes('/copy-drafts/')) {
        if (failedReview) { await route.fulfill({status: 409, json: {message: 'Concurrent review'}}); return; }
        draft = {...draft, description: body.description, draft_version: body.version + 1, state: 'reviewed'};
        data = draft;
      } else if (url.pathname.endsWith('/copy-revision')) data = {unchanged: true};
      else throw new Error('Unexpected API request: ' + url.pathname);
      await route.fulfill({json: {data}});
    });
    await page.goto('/tests/e2e/fixtures/product-copy.html');
    await page.getByRole('button', {name: 'Suggest copy', exact: true}).click();
    const text = page.getByRole('textbox');
    await expect(text).toBeFocused();
    await text.fill('Creator text that must survive refresh.');
    await page.getByRole('button', {name: 'Save private draft'}).click();
    await expect(page.getByRole('status')).toContainText('Private review saved');
    await expect(page.getByTestId('product-description')).toHaveText('Original product description.');
    await page.reload();
    await expect(text).toHaveValue('Creator text that must survive refresh.');
    await expect(text).toBeFocused();
    failedReview = true;
    await text.fill('Local text survives a conflict too.');
    await page.getByRole('button', {name: 'Save private draft'}).click();
    await expect(page.getByRole('alert')).toContainText('Your text is preserved');
    await expect(text).toHaveValue('Local text survives a conflict too.');
    // Exercise 200% CSS zoom and reflow with the real production stylesheet.
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await text.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Apply', exact: true})).toBeFocused();
    await text.focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('status')).toContainText('Suggestion discarded');
    await expect(page.getByRole('button', {name: 'Suggest copy', exact: true})).toBeFocused();
    await expect(page.getByTestId('product-description')).toHaveText('Original product description.');
    await page.reload();
    await expect(text).toHaveCount(0);
  });
}

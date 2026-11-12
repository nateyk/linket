import fs from 'node:fs';
import path from 'node:path';
import Color from 'colorjs.io';
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test';

/**
 * SF-05: measured ACTION-LEVEL contrast on actual saved storefront themes.
 * Uses real computed button fill/text/focus colors; not mock Appearance data.
 * Read-only, disposable MySQL, synthetic creator products and services.
 *
 * This is supporting browser evidence, not a claim of photo/image-backed
 * text contrast, real-device acceptance or NVDA/VoiceOver certification.
 */
const isolated = process.env.LINKET_ISOLATED_E2E === '1' &&
  process.env.APP_ENV === 'testing' &&
  process.env.DB_DATABASE === 'belink_test' &&
  process.env.E2E_BASE_URL === 'http://127.0.0.1:8081';

const variants = ['light', 'dark', 'gradient'] as const;

function productId(): number {
  const filename = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(filename)).toBe(true);
  const data = JSON.parse(fs.readFileSync(filename, 'utf8')) as {
    database: string;
    product_id: number;
  };
  expect(data.database).toBe('belink_test');
  return data.product_id;
}

function rgb(input: string) {
  return new Color(input).to('srgb');
}

function ratio(a: Color, b: Color): number {
  const high = Math.max(a.luminance, b.luminance);
  const low = Math.min(a.luminance, b.luminance);
  return (high + 0.05) / (low + 0.05);
}

function worstCaseAgainstTranslucentPanel(ink: string, panelCss: string) {
  const foreground = rgb(ink);
  const panel = rgb(panelCss);
  const alpha = panel.alpha ?? 1;
  return Math.min(...[0, 1].map(seat => {
    const backing = new Color('srgb', (panel.coords as number[])
      .map(channel => channel * alpha + seat * (1 - alpha)));
    return ratio(foreground, backing);
  }));
}

async function buttonColors(button: Locator) {
  return button.evaluate(node => {
    const style = getComputedStyle(node);
    const card = node.closest('[data-slot="card"]');
    if (!card) throw new Error('Expected published storefront card around action');
    const cardStyle = getComputedStyle(card);
    const box = node.getBoundingClientRect();
    return {
      text: style.color,
      fill: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      focus: style.outlineColor,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      focusVisible: node.matches(':focus-visible'),
      cardBackground: cardStyle.backgroundColor,
      buttonWidth: box.width,
      isDisabled: (node as HTMLButtonElement).disabled,
    };
  });
}

async function attachEvidence(info: TestInfo, name: string, data: unknown) {
  await info.attach(name + '.json', {
    body: Buffer.from(JSON.stringify(data, null, 2)),
    contentType: 'application/json',
  });
}

async function reachButtonWithTab(page: Page, button: Locator) {
  for (let press = 0; press < 90; press++) {
    await page.keyboard.press('Tab');
    if (await button.evaluate(node => node === document.activeElement)) return true;
  }
  return false;
}

test.describe('SF-05 saved Appearance: real action and focus contrast', () => {
  test.skip(!isolated, 'Requires local-only isolated disposable MySQL fixture');
  test.use({reducedMotion: 'reduce'});
  test.setTimeout(90_000);

  for (const variant of variants) {
    test(variant + ': service action focus, product action fill and gradient stops', async ({page}, info) => {
      await page.setViewportSize({width: 375, height: 812});
      const service = '/sf12-appearance-' + variant +
        '/services/sf12-qa-service-' + variant;
      expect((await page.goto(service))?.ok()).toBe(true);

      const quote = page.getByRole('button', {name: 'Request this package'}).first();
      await expect(quote).toBeVisible();
      await expect(quote).toBeEnabled();
      // Use actual keyboard traversal, not programmatic element.focus().
      expect(await reachButtonWithTab(page, quote),
        variant + ': quote action is reachable with Tab').toBe(true);
      const focused = await buttonColors(quote);
      expect(focused.focusVisible, variant + ': true keyboard focus-visible').toBe(true);
      expect(focused.outlineStyle, variant + ': visible focus stroke').not.toBe('none');
      expect(focused.outlineWidth, variant + ': focus stroke at least 2px')
        .toBeGreaterThanOrEqual(2);
      expect(focused.buttonWidth).toBeGreaterThanOrEqual(44);
      expect(focused.backgroundImage, 'Solid saved CTA is not a gradient').toBe('none');
      expect(rgb(focused.fill).alpha, 'Action requires painted fill').toBeGreaterThanOrEqual(0.99);

      const quoteText = ratio(rgb(focused.text), rgb(focused.fill));
      const focusPanel = worstCaseAgainstTranslucentPanel(
        focused.focus, focused.cardBackground,
      );
      expect(quoteText, variant + ': service CTA normal text contrast')
        .toBeGreaterThanOrEqual(4.5);
      expect(focusPanel, variant + ': focus ring against adjacent card panel')
        .toBeGreaterThanOrEqual(3);
      await attachEvidence(info, variant + '-quote-focus-contrast',
        {service, focused, quoteText, focusPanel});

      const screenshot = info.outputPath('sf05-' + variant + '-keyboard-focus.png');
      await page.screenshot({path: screenshot, fullPage: false});
      await info.attach(variant + '-quote-focus-screenshot',
        {path: screenshot, contentType: 'image/png'});

      const product = '/sf12-appearance-' + variant +
        '/products/' + productId();
      expect((await page.goto(product))?.ok()).toBe(true);
      const buy = page.getByRole('button',
        {name: /Buy now|Get for free|Temporarily unavailable/}).first();
      await expect(buy).toBeVisible();
      const productColors = await buttonColors(buy);
      const productText = ratio(rgb(productColors.text), rgb(productColors.fill));
      await attachEvidence(info, variant + '-product-action-contrast',
        {product, productColors, productText});
      if (!productColors.isDisabled) {
        expect(productColors.backgroundImage).toBe('none');
        expect(rgb(productColors.fill).alpha).toBeGreaterThanOrEqual(0.99);
        expect(productText, variant + ': enabled product CTA normal text contrast')
          .toBeGreaterThanOrEqual(4.5);
      }

      if (variant === 'gradient') {
        const saved = await page.locator('[style*="--biolink-text"]').first()
          .evaluate(node => getComputedStyle(node).getPropertyValue('--biolink-text').trim());
        const stopRatios = ['#e0f2fe', '#c7d2fe']
          .map(stop => ratio(rgb(saved), rgb(stop)));
        expect(Math.min(...stopRatios),
          'Text against both synthetic saved gradient stops').toBeGreaterThanOrEqual(4.5);
        const hasGradient = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('[style]')].some(node =>
            getComputedStyle(node).backgroundImage.includes('linear-gradient(135deg'),
          ),
        );
        expect(hasGradient, 'Public page paints the saved gradient').toBe(true);
        await attachEvidence(info, 'gradient-stop-contrast',
          {savedText: saved, stops: ['#e0f2fe', '#c7d2fe'], stopRatios});
      }
    });
  }
});

import {expect, test, type Page, type TestInfo} from '@playwright/test';

/**
 * UX-35 supplementary audit: real installed locale metadata and measured
 * text contrast for four Product Creation pages in light + dark modes.
 * This is NOT native browser zoom, screen-reader or translated-language
 * human acceptance; those remain separate issue #168 review gates.
 */
type Theme = 'light' | 'dark';
type Pair = {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  fontSize: number;
  weight: number;
};

function requireIsolatedQA() {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1' ||
      !['http://127.0.0.1:8081', 'http://localhost:8081'].includes(
        process.env.E2E_BASE_URL ?? '',
      ),
    'Supplementary audit requires loopback-only isolated browser QA',
  );
}

async function signInCreator(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(
    process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test',
  );
  await page.getByRole('textbox', {name: 'Password'}).fill(
    process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23',
  );
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 15000});
}

async function installedLocaleEvidence(page: Page) {
  return page.evaluate(() => {
    const raw = (window as Window & {bootstrapData?: unknown}).bootstrapData;
    const bootstrap = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
      i18n?: {
        active?: string;
        direction?: string;
        locales?: Array<{name: string; language: string; direction?: string}>;
      };
    } | undefined;
    return {
      active: bootstrap?.i18n?.active ?? null,
      direction: bootstrap?.i18n?.direction ?? null,
      locales: (bootstrap?.i18n?.locales ?? []).map(locale => ({
        name: locale.name,
        code: locale.language,
        direction: locale.direction ?? null,
      })),
      documentLanguage: document.documentElement.lang,
      documentDirection: document.documentElement.dir,
    };
  });
}

type Rgba = {r: number; g: number; b: number; a: number};
type SampledColors = {
  element: string;
  foreground: Rgba;
  layers: Array<{color: Rgba; backgroundImage: string}>;
  fontSize: number;
  weight: number;
};

function blend(back: Rgba, front: Rgba): Rgba {
  const opacity = front.a;
  return {
    r: back.r * (1 - opacity) + front.r * opacity,
    g: back.g * (1 - opacity) + front.g * opacity,
    b: back.b * (1 - opacity) + front.b * opacity,
    a: 1,
  };
}

function channelLuminance(value: number) {
  const linear = value / 255;
  return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgba) {
  return 0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b);
}

function ratio(foreground: Rgba, background: Rgba) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

function rgb(color: Rgba) {
  return 'rgb(' + [color.r, color.g, color.b].map(Math.round).join(', ') + ')';
}

async function sampleCssColors(page: Page, selector: string): Promise<SampledColors> {
  return page.locator(selector).first().evaluate(node => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('Cannot resolve CSS colors without Canvas');
    const read = (cssColor: string): Rgba => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = cssColor;
      context.fillRect(0, 0, 1, 1);
      const color = context.getImageData(0, 0, 1, 1).data;
      return {r: color[0], g: color[1], b: color[2], a: color[3] / 255};
    };
    const layers: SampledColors['layers'] = [];
    for (let element: HTMLElement | null = node as HTMLElement; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      layers.unshift({color: read(style.backgroundColor), backgroundImage: style.backgroundImage});
    }
    const style = getComputedStyle(node);
    return {
      element: node.tagName.toLowerCase() + (node.id ? '#' + node.id : ''),
      foreground: read(style.color),
      layers,
      fontSize: Number.parseFloat(style.fontSize),
      weight: Number.parseInt(style.fontWeight, 10) || 400,
    };
  });
}

async function measureTextPair(page: Page, selector: string): Promise<Pair> {
  const sample = await sampleCssColors(page, selector);
  expect(
    sample.layers.every(layer => layer.backgroundImage === 'none'),
    'Image-backed surface cannot be treated as a known solid-color pair',
  ).toBe(true);
  const white: Rgba = {r: 255, g: 255, b: 255, a: 1};
  const surface = sample.layers.reduce((back, layer) => blend(back, layer.color), white);
  const ink = blend(surface, sample.foreground);
  return {
    element: sample.element,
    foreground: rgb(ink),
    background: rgb(surface),
    ratio: ratio(ink, surface),
    fontSize: sample.fontSize,
    weight: sample.weight,
  };
}

function wcagAaThreshold(pair: Pair): number {
  const isLarge = pair.fontSize >= 24 || (pair.fontSize >= 18.66 && pair.weight >= 700);
  return isLarge ? 3 : 4.5;
}

async function checkCreationPage(page: Page, type: string, theme: Theme) {
  await page.goto('/dashboard/items/new/' + type);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.evaluate(isDark => {
    document.documentElement.classList.toggle('dark', isDark);
  }, theme === 'dark');
  const results: Pair[] = [];
  for (const selector of ['h1', 'h2', 'label[for]:visible']) {
    if (await page.locator(selector).first().isVisible()) {
      const pair = await measureTextPair(page, selector);
      expect(
        pair.ratio,
        type + ' ' + theme + ' ' + selector + ' ' +
          pair.foreground + ' on ' + pair.background,
      ).toBeGreaterThanOrEqual(wcagAaThreshold(pair));
      results.push(pair);
    }
  }
  expect(results.length, 'Must measure real headings in each editor').toBeGreaterThanOrEqual(2);
  return results;
}

test('UX-35 supplementary installed locales and four-editor theme contrast', async ({
  page,
}, testInfo: TestInfo) => {
  requireIsolatedQA();
  test.setTimeout(120_000);
  await signInCreator(page);
  await page.goto('/dashboard/items/new/digital');
  const locale = await installedLocaleEvidence(page);
  expect(locale.locales.length, 'At least one installed locale').toBeGreaterThan(0);
  expect(locale.locales.map(l => l.code)).toContain(locale.active);
  expect(locale.documentLanguage, 'HTML document language must match actual active catalog')
    .toBe(locale.active);

  const evidence: Record<string, Pair[]> = {};
  for (const theme of ['light', 'dark'] as const) {
    for (const type of ['digital', 'ebook', 'audio', 'course'] as const) {
      evidence[theme + '-' + type] = await checkCreationPage(page, type, theme);
    }
  }
  const report = {
    scope: 'Computed solid-surface text pairs only; not full WCAG or human acceptance',
    standard: 'WCAG 2.2 AA 1.4.3 (4.5:1 normal text, 3:1 large text)',
    installedLocales: locale,
    measurements: evidence,
    humanGates: 'NOT RUN: true browser-toolbar 200% zoom, NVDA/VoiceOver, genuine translated-language verification',
  };
  await testInfo.attach('UX35 installed locale and light/dark contrast measurements', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });
});

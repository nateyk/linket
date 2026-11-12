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


/**
 * UX-35 automated accessibility follow-up. These checks intentionally use
 * the real rendered CSS and real client-side validation, but cannot claim
 * that NVDA or VoiceOver uttered anything: that remains human acceptance.
 *
 * WCAG 2.2 AA 1.4.11: a focused outline must contrast >= 3:1 with the
 * adjacent outer solid surface. We fail closed for gradients/images and
 * outlines that are not painted, instead of silently counting a CSS token.
 */
type FocusOutlineEvidence = {
  control: string;
  widthPx: number;
  offsetPx: number;
  style: string;
  outline: string;
  surroundingSurface: string;
  ratio: number;
};

async function measureFocusedOutline(
  page: Page,
  selector: string,
): Promise<FocusOutlineEvidence> {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  // Establish keyboard modality, then focus this specific control without
  // depending on the dashboard sidebar's variable number of tab stops.
  await page.keyboard.press('Tab');
  await target.focus();
  await expect(target).toBeFocused();
  const computed = await target.evaluate(node => {
    const css = getComputedStyle(node);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) throw new Error('Cannot resolve focus color without Canvas');
    context.fillStyle = css.outlineColor;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return {
      visible: node.matches(':focus-visible'),
      widthPx: Number.parseFloat(css.outlineWidth),
      offsetPx: Number.parseFloat(css.outlineOffset),
      style: css.outlineStyle,
      outline: {r: data[0], g: data[1], b: data[2], a: data[3] / 255},
    };
  });
  expect(computed.visible, selector + ' must be keyboard focus-visible').toBe(true);
  expect(computed.style, selector + ' must paint an outline').not.toBe('none');
  expect(computed.widthPx, selector + ' outline must be at least 2 CSS px')
    .toBeGreaterThanOrEqual(2);
  expect(computed.offsetPx, selector + ' outline must not be hidden inside the control')
    .toBeGreaterThanOrEqual(0);

  // For nonnegative outline offsets the painted outline sits outside the
  // element. Resolve the *ancestors'* solid background, not the button's
  // own fill (an easy false-positive with filled primary buttons).
  const sample = await sampleCssColors(page, selector);
  const outerLayers = sample.layers.slice(0, -1);
  expect(outerLayers.length, 'Focus outline requires a resolvable surrounding surface')
    .toBeGreaterThan(0);
  expect(
    outerLayers.every(layer => layer.backgroundImage === 'none'),
    selector + ' focus outline is against an image-backed surface: manual audit required',
  ).toBe(true);
  const white: Rgba = {r: 255, g: 255, b: 255, a: 1};
  const surface = outerLayers.reduce((back, layer) => blend(back, layer.color), white);
  const ink = blend(surface, computed.outline);
  const measured = ratio(ink, surface);
  expect(measured, selector + ' ' + rgb(ink) + ' on ' + rgb(surface) + ' (WCAG 2.2 AA 1.4.11)')
    .toBeGreaterThanOrEqual(3);
  return {
    control: selector,
    widthPx: computed.widthPx,
    offsetPx: computed.offsetPx,
    style: computed.style,
    outline: rgb(ink),
    surroundingSurface: rgb(surface),
    ratio: measured,
  };
}

test('UX-35 keyboard focus outlines meet 3:1 on all four editors in both themes', async (
  {page},
  testInfo: TestInfo,
) => {
  requireIsolatedQA();
  test.setTimeout(180_000);
  await signInCreator(page);
  const evidence: Record<string, FocusOutlineEvidence[]> = {};
  for (const theme of ['light', 'dark'] as const) {
    for (const type of ['digital', 'ebook', 'audio', 'course'] as const) {
      await page.goto('/dashboard/items/new/' + type);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await page.evaluate(isDark => {
        document.documentElement.classList.toggle('dark', isDark);
      }, theme === 'dark');
      const actions = type === 'course'
        ? ['button[aria-label="Preview"]', 'button[aria-label="Create course"]']
        : ['button[aria-label="Preview"]', 'button[aria-label="Save draft"]'];
      evidence[theme + '-' + type] = [];
      for (const selector of actions) {
        evidence[theme + '-' + type].push(await measureFocusedOutline(page, selector));
      }
    }
  }
  expect(Object.keys(evidence)).toHaveLength(8);
  await testInfo.attach('UX35 rendered keyboard focus outline contrast', {
    body: Buffer.from(JSON.stringify({
      standard: 'WCAG 2.2 AA 1.4.11, active focus outline on adjacent solid surface >= 3:1',
      methodology: 'Actual Chromium computed outline, keyboard :focus-visible and composited ancestor backgrounds',
      limits: 'Not native screen-reader acceptance; not every possible focus target, pseudo-element or image-backed surface',
      measurements: evidence,
    }, null, 2)),
    contentType: 'application/json',
  });
});

test('UX-35 required-field errors expose assertive alerts in all four editors without writes', async (
  {page},
  testInfo: TestInfo,
) => {
  requireIsolatedQA();
  test.setTimeout(120_000);
  await signInCreator(page);
  const posts: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/items') {
      posts.push(request.url());
    }
  });
  const evidence: Array<{
    type: string;
    message: string;
    field: string;
    alertRole: string | null;
    ariaInvalid: string | null;
    ariaDescribedBy: string | null;
    ariaErrorMessage: string | null;
  }> = [];
  for (const type of ['digital', 'ebook', 'audio', 'course'] as const) {
    await page.goto('/dashboard/items/new/' + type);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const selector = type === 'course' ? '#course-title' : '#product-title';
    const message = type === 'course' ? 'Add a course title.' : 'Title is required';
    const title = page.locator(selector);
    await expect(title).toBeVisible();
    if (type === 'course') {
      // Prevent default on the empty form: this must NOT call the create API.
      await page.getByRole('button', {name: 'Create course'}).click();
      await expect(title).toBeFocused();
    } else {
      // Trigger the real per-field blur validator, without Save or network.
      await title.fill('temporary');
      await title.fill('');
      await title.press('Tab');
    }
    const field = title.locator('xpath=ancestor::*[@data-slot="field"][1]');
    const alert = field.locator('[data-slot="field-error"][role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(message);
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    const semantics = await title.evaluate(node => {
      const error = node.closest('[data-slot="field"]')
        ?.querySelector<HTMLElement>('[data-slot="field-error"]');
      return {
        alertRole: error?.getAttribute('role') ?? null,
        ariaInvalid: node.getAttribute('aria-invalid'),
        ariaDescribedBy: node.getAttribute('aria-describedby'),
        ariaErrorMessage: node.getAttribute('aria-errormessage'),
      };
    });
    expect(semantics.alertRole, type + ' validation must be an assertive live alert')
      .toBe('alert');
    evidence.push({type, field: selector, message, ...semantics});
  }
  expect(posts, 'Client validation must never create a product').toEqual([]);
  expect(evidence).toHaveLength(4);
  await testInfo.attach('UX35 four-editor client validation alert semantics', {
    body: Buffer.from(JSON.stringify({
      scope: 'Actual client validation on empty title; no network product writes',
      mechanism: 'A visible role=alert is an assertive live-region announcement; aria-invalid is set',
      limits: 'Native NVDA/VoiceOver spoken output not tested; field-to-error description linkage recorded for review',
      fields: evidence,
    }, null, 2)),
    contentType: 'application/json',
  });
});

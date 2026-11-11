import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type Browser, type Page, type Response, type TestInfo} from '@playwright/test';

/**
 * UX-35: REAL browser upload/create flows, not synthetic API fixtures.
 * Guarded by the disposable belink_test reviewer environment. Never run
 * these persistent writes against staging or production customer data.
 *
 * Human native 200% zoom, NVDA/VoiceOver, localization and staging signoff
 * are separate gates recorded in UX-35 issue #168.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8081';
const creatorEmail = process.env.LINKET_E2E_CREATOR_EMAIL ?? 'e2e-buyer-creator@example.test';
const creatorPassword = process.env.LINKET_E2E_CREATOR_PASSWORD ?? 'E2eBuyerCreator!23';
const reviewerEmail = process.env.LINKET_E2E_REVIEWER_EMAIL ?? 'e2e-product-reviewer@example.test';

type AccountCredentials = {email: string; password: string};
type CreatedItem = {id: number; title: string};
const creatorAccount: AccountCredentials = {email: creatorEmail, password: creatorPassword};

function guardIsolatedEnvironment() {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1' ||
      process.env.VERIFY_ET_MOCK !== 'true' ||
      !['http://127.0.0.1:8081', 'http://localhost:8081'].includes(baseURL),
    'Requires opt-in disposable loopback database with mocked verifier',
  );
  const fixturePath = path.resolve('storage/app/e2e/buyer-fixture.json');
  expect(fs.existsSync(fixturePath), 'Guarded buyer fixture must exist').toBe(true);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {database: string};
  expect(fixture.database, 'Never write to a non-disposable DB').toBe('belink_test');
  expect(process.env.LINKET_E2E_REVIEWER_PASSWORD).toBeTruthy();
}

async function signIn(page: Page, account: AccountCredentials) {
  await page.goto('/login');
  await expect(page.getByRole('heading', {name: 'Login to your account'})).toBeVisible();
  await page.getByRole('textbox', {name: 'Email Address'}).fill(account.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(account.password);
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, {timeout: 20000});
}

function isItemResponse(response: Response, item?: CreatedItem) {
  const pathname = new URL(response.url()).pathname;
  return pathname === (item ? '/api/v1/items/' + item.id : '/api/v1/items') &&
    response.request().method() === 'POST' &&
    (item ? response.request().headers()['x-http-method-override']?.toUpperCase() === 'PUT'
      : !response.request().headers()['x-http-method-override']);
}

function isSubmitResponse(response: Response, item: CreatedItem) {
  return new URL(response.url()).pathname === '/api/v1/items/' + item.id + '/submit' &&
    response.request().method() === 'POST';
}

function makePdf(): Buffer {
  // A minimal well-formed, single-page PDF with accurate xref offsets.
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream',
  ];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(data, 'utf8'));
    data += (i + 1) + ' 0 obj\n' + objs[i] + '\nendobj\n';
  }
  const xrefOffset = Buffer.byteLength(data, 'utf8');
  data += 'xref\n0 5\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    data += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  data += 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return Buffer.from(data, 'utf8');
}

function makeWav(): Buffer {
  // 250 ms of silent 8 kHz mono PCM, with a valid RIFF/WAVE header.
  const samples = 2000;
  const payloadBytes = samples * 2;
  const bytes = Buffer.alloc(44 + payloadBytes);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(36 + payloadBytes, 4);
  bytes.write('WAVEfmt ', 8, 'ascii');
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36, 'ascii');
  bytes.writeUInt32LE(payloadBytes, 40);
  return bytes;
}

async function approveRealProduct(browser: Browser, item: CreatedItem) {
  const context = await browser.newContext({baseURL, viewport: {width: 1280, height: 900}});
  try {
    const reviewer = await context.newPage();
    await signIn(
      reviewer,
      {email: reviewerEmail, password: process.env.LINKET_E2E_REVIEWER_PASSWORD!},
    );
    await reviewer.goto('/admin/items/' + item.id);
    await expect(reviewer.getByText(item.title).first()).toBeVisible();
    const responsePromise = reviewer.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/v1/admin/items/' + item.id + '/approve' &&
      response.request().method() === 'POST',
    );
    await reviewer.getByRole('button', {name: 'Approve', exact: true}).click();
    const response = await responsePromise;
    expect(response.status(), 'Real reviewer approval').toBe(200);
    expect(((await response.json()) as {status: string}).status).toBe('approved');
  } finally {
    await context.close();
  }
}

const uploadScenarios = [
  {
    type: 'digital',
    label: 'Digital product',
    section: 'Files buyers receive',
    name: 'creator-guide.txt',
    mimeType: 'text/plain',
    file: () => Buffer.from('Linket isolated private product download\n', 'utf8'),
    billing: 'free',
    cents: 0,
  },
  {
    type: 'ebook',
    label: 'E-book',
    section: 'Book files',
    name: 'creator-book.pdf',
    mimeType: 'application/pdf',
    file: makePdf,
    billing: 'paid',
    cents: 1425,
  },
  {
    type: 'audio',
    label: 'Audio',
    section: 'Full audio files',
    name: 'creator-audio.wav',
    mimeType: 'audio/wav',
    file: makeWav,
    billing: 'free',
    cents: 0,
  },
] as const;


type UploadScenario = (typeof uploadScenarios)[number];
type UploadedItem = CreatedItem & {scenario: UploadScenario};

async function uploadPrivateFile(page: Page, scenario: UploadScenario) {
  const files = page.getByRole('region', {name: scenario.section});
  const input = files.locator('input[type="file"]');
  await expect(input).toHaveCount(1);
  await input.setInputFiles({
    name: scenario.name,
    mimeType: scenario.mimeType,
    buffer: scenario.file(),
  });
  await expect(
    files.getByRole('button', {name: 'Remove ' + scenario.name}),
    'Real TUS upload must persist the private file before creating an item',
  ).toBeVisible({timeout: 65000});
}

async function createUploadedProduct(
  page: Page,
  scenario: UploadScenario,
): Promise<UploadedItem> {
  const title = 'UX35 new ' + scenario.label + ' creator E2E';
  await page.goto('/dashboard/items/new/' + scenario.type + '?billing=' + scenario.billing);
  await expect(page.getByRole('heading', {
    name: new RegExp('create ' + scenario.label, 'i'),
    level: 1,
  })).toBeVisible();
  await page.locator('#product-title').fill(title);
  if (scenario.billing === 'paid') {
    await page.locator('#product-price, input[type="number"]').first()
      .fill((scenario.cents / 100).toFixed(2));
  }
  await uploadPrivateFile(page, scenario);

  const creates: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/items' &&
        request.method() === 'POST') creates.push(request.url());
  });
  const creation = page.waitForResponse(response => isItemResponse(response));
  await page.getByRole('button', {name: 'Save draft'}).click();
  const saved = await creation;
  expect(saved.ok(), 'Server accepted real product creation').toBe(true);
  const body = (await saved.json()) as {data: {id: number; type: string}};
  const posted = saved.request().postDataJSON() as {
    type: string; price_cents: number; file_ids: number[];
  };
  expect(body.data.id).toBeGreaterThan(0);
  expect(body.data.type).toBe(scenario.type);
  expect(posted.type).toBe(scenario.type);
  expect(posted.price_cents).toBe(scenario.cents);
  expect(posted.file_ids).toHaveLength(1);
  expect(posted.file_ids[0]).toBeGreaterThan(0);
  expect(creates, 'No duplicate product POST').toHaveLength(1);
  await expect(page).toHaveURL(new RegExp('/dashboard/items/' + body.data.id + '/edit$'));
  return {id: body.data.id, title, scenario};
}

async function editAndSubmitNewProduct(
  page: Page,
  item: UploadedItem,
): Promise<UploadedItem> {
  const {id, scenario, title} = item;
  await page.reload();
  await expect(page.locator('#product-title')).toHaveValue(title);
  await expect(page.getByRole('button', {name: 'Remove ' + scenario.name})).toBeVisible();

  const updatedTitle = title + ' revised';
  await page.locator('#product-title').fill(updatedTitle);
  const update = page.waitForResponse(res => isItemResponse(res, item));
  await page.getByRole('button', {name: 'Save draft'}).click();
  expect((await update).ok(), 'Actual persisted edit').toBe(true);
  const submission = page.waitForResponse(res => isSubmitResponse(res, item));
  await page.getByRole('button', {name: 'Submit for review'}).click();
  const result = await submission;
  expect(result.status()).toBe(200);
  expect(((await result.json()) as {data: {status: string}}).data.status)
    .toBe('pending_approval');
  return {...item, title: updatedTitle};
}

async function screenshotApprovedProduct(
  page: Page,
  item: UploadedItem,
  testInfo: TestInfo,
) {
  const {id, scenario} = item;
  await page.goto('/dashboard/items/' + id + '/edit');
  await expect(page.locator('[aria-label="Approved"]')).toBeVisible();
  const screenshot = testInfo.outputPath('created-' + scenario.type + '-approved-375.png');
  await page.screenshot({path: screenshot, fullPage: true});
  await testInfo.attach('UX35 ' + scenario.type + ' real upload-to-approved (375px)', {
    path: screenshot,
    contentType: 'image/png',
  });
}

for (const scenario of uploadScenarios) {
  test('UX-35 real ' + scenario.type + ' upload → new item → edit → review → approve', async ({
    browser,
  }, testInfo) => {
    guardIsolatedEnvironment();
    test.setTimeout(180_000);
    const context = await browser.newContext({baseURL, viewport: {width: 375, height: 812}});
    try {
      const creator = await context.newPage();
      await signIn(creator, creatorAccount);
      const created = await createUploadedProduct(creator, scenario);
      const reviewed = await editAndSubmitNewProduct(creator, created);
      await approveRealProduct(browser, reviewed);
      await screenshotApprovedProduct(creator, reviewed, testInfo);
    } finally {
      await context.close();
    }
  });
}

async function createRealCourse(page: Page): Promise<CreatedItem> {
  const title = 'UX35 new Course curriculum E2E';
  await page.goto('/dashboard/items/new/course?billing=free');
  await expect(page.getByRole('heading', {name: 'Create course', level: 1})).toBeVisible();
  await page.locator('#course-title').fill(title);
  const posted: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/items' &&
        request.method() === 'POST') posted.push(request.url());
  });
  const create = page.waitForResponse(response => isItemResponse(response));
  await page.getByRole('button', {name: 'Create course'}).click();
  const response = await create;
  expect(response.ok(), 'Real Course creation must succeed').toBe(true);
  const body = (await response.json()) as {data: {id: number; type: string}};
  expect(body.data.id).toBeGreaterThan(0);
  expect(body.data.type).toBe('course');
  expect(posted, 'Course creation must not duplicate POST').toHaveLength(1);
  await expect(page).toHaveURL(new RegExp('/dashboard/items/' + body.data.id + '/course$'));
  await expect(page.getByRole('heading', {name: 'Course Builder', level: 1})).toBeVisible();
  return {id: body.data.id, title};
}

async function addRealPublishedCourseLesson(page: Page) {
  const chapter = page.waitForResponse(response =>
    /^\/api\/v1\/courses\/\d+\/chapters$/.test(new URL(response.url()).pathname) &&
    response.request().method() === 'POST',
  );
  await page.getByRole('button', {name: 'New chapter'}).click();
  expect((await chapter).ok(), 'New course chapter saved').toBe(true);

  await expect(page.getByRole('button', {name: 'New lesson'})).toBeVisible();
  const lesson = page.waitForResponse(response =>
    /^\/api\/v1\/course-chapters\/\d+\/lessons$/.test(new URL(response.url()).pathname) &&
    response.request().method() === 'POST',
  );
  await page.getByRole('button', {name: 'New lesson'}).click();
  expect((await lesson).ok(), 'New course lesson saved').toBe(true);

  const statusSwitch = page.getByRole('switch').last();
  await expect(statusSwitch).toBeVisible();
  await statusSwitch.click();
  await expect(statusSwitch).toHaveAttribute('aria-checked', 'true');

  const save = page.waitForResponse(response =>
    /^\/api\/v1\/course-lessons\/\d+$/.test(new URL(response.url()).pathname) &&
    ['PUT', 'POST'].includes(response.request().method()) &&
    (response.request().method() === 'PUT' ||
      response.request().headers()['x-http-method-override']?.toUpperCase() === 'PUT'),
  );
  await page.getByRole('button', {name: 'Save changes'}).click();
  expect((await save).ok(), 'Published lesson persisted').toBe(true);
}

async function submitRealCourse(page: Page, item: CreatedItem) {
  const button = page.getByRole('button', {name: 'Submit for review'});
  await expect(button).toBeEnabled();
  const response = page.waitForResponse(res => isSubmitResponse(res, item));
  await button.click();
  expect((await response).status(), 'Real Course submission must succeed').toBe(200);
}

async function captureApprovedMobileCourse(
  browser: Browser,
  item: CreatedItem,
  testInfo: TestInfo,
) {
  const context = await browser.newContext({baseURL, viewport: {width: 375, height: 812}});
  try {
    const page = await context.newPage();
    await signIn(page, creatorAccount);
    await page.goto('/dashboard/items/' + item.id + '/course');
    await expect(page.getByRole('heading', {name: 'Course Builder', level: 1})).toBeVisible();
    await expect(page.getByText('Published', {exact: true}).first()).toBeVisible();
    const screenshot = testInfo.outputPath('created-course-approved-375.png');
    await page.screenshot({path: screenshot, fullPage: true});
    await testInfo.attach('UX35 Course new-to-approved 375px', {
      path: screenshot,
      contentType: 'image/png',
    });
  } finally {
    await context.close();
  }
}

test('UX-35 real Course new → chapter → published lesson → review → approve', async ({
  browser,
}, testInfo) => {
  guardIsolatedEnvironment();
  test.setTimeout(180_000);
  const context = await browser.newContext({baseURL, viewport: {width: 1280, height: 900}});
  try {
    const creator = await context.newPage();
    await signIn(creator, creatorAccount);
    const item = await createRealCourse(creator);
    await addRealPublishedCourseLesson(creator);
    await submitRealCourse(creator, item);
    await approveRealProduct(browser, item);
    await captureApprovedMobileCourse(browser, item, testInfo);
  } finally {
    await context.close();
  }
});

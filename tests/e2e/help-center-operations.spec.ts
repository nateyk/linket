import fs from 'node:fs';
import path from 'node:path';
import {expect, test, type Browser, type Page} from '@playwright/test';

type Account = {email: string; password: string};
type Fixture = {database: string; admin: Account; buyer: Account};
type Report = {
  newConversations: {datasets: Array<{total: number}>};
  agents: {datasets: Array<{totalAgentReplies: number}>};
};

function isolatedFixture(): Fixture {
  const hostname = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').hostname;
  expect(
    ['localhost', '127.0.0.1', 'linket.ddev.site'].includes(hostname),
    'Refusing to mutate a nonlocal support environment',
  ).toBe(true);
  const fixturePath = path.resolve('storage/app/e2e/hc-fixture.json');
  expect(fs.existsSync(fixturePath), 'Missing disposable HC fixture').toBe(true);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Fixture;
  expect(fixture.database.toLowerCase()).toContain('test');
  return fixture;
}

async function login(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', {name: 'Email Address'}).fill(account.email);
  await page.getByRole('textbox', {name: 'Password'}).fill(account.password);
  await page.getByRole('button', {name: 'Login'}).click();
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 45_000});
}

function matchResponse(page: Page, pathname: string, method: string) {
  return page.waitForResponse(response =>
    new URL(response.url()).pathname === pathname &&
    response.request().method() === method &&
    response.ok(),
  );
}

async function reportSnapshot(page: Page): Promise<Report> {
  // Query the same authenticated endpoint the real report screen uses, but
  // assert failures directly instead of silently waiting for an OK response.
  const report = await page.request.get('/api/v1/reports/conversations/ticket', {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: page.url(),
    },
  });
  const body = await report.text();
  expect(
    report.ok(),
    'Support report HTTP ' + report.status() + ': ' + body.slice(0, 700),
  ).toBe(true);

  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  const pageResponse = await page.goto('/agent/reports/tickets');
  await expect(page).toHaveURL(/\/agent\/reports\/tickets/);
  try {
    await expect(page.getByText('New Conversations').first())
      .toBeVisible({timeout: 10_000});
    await expect(page.getByText('Total agent replies').first()).toBeVisible();
  } catch {
    const text = (await page.locator('body').innerText()).slice(0, 1400);
    throw new Error(
      'Report page HTTP ' + pageResponse?.status() +
      ' URL ' + page.url() +
      ' body=' + JSON.stringify(text) +
      ' browserErrors=' + JSON.stringify(browserErrors.slice(0, 7)),
    );
  }
  return JSON.parse(body) as Report;
}

async function selectTicketStatus(page: Page, label: 'Open' | 'Resolved'): Promise<void> {
  // The toolbar contains the status menu; the composer has a second status control.
  await page.getByRole('button', {name: /^(Open|Resolved)$/}).first().click();
  await page.getByText(label, {exact: true}).last().click();
}

test.describe('isolated real-browser support lifecycle', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Only run with disposable db_test and a loopback browser host',
  );

  test('buyer creates ticket; admin assigns, replies, notes, closes, reopens; reports reconcile', async ({
    browser,
  }: {browser: Browser}) => {
    test.setTimeout(180_000);
    const fixture = isolatedFixture();
    const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
    const adminContext = await browser.newContext({baseURL, viewport: {width: 1365, height: 900}});
    const buyerContext = await browser.newContext({baseURL, viewport: {width: 390, height: 844}});
    try {
      const admin = await adminContext.newPage();
      const buyer = await buyerContext.newPage();
      await login(admin, fixture.admin);
      const before = await reportSnapshot(admin);
      expect(before.newConversations.datasets[0].total).toBeGreaterThanOrEqual(0);

      await login(buyer, fixture.buyer);
      await buyer.goto('/hc/tickets/new');
      const subject = 'Browser support lifecycle ' + Date.now();
      const reply = 'Public response to ' + subject;
      const note = 'Internal review only for ' + subject;

      await buyer.getByRole('textbox', {name: /subject/i}).fill(subject);
      await buyer.locator('.tiptap[contenteditable="true"]').fill('I need help with this order.');
      const createdPromise = matchResponse(buyer, '/api/v1/helpdesk/customer/tickets', 'POST');
      await buyer.locator('form button[type="submit"]').last().click();
      const created = await createdPromise;
      const createdBody = await created.json() as {conversation?: {id: number}};
      const ticketId = createdBody.conversation?.id;
      expect(ticketId, 'Browser form did not produce a ticket ID').toBeGreaterThan(0);
      const agentTicketApi = '/api/v1/helpdesk/agent/conversations/' + ticketId;
      await buyer.goto('/hc/tickets/' + ticketId);
      await expect(buyer.getByRole('heading', {name: subject})).toBeVisible();

      await admin.goto('/agent/conversations/' + ticketId);
      await expect(admin.getByText(subject).first()).toBeVisible({timeout: 30_000});
      const detail = admin.locator('div.flex.overflow-hidden').filter({
        has: admin.getByText('Assignee', {exact: true}),
      }).first();
      await detail.getByRole('button').click();
      const transfer = admin.getByRole('dialog', {name: /transfer conversation/i});
      await expect(transfer).toBeVisible();
      await transfer.getByText('E2E HC Admin', {exact: true}).click();
      const assignedPromise = matchResponse(admin, '/api/v1/helpdesk/agent/conversations/assignee/change', 'POST');
      await transfer.getByRole('button', {name: 'Transfer', exact: true}).click();
      await assignedPromise;
      await expect(admin.getByText('E2E HC Admin').first()).toBeVisible();

      // Submit a real public reply using the Tiptap editor and action button.
      await admin.locator('.tiptap[contenteditable="true"]').last().fill(reply);
      const publicReplyPromise = matchResponse(admin, agentTicketApi + '/messages', 'POST');
      await admin.getByRole('button', {name: 'Send reply'}).click();
      const publicReplyResponse = await publicReplyPromise;
      expect((await publicReplyResponse.json()).message.type).toBe('message');

      await admin.goto('/agent/conversations/' + ticketId);
      await expect(admin.getByText(reply).first()).toBeVisible({timeout: 30_000});
      await admin.getByRole('button', {name: 'Message', exact: true}).click();
      await admin.getByText('Note', {exact: true}).last().click();
      await admin.locator('.tiptap[contenteditable="true"]').last().fill(note);
      const privateNotePromise = matchResponse(admin, agentTicketApi + '/messages', 'POST');
      await admin.getByRole('button', {name: 'Add note'}).click();
      const privateNoteResponse = await privateNotePromise;
      expect((await privateNoteResponse.json()).message.type).toBe('note');
      await expect(admin.getByText(note).first()).toBeVisible({timeout: 30_000});

      await buyer.reload();
      await expect(buyer.getByText(reply).first()).toBeVisible({timeout: 30_000});
      await expect(buyer.getByText(note)).toHaveCount(0);

      let statusPromise = matchResponse(admin, '/api/v1/helpdesk/agent/conversations/status/change', 'POST');
      await selectTicketStatus(admin, 'Resolved');
      await statusPromise;
      await expect.poll(async () => {
        const r = await admin.request.get(agentTicketApi, {
          headers: {Referer: admin.url(), Accept: 'application/json'},
        });
        return ((await r.json()) as {conversation: {status_category: number}}).conversation.status_category;
      }, {timeout: 20_000}).toBe(4);
      await admin.reload();

      statusPromise = matchResponse(admin, '/api/v1/helpdesk/agent/conversations/status/change', 'POST');
      await selectTicketStatus(admin, 'Open');
      await statusPromise;
      await expect.poll(async () => {
        const r = await admin.request.get(agentTicketApi, {
          headers: {Referer: admin.url(), Accept: 'application/json'},
        });
        return ((await r.json()) as {conversation: {status_category: number}}).conversation.status_category;
      }, {timeout: 20_000}).toBe(6);

      const after = await reportSnapshot(admin);
      expect(
        after.newConversations.datasets[0].total,
        'Ticket report must include the newly created browser ticket',
      ).toBe(before.newConversations.datasets[0].total + 1);
      expect(
        after.agents.datasets[0].totalAgentReplies,
        'Agent report must count public replies but not internal notes',
      ).toBe(before.agents.datasets[0].totalAgentReplies + 1);
    } finally {
      await Promise.allSettled([adminContext.close(), buyerContext.close()]);
    }
  });
});

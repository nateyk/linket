import {loadIsolatedHcFixture, loginToHc} from './help-center-isolated-helpers';
import {expect, test, type Browser, type Page} from '@playwright/test';

type Account = {email: string; password: string};
type Fixture = {database: string; admin: Account; buyer: Account};
type Report = {
  newConversations: {datasets: Array<{total: number}>};
  agents: {datasets: Array<{totalAgentReplies: number}>};
};

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
  try {
    return JSON.parse(body) as Report;
  } catch {
    throw new Error('Invalid support report JSON (HTTP ' + report.status() +
      '): ' + body.slice(0, 1400));
  }
}

async function selectTicketStatus(page: Page, label: 'Open' | 'Resolved'): Promise<void> {
  // The toolbar contains the status menu; the composer has a second status control.
  await page.getByRole('button', {name: /^(Open|Resolved)$/}).first().click();
  await page.getByText(label, {exact: true}).last().click();
}

type LifecycleTicket = {
  ticketId: number;
  subject: string;
  reply: string;
  note: string;
};

async function createBuyerTicket(buyer: Page): Promise<LifecycleTicket> {
  await buyer.goto('/hc/tickets/new');
  const subject = 'Browser support lifecycle ' + Date.now();
  const reply = 'Public response to ' + subject;
  const note = 'Internal review only for ' + subject;
  const subjectInput = buyer.locator('input[name="subject"]');
  try {
    await expect(subjectInput).toBeVisible({timeout: 12_000});
  } catch {
    const config = await buyer.request.get('/api/v1/helpdesk/customer-new-ticket-page-config', {
      headers: {Referer: buyer.url(), Accept: 'application/json'},
    });
    throw new Error('Ticket subject missing: page=' + buyer.url() +
      ' body=' + (await buyer.locator('body').innerText()).slice(0, 600) +
      ' config=' + config.status() + ':' + (await config.text()).slice(0, 800));
  }
  await subjectInput.fill(subject);
  await buyer.locator('.tiptap[contenteditable="true"]').fill('I need help with this order.');
  const createdPromise = matchResponse(buyer, '/api/v1/helpdesk/customer/tickets', 'POST');
  await buyer.locator('form button[type="submit"]').last().click();
  const created = await createdPromise;
  const body = await created.json() as {conversation?: {id: number}};
  const ticketId = body.conversation?.id;
  expect(ticketId, 'Browser form did not produce a ticket ID').toBeGreaterThan(0);
  await buyer.goto('/hc/tickets/' + ticketId);
  await expect(buyer.getByRole('heading', {name: subject})).toBeVisible();
  return {ticketId: ticketId!, subject, reply, note};
}

async function assignTicket(admin: Page, ticketId: number): Promise<void> {
  await admin.goto('/agent/conversations/' + ticketId);
  const detail = admin.locator('div.flex.overflow-hidden').filter({
    has: admin.getByText('Assignee', {exact: true}),
  }).first();
  await detail.getByRole('button').click();
  const transfer = admin.getByRole('dialog', {name: /transfer conversation/i});
  await expect(transfer).toBeVisible();
  try {
    await transfer.getByText(/^e2e-hc-agent-/).click({timeout: 8_000});
  } catch {
    const response = await admin.request.get('/api/v1/helpdesk/compact-agents', {
      headers: {Referer: admin.url(), Accept: 'application/json'},
    });
    throw new Error('Missing test agent: dialog=' +
      (await transfer.innerText()).slice(0, 700) + ' agents=' +
      response.status() + ':' + (await response.text()).slice(0, 700));
  }
  const response = matchResponse(admin, '/api/v1/helpdesk/agent/conversations/assignee/change', 'POST');
  await transfer.getByRole('button', {name: 'Transfer', exact: true}).click();
  await response;
  await expect(admin.getByText(/^e2e-hc-agent-/).first()).toBeVisible();
}

async function postAgentMessage(
  admin: Page,
  ticketId: number,
  body: string,
  type: 'message' | 'note',
): Promise<void> {
  await admin.locator('.tiptap[contenteditable="true"]').last().fill(body);
  const response = matchResponse(
    admin,
    '/api/v1/helpdesk/agent/conversations/' + ticketId + '/messages',
    'POST',
  );
  await admin.getByRole('button', {name: type === 'message' ? 'Send reply' : 'Add note'}).click();
  expect((await (await response).json()).message.type).toBe(type);
  await admin.goto('/agent/conversations/' + ticketId);
}

async function submitPublicReply(admin: Page, ticketId: number, reply: string): Promise<void> {
  await admin.getByRole('button', {name: 'Resolved', exact: true}).last().click();
  await admin.getByText('Open', {exact: true}).last().click();
  await postAgentMessage(admin, ticketId, reply, 'message');
  await expect(admin.getByText(reply).first()).toBeVisible({timeout: 30_000});
}

async function submitPrivateNote(admin: Page, ticketId: number, note: string): Promise<void> {
  await admin.getByRole('button', {name: 'Message', exact: true}).click();
  await admin.getByText('Note', {exact: true}).last().click();
  await postAgentMessage(admin, ticketId, note, 'note');
  await expect(admin.locator('#feed-container').getByText(note))
    .toBeVisible({timeout: 15_000});
}

async function verifyBuyerMessagePrivacy(buyer: Page, reply: string, note: string): Promise<void> {
  await buyer.reload();
  await expect(buyer.getByText(reply).first()).toBeVisible({timeout: 30_000});
  await expect(buyer.getByText(note)).toHaveCount(0);
}

async function changeAndCheckStatus(
  admin: Page,
  ticketId: number,
  label: 'Open' | 'Resolved',
  expectedCategory: number,
): Promise<void> {
  const response = matchResponse(admin, '/api/v1/helpdesk/agent/conversations/status/change', 'POST');
  await selectTicketStatus(admin, label);
  await response;
  await expect.poll(async () => {
    const data = await admin.request.get('/api/v1/helpdesk/agent/conversations/' + ticketId, {
      headers: {Referer: admin.url(), Accept: 'application/json'},
    });
    return ((await data.json()) as {conversation: {status_category: number}})
      .conversation.status_category;
  }, {timeout: 20_000}).toBe(expectedCategory);
}

function verifyReportDelta(before: Report, after: Report): void {
  expect(
    after.newConversations.datasets[0].total,
    'Ticket report must include the newly created browser ticket',
  ).toBe(before.newConversations.datasets[0].total + 1);
  expect(
    after.agents.datasets[0].totalAgentReplies,
    'Agent report must count public replies but not internal notes',
  ).toBe(before.agents.datasets[0].totalAgentReplies + 1);
}

test.describe('isolated real-browser support lifecycle', () => {
  test.use({actionTimeout: 15_000, navigationTimeout: 30_000});
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Only run with disposable db_test and a loopback browser host',
  );

  test('buyer creates ticket; admin assigns, replies, notes, closes, reopens; reports reconcile', async ({
    browser,
  }: {browser: Browser}) => {
    test.setTimeout(180_000);
    const fixture = loadIsolatedHcFixture<Fixture>();
    const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
    const adminContext = await browser.newContext({baseURL, viewport: {width: 1365, height: 900}});
    const buyerContext = await browser.newContext({baseURL, viewport: {width: 390, height: 844}});
    try {
      const admin = await adminContext.newPage();
      const buyer = await buyerContext.newPage();
      await loginToHc(admin, fixture.admin);
      const before = await reportSnapshot(admin);
      await loginToHc(buyer, fixture.buyer);
      const ticket = await createBuyerTicket(buyer);
      await assignTicket(admin, ticket.ticketId);
      await submitPublicReply(admin, ticket.ticketId, ticket.reply);
      await submitPrivateNote(admin, ticket.ticketId, ticket.note);
      await verifyBuyerMessagePrivacy(buyer, ticket.reply, ticket.note);
      await changeAndCheckStatus(admin, ticket.ticketId, 'Resolved', 4);
      await admin.reload();
      await changeAndCheckStatus(admin, ticket.ticketId, 'Open', 6);
      verifyReportDelta(before, await reportSnapshot(admin));
    } finally {
      await Promise.allSettled([adminContext.close(), buyerContext.close()]);
    }
  });
});

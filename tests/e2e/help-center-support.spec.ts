import {loadIsolatedHcFixture, loginToHc} from './help-center-isolated-helpers';
import {expect, test} from '@playwright/test';

type HcFixture = {
  database: string;
  admin: {email: string; password: string};
  free_creator: {email: string; password: string};
  pro_creator: {email: string; password: string};
  buyer: {email: string; password: string};
  published_article: {id: number; title: string; slug: string; url: string};
  draft_article: {id: number; title: string; slug: string; url: string};
  ticket: {id: number; subject: string; customer_url: string; agent_url: string};
  routes: {
    help_landing: string;
    help_search: string;
    new_ticket: string;
    admin_hc_settings: string;
    agent_hc_arrange: string;
    agent_inbox: string;
  };
};

const loadFixture = () => loadIsolatedHcFixture<HcFixture>();

test.describe('isolated Help Center + support', () => {
  test.skip(
    process.env.LINKET_ISOLATED_E2E !== '1',
    'Requires LINKET_ISOLATED_E2E=1 against disposable db_test',
  );

  test.use({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  test('public HC: landing, published article, search; draft blocked; mobile 390px', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const fixture = loadFixture();

    await page.setViewportSize({width: 390, height: 844});
    await page.goto(fixture.routes.help_landing);
    await expect(
      page.getByRole('heading', {name: /how can we help/i}),
    ).toBeVisible({timeout: 30000});
    await expect(
      page.getByText(fixture.published_article.title).first(),
    ).toBeVisible({timeout: 30000});
    await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await page.goto(fixture.published_article.url);
    await expect(
      page.getByRole('heading', {name: fixture.published_article.title}).first(),
    ).toBeVisible({timeout: 30000});
    await expect(page.locator('main, article, .prose').first()).toContainText(
      /Welcome|Browse help|Open a ticket|published article/i,
      {timeout: 15000},
    );

    await page.goto(fixture.draft_article.url);
    await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);
    await expect(
      page.getByText(/This draft must stay unpublished/i),
    ).toHaveCount(0);

    await page.goto(fixture.routes.help_search);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  for (const persona of ['free_creator', 'pro_creator', 'buyer'] as const) {
    test(`${persona} can browse published HC and open ticket portal`, async ({page}) => {
      test.setTimeout(120_000);
      const fixture = loadFixture();
      const creds = fixture[persona];

      await page.setViewportSize({width: 1280, height: 900});
      await loginToHc(page, creds);

      await page.goto(fixture.routes.help_landing);
      await expect(page.getByText(fixture.published_article.title).first()).toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByText(fixture.draft_article.title)).toHaveCount(0);

      await page.goto(fixture.published_article.url);
      await expect(
        page
          .getByRole('heading', {name: fixture.published_article.title})
          .or(page.getByText(fixture.published_article.title))
          .first(),
      ).toBeVisible({timeout: 30000});

      await page.goto(fixture.routes.new_ticket);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page
          .getByRole('listitem')
          .filter({hasText: /new ticket/i})
          .or(page.getByRole('heading', {name: /new ticket/i}))
          .or(page.getByLabel(/subject/i))
          .or(page.getByText(/subject/i))
          .first(),
      ).toBeVisible({timeout: 30000});
    });
  }

  test('buyer ticket: sees public reply, not staff note; admin can open inbox ticket', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const fixture = loadFixture();

    await loginToHc(page, fixture.buyer);
    await page.goto(fixture.ticket.customer_url);
    await expect(page.getByText(fixture.ticket.subject).first()).toBeVisible({timeout: 30000});
    await expect(page.getByText(/reviewing your request/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText(/Private staff note/i)).toHaveCount(0);

    await page.goto('/logout').catch(() => undefined);
    await page.context().clearCookies();

    await loginToHc(page, fixture.admin);
    await page.goto(fixture.ticket.agent_url);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page
        .getByText(fixture.ticket.subject)
        .or(page.getByText(/reviewing your request|staff note|E2E HC/i))
        .first(),
    ).toBeVisible({timeout: 30000});
  });

  test('admin HC settings + arrange manager reachable', async ({page}) => {
    test.setTimeout(120_000);
    const fixture = loadFixture();

    await loginToHc(page, fixture.admin);

    await page.goto(fixture.routes.admin_hc_settings);
    await expect(
      page.getByRole('heading', {name: /help center/i}).first(),
    ).toBeVisible({timeout: 30000});

    await page.goto('/admin/help');
    await expect(page).toHaveURL(/\/admin\/help\/arrange/);
    await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();
    await expect(
      page.locator('[data-slot="sidebar"]').getByRole('link', {name: 'Help center'}),
    ).toHaveAttribute('href', '/admin/help');
    await page.getByRole('tab', {name: 'All articles'}).click();
    await expect(page).toHaveURL(/\/admin\/help\/articles/);
    await page.getByRole('tab', {name: 'Structure'}).click();
    await expect(page).toHaveURL(/\/admin\/help\/arrange/);

    await page.setViewportSize({width: 390, height: 844});
    await expect(page.locator('[data-slot="dashboard-section"]')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .filter(element => {
          const rect = element.getBoundingClientRect();
          const css = getComputedStyle(element);
          return rect.width > 0 && rect.right > innerWidth + 1 &&
            css.display !== 'none' && css.visibility !== 'hidden';
        })
        .slice(0, 15)
        .map(element => ({
          tag: element.tagName,
          slot: element.getAttribute('data-slot'),
          className: typeof element.className === 'string' ? element.className.slice(0, 140) : '',
          width: Math.round(element.getBoundingClientRect().width),
          right: Math.round(element.getBoundingClientRect().right),
        })),
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow))
      .toBeLessThanOrEqual(390);

    // Admin bookmarks are normalized to the shared admin shell, while
    // non-admin agents can still use the legacy Help Center route.
    await page.goto(fixture.routes.agent_hc_arrange);
    await expect(page).toHaveURL(/\/admin\/help\/arrange/);
    await expect(
      page
        .getByText(/E2E Getting Started|categories|articles|arrange/i)
        .first(),
    ).toBeVisible({timeout: 30000});

    // Administrators can discover and open support workflows directly from
    // the native admin sidebar, then return from the dedicated agent inbox.
    // The admin sidebar is an off-canvas drawer at mobile width. Assert its
    // discoverable link on desktop before checking the support hub on mobile.
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/admin/support');
    await expect(page.getByText('Inbox and conversations')).toBeVisible();
    const allConversations = page.getByRole('link', {name: /All conversations/});
    await expect(allConversations).toHaveAttribute(
      'href',
      '/agent/conversations?viewId=all',
    );
    await expect(
      page.locator('[data-slot="sidebar"]').getByRole('link', {name: 'Support'}),
    ).toHaveAttribute('href', '/admin/support');
    await page.setViewportSize({width: 390, height: 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(390);
    await page.setViewportSize({width: 1280, height: 900});

    await allConversations.click();
    await expect(page).toHaveURL(/\/agent\/conversations/);
    const sharedSidebar = page.locator('[data-slot="sidebar"]');
    await expect(sharedSidebar.getByRole('link', {name: 'Insights'})).toBeVisible();
    await expect(sharedSidebar.getByRole('link', {name: 'Support', exact: true}))
      .toHaveAttribute('aria-current', 'page');
    await expect(page.locator('[data-menu-id="agent-dashboard-sidebar"]'))
      .toHaveCount(0);

    // The standard admin navigation must remain reachable on mobile, too.
    await page.setViewportSize({width: 390, height: 844});
    const mobileSidebar = page.getByRole('navigation', {name: 'Main navigation'});
    if (!(await mobileSidebar.isVisible())) {
      await page.locator('[data-slot="sidebar-toggle-button"]').first().click();
    }
    await expect(mobileSidebar.getByRole('link', {name: 'Support', exact: true}))
      .toBeVisible();
    await mobileSidebar.getByRole('link', {name: 'Support', exact: true}).click();
    await expect(page).toHaveURL('/admin/support');
  });
});

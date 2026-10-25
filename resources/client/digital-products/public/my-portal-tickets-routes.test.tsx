import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('my portal tickets', () => {
  test('mounts buyer tickets beside downloads and reuses the tickets portal', () => {
    const router = fs.readFileSync(
      path.resolve('resources/client/app-router.tsx'),
      'utf8',
    );
    const sidebar = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/my-portal-sidebar.tsx',
      ),
      'utf8',
    );
    const layout = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/portal-tickets-layout.tsx',
      ),
      'utf8',
    );
    const table = fs.readFileSync(
      path.resolve(
        'resources/client/help-center/tickets-portal/ticklets-table/tickets-table-page.tsx',
      ),
      'utf8',
    );
    const ticket = fs.readFileSync(
      path.resolve(
        'resources/client/help-center/tickets-portal/ticket-page/ticket-page.tsx',
      ),
      'utf8',
    );
    const form = fs.readFileSync(
      path.resolve(
        'resources/client/help-center/tickets-portal/new-ticket-page/form/ticket-form.tsx',
      ),
      'utf8',
    );
    const create = fs.readFileSync(
      path.resolve(
        'resources/client/help-center/tickets-portal/new-ticket-page/new-ticket-page.tsx',
      ),
      'utf8',
    );

    expect(router).toContain("path: 'my-portal/tickets'");
    expect(router).toContain('portal-tickets-layout');
    expect(router).toContain('customerTicketsIndexLoader');
    expect(router).toContain('customerNewTicketLoader');
    expect(router).toContain('customerTicketShowLoader');
    expect(router).toContain("path: 'new'");
    expect(router).toContain("path: ':conversationId'");

    expect(sidebar).toContain('to="/my-portal/tickets"');
    expect(sidebar).toContain("label: 'Downloads'");
    expect(sidebar).toContain("label: 'Audio library'");
    const afterDownloads = sidebar.slice(
      sidebar.indexOf("item.section === 'downloads'"),
    );
    expect(afterDownloads.startsWith("item.section === 'downloads'")).toBe(
      true,
    );
    expect(afterDownloads).toContain('<Trans message="Tickets" />');

    expect(layout).toContain('PortalLibraryLayout');
    expect(layout).toContain('PortalSidebar');
    expect(layout).toContain('/my-portal?section=');
    expect(layout).not.toContain('@app/account-settings');

    for (const source of [table, ticket, form, create]) {
      expect(source).toContain('useTicketsPortalPaths');
      expect(source).not.toContain("'/hc/tickets'");
      expect(source).not.toContain('`/hc/tickets');
    }
  });
});

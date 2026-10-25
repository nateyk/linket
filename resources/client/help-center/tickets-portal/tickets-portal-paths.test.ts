import {describe, expect, test} from 'vitest';
import {ticketsPortalPaths} from './tickets-portal-paths';

describe('ticketsPortalPaths', () => {
  test('keeps help center tickets on /hc', () => {
    const paths = ticketsPortalPaths('/hc/tickets/42');

    expect(paths.surface).toBe('help-center');
    expect(paths.home).toBe('/hc');
    expect(paths.list).toBe('/hc/tickets');
    expect(paths.newTicket).toBe('/hc/tickets/new');
    expect(paths.ticket(42)).toBe('/hc/tickets/42');
  });

  test('keeps the help alias on the help center ticket urls', () => {
    const paths = ticketsPortalPaths('/help/tickets/new');

    expect(paths.surface).toBe('help-center');
    expect(paths.list).toBe('/hc/tickets');
    expect(paths.ticket('9')).toBe('/hc/tickets/9');
  });

  test('points buyer portal tickets at /my-portal/tickets', () => {
    const paths = ticketsPortalPaths('/my-portal/tickets');

    expect(paths.surface).toBe('portal');
    expect(paths.home).toBe('/my-portal');
    expect(paths.list).toBe('/my-portal/tickets');
    expect(paths.newTicket).toBe('/my-portal/tickets/new');
    expect(paths.ticket(7)).toBe('/my-portal/tickets/7');
  });
});

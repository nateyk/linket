import {useLocation} from 'react-router';

export type TicketsPortalSurface = 'help-center' | 'portal';

export type TicketsPortalPaths = {
  surface: TicketsPortalSurface;
  home: string;
  list: string;
  newTicket: string;
  ticket: (id: string | number) => string;
};

/** Canonical ticket URLs for the help center and the buyer portal. */
export function ticketsPortalPaths(pathname: string): TicketsPortalPaths {
  const surface: TicketsPortalSurface = pathname.startsWith('/my-portal')
    ? 'portal'
    : 'help-center';
  const list = surface === 'portal' ? '/my-portal/tickets' : '/hc/tickets';

  return {
    surface,
    home: surface === 'portal' ? '/my-portal' : '/hc',
    list,
    newTicket: `${list}/new`,
    ticket: id => `${list}/${id}`,
  };
}

export function useTicketsPortalPaths(): TicketsPortalPaths {
  const {pathname} = useLocation();
  return ticketsPortalPaths(pathname);
}

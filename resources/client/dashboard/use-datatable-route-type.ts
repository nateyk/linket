import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {useMatches} from 'react-router';

export type DatatableRouteType = 'dashboard' | 'admin';

type Response = {
  routeType: DatatableRouteType;
  isForCurrentUser: boolean;
};

export function useDatatableRouteType(): Response {
  const matches = useMatches();
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);

  const routeType = matches.some(
    match => (match.handle as any)?.belinkRoutesType === 'dashboard',
  )
    ? 'dashboard'
    : 'admin';

  return {
    routeType,
    isForCurrentUser:
      routeType === 'dashboard'
        ? !activeWorkspace || activeWorkspace.is_personal
        : false,
  };
}

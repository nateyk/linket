import {useLocation} from 'react-router';

/**
 * Admin Help Center lives under the shared admin shell. The agent routes stay
 * available for staff members without admin.access.
 */
export function getHcManagerBasePath(pathname: string): '/admin/help' | '/agent/hc' {
  return pathname === '/admin/help' || pathname.startsWith('/admin/help/')
    ? '/admin/help'
    : '/agent/hc';
}

export function useHcManagerBasePath() {
  const {pathname} = useLocation();
  return getHcManagerBasePath(pathname);
}

import {hcPublicRouteChildren} from '@app/help-center/homepage/hc-public-routes';
import {RouteObject} from 'react-router';

export const helpCenterRoutes: RouteObject[] = [
  {
    path: 'hc',
    lazy: () => import('@app/help-center/homepage/hc-public-shell'),
    children: hcPublicRouteChildren,
  },
  {
    path: 'help',
    lazy: () => import('@app/help-center/homepage/hc-public-shell'),
    children: hcPublicRouteChildren,
  },
];

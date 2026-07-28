import {
  listSettingsOptions,
  loadMenuEditorConfigOptions,
  loadSeoTagsOptions,
} from '@common/admin/settings/settings-queries';
import {listLocalizationsOptions} from '@common/admin/translations/localizations-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {valueListsQueryOptions} from '@common/http/value-lists';
import {redirect, RouteObject} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

interface Overrides {
  general?: Partial<RouteObject>;
  captcha?: Partial<RouteObject>;
  system?: Partial<RouteObject>;
  uploading?: Partial<RouteObject>;
}

export const commonAdminSettingsRoutes = (
  appRoutes: RouteObject[],
  overrides?: Overrides,
): RouteObject => {
  return {
    path: 'settings',
    loader: () => {
      const redirect = authGuard({permission: 'settings.update'});
      if (redirect) return redirect;
      return queryClient.ensureQueryData(listSettingsOptions());
    },
    lazy: () => import('@common/admin/settings/admin-settings-page'),
    children: [
      {
        index: true,
        loader: () => redirect('general'),
        element: <Fragment />,
      },
      ...appRoutes,
      {
        path: 'general',
        lazy: () => import('@common/admin/settings/pages/general-settings'),
        ...overrides?.general,
      },
      {
        path: 'captcha',
        lazy: () =>
          import('@common/admin/settings/pages/base-captcha-settings'),
        ...overrides?.captcha,
      },
      {
        path: 'themes',
        lazy: () =>
          import('@common/admin/settings/pages/themes-settings/themes-settings-page'),
      },
      {
        path: 'menus',
        lazy: () =>
          import('@common/admin/settings/pages/menu-settings/menu-settings'),
        loader: () =>
          queryClient.ensureQueryData(loadMenuEditorConfigOptions()),
      },
      {
        path: 'subscriptions',
        lazy: () =>
          import('@common/admin/settings/pages/subscription-settings'),
      },
      {
        path: 'localization',
        lazy: () =>
          import('@common/admin/settings/pages/localization-settings'),
        loader: async () =>
          queryClient.ensureQueryData(listLocalizationsOptions()),
      },
      {
        path: 'authentication',
        lazy: () =>
          import('@common/admin/settings/pages/authentication-settings'),
      },
      {
        path: 'uploading',
        lazy: () =>
          import('@common/admin/settings/pages/uploading-settings/uploading-settings'),
        ...overrides?.uploading,
      },
      {
        path: 'email',
        loader: () => redirect('/admin/settings/email/outgoing'),
        element: <Fragment />,
      },
      {
        path: 'email/outgoing',
        lazy: () =>
          import('@common/admin/settings/pages/email-settings/outgoing-email/outgoing-email-settings'),
      },
      {
        path: 'custom-code',
        lazy: () => import('@common/admin/settings/pages/custom-code-settings'),
      },
      {
        path: 'seo',
        lazy: () => import('@common/admin/settings/pages/seo-settings'),
        loader: () => queryClient.ensureQueryData(loadSeoTagsOptions()),
      },
      {
        path: 'system',
        lazy: () =>
          import('@common/admin/settings/pages/system-settings/system-settings'),
        ...overrides?.system,
      },
      {
        path: 'analytics',
        lazy: () =>
          import('@common/admin/settings/pages/google-analytics-settings'),
      },
      {
        path: 'gdpr',
        lazy: () => import('@common/admin/settings/pages/gdpr-settings'),
        loader: async () =>
          queryClient.ensureQueryData(
            valueListsQueryOptions(['menuItemCategories']),
          ),
      },
    ],
  };
};

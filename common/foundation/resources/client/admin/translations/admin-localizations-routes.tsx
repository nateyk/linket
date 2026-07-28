import {
  listLocalizationsOptions,
  retrieveLocalizationOptions,
} from '@common/admin/translations/localizations-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {RouteObject} from 'react-router';

export const adminLocalizationsRoutes: Record<string, RouteObject> = {
  index: {
    path: 'localizations',
    shouldRevalidate: () => false,
    lazy: () => import('@common/admin/translations/localization-index'),
    loader: () => {
      const redirect = authGuard({permission: 'localizations.update'});
      if (redirect) return redirect;
      return queryClient.ensureQueryData(listLocalizationsOptions());
    },
  },
  updateLines: {
    path: 'localizations/:localeId/translate',
    lazy: () =>
      import('@common/admin/translations/translation-management-page'),
    loader: ({params}) => {
      const redirect = authGuard({permission: 'localizations.update'});
      if (redirect) return redirect;
      return queryClient.ensureQueryData(
        retrieveLocalizationOptions(Number(params.localeId)),
      );
    },
  },
};

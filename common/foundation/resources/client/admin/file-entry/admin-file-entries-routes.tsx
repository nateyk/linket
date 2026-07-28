import {listFileEntriesOptions} from '@common/admin/file-entry/file-entries-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {RouteObject} from 'react-router';

export const adminFileEntriesRoutes: Record<string, RouteObject> = {
  index: {
    path: 'files',
    shouldRevalidate: () => false,
    lazy: () => import('@common/admin/file-entry/file-entries-datatable-page'),
    loader: ({request}) => {
      const redirect = authGuard({permission: 'files.update'});
      if (redirect) return redirect;
      return queryClient.ensureQueryData(
        listFileEntriesOptions(searchParamsFromUrl(request.url)),
      );
    },
  },
};

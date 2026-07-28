import {apiClient} from '@common/http/query-client';
import {queryOptions, useSuspenseQuery} from '@tanstack/react-query';
import {BootstrapData} from '@ui/bootstrap-data/bootstrap-data';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';

type LandingPageData = Required<
  Required<BootstrapData>['loaders']
>['landingPage'];

export function useLandingPageData() {
  return useSuspenseQuery(landingPageDataQueryOptions);
}

export const landingPageDataQueryOptions = queryOptions({
  staleTime: Infinity,
  queryKey: ['landingPage'],
  queryFn: () =>
    apiClient.get<LandingPageData>('/landing-page-data').then(r => r.data),
  initialData: () => {
    const data = getBootstrapData().loaders?.landingPage;
    if (data) {
      return data;
    }
  },
});

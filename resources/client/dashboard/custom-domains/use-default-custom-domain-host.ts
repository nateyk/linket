import {listDomainsOptions} from '@app/dashboard/custom-domains/domains-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {useQuery} from '@tanstack/react-query';
import {useSettings} from '@ui/settings/use-settings';
import {useMemo} from 'react';

export function useDefaultCustomDomainHost(): string {
  const {custom_domains, base_url} = useSettings();
  const {routeType} = useDatatableRouteType();
  const {data} = useQuery(listDomainsOptions(routeType));
  return useMemo(() => {
    const selectedHost = custom_domains?.default_host;
    if (selectedHost) {
      const host = data?.data?.find(d => d.host === selectedHost)?.host;
      if (host) return host;
    }
    return base_url.replace(/\/$/, '').replace(/(^\w+:|^)\/\//, '');
  }, [custom_domains, base_url, data]);
}

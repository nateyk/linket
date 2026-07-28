import {getLocalTimeZone} from '@internationalized/date';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import {useMemo} from 'react';

export function useUserTimezone(): string {
  const data = useBootstrapDataStore(s => s.data);
  const defaultTimezone = data?.settings.dates?.default_timezone;
  const preferredTimezone = data?.user?.timezone || defaultTimezone || 'auto';

  return useMemo(() => {
    return !preferredTimezone || preferredTimezone === 'auto'
      ? getLocalTimeZone()
      : preferredTimezone;
  }, [preferredTimezone]);
}

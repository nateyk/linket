import {getUsage} from '@app/gen/account';
import {useQuery} from '@tanstack/react-query';

export const usageBaseKey = ['usage'];

export const usageOptions = () => ({
  queryKey: usageBaseKey,
  queryFn: () => getUsage(),
});

export function useUsage() {
  return useQuery(usageOptions());
}

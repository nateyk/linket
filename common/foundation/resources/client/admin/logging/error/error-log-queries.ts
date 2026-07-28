import {deleteErrorLogFile, listErrorLogItems} from '@app/gen/logs';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam} from '@ui/utils/ts/extract-params';

export const baseErrorLogKey = ['error-log'];

export const listErrorLogItemsOptions = (
  params?: FirstParam<typeof listErrorLogItems>,
) => {
  return queryOptions({
    queryKey: [...baseErrorLogKey, params],
    queryFn: () => listErrorLogItems(params),
  });
};

export const deleteErrorLogFileOptions = () => {
  return mutationOptions({
    mutationFn: (identifier: string) => deleteErrorLogFile(identifier),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: baseErrorLogKey,
      });
    },
  });
};

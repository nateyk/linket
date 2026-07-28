import {listScheduleLogItems, rerunScheduleLog} from '@app/gen/logs';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam} from '@ui/utils/ts/extract-params';

export const baseScheduleKey = ['schedule-log'];

export const listScheduleLogItemsOptions = (
  params?: FirstParam<typeof listScheduleLogItems>,
) => {
  return queryOptions({
    queryKey: [...baseScheduleKey, params],
    queryFn: () => listScheduleLogItems(params),
  });
};

export const rerunScheduleLogOptions = (id: number) => {
  return mutationOptions({
    mutationFn: () => rerunScheduleLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: baseScheduleKey,
      });
    },
  });
};

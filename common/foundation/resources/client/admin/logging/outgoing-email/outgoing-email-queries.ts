import {
  listOutgoingEmailLogItems,
  retrieveOutgoingEmailLogItem,
} from '@app/gen/logs';
import {queryOptions} from '@tanstack/react-query';
import {FirstParam} from '@ui/utils/ts/extract-params';

export const baseOutgoingEmailKey = ['outgoing-email-log'];

export const listOutgoingEmailLogItemsOptions = (
  params?: FirstParam<typeof listOutgoingEmailLogItems>,
) => {
  return queryOptions({
    queryKey: [...baseOutgoingEmailKey, params],
    queryFn: () => listOutgoingEmailLogItems(params),
  });
};

export const retrieveOutgoingEmailLogItemOptions = (id: number) => {
  return queryOptions({
    queryKey: [...baseOutgoingEmailKey, `${id}`],
    queryFn: () => retrieveOutgoingEmailLogItem(id),
  });
};

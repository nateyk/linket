import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {Key} from 'react';
import {BackendResponse} from '../../http/backend-response/backend-response';
import {showHttpErrorToast} from '../../http/errors/show-http-error-toast';
import {apiClient, queryClient} from '../../http/query-client';
import {useDataTable} from '../page/data-table-context';
import {DatatableDataQueryKey} from './paginated-resources';

interface Response extends BackendResponse {
  //
}

export function useDeleteSelectedRows() {
  const {endpoint, selectedRows, setSelectedRows, baseQueryKey} =
    useDataTable();
  return useMutation({
    mutationFn: () => deleteSelectedRows(endpoint, selectedRows),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: DatatableDataQueryKey(endpoint, undefined, baseQueryKey),
      });
      toast(
        message('Deleted [one 1 record|other :count records]', {
          values: {count: selectedRows.length},
        }),
      );
      setSelectedRows([]);
    },
    onError: err =>
      showHttpErrorToast(err, <Trans message="Could not delete records" />),
  });
}

function deleteSelectedRows(endpoint: string, ids: Key[]): Promise<Response> {
  return apiClient.delete(`${endpoint}/${ids.join(',')}`).then(r => r.data);
}

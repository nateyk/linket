import {useMutation} from '@tanstack/react-query';
import {BackendResponse} from '../../http/backend-response/backend-response';
import {showHttpErrorToast} from '../../http/errors/show-http-error-toast';
import {apiClient} from '../../http/query-client';

interface Response extends BackendResponse {}

interface Payload {
  entryIds?: number[];
  deleteForever?: boolean;
  paths?: string[];
}

function deleteFileEntries(payload: Payload): Promise<Response> {
  return apiClient.post('file-entries/delete', payload).then(r => r.data);
}

export function useDeleteFileEntries() {
  return useMutation({
    mutationFn: (props: Payload) => deleteFileEntries(props),
    onError: err => showHttpErrorToast(err),
  });
}

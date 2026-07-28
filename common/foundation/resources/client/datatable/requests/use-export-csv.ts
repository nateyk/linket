import {useMutation} from '@tanstack/react-query';
import {BackendResponse} from '../../http/backend-response/backend-response';
import {showHttpErrorToast} from '../../http/errors/show-http-error-toast';
import {apiClient} from '../../http/query-client';

interface Response extends BackendResponse {
  downloadPath?: string;
  result?: 'jobQueued';
}

export type ExportCsvPayload = Record<string, string | number | undefined>;

export function useExportCsv(endpoint: string) {
  return useMutation({
    mutationFn: (payload?: ExportCsvPayload) => exportCsv(endpoint, payload),
    onError: err => showHttpErrorToast(err),
  });
}

function exportCsv(
  endpoint: string,
  payload: ExportCsvPayload | undefined,
): Promise<Response> {
  return apiClient.post(endpoint, payload).then(r => r.data);
}

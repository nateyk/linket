import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {Reportable} from '@common/reports/Reportable';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';

interface Response extends BackendResponse {}

export function useDeleteReport(model: Reportable) {
  return useMutation({
    mutationFn: () => deleteReport(model),
    onSuccess: () => {
      toast(message('Report removed'));
    },
    onError: err => showHttpErrorToast(err),
  });
}

function deleteReport(reportable: Reportable) {
  return apiClient
    .delete<Response>(`report/${reportable.model_type}/${reportable.id}`)
    .then(r => r.data);
}

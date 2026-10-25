import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';

interface Payload {
  conversationId: number | string;
}

export function useDeleteConversationSummary() {
  return useMutation({
    mutationFn: ({conversationId}: Payload) =>
      apiClient
        .delete(`helpdesk/conversations/${conversationId}/summary`)
        .then(r => r.data),
    onError: err => showHttpErrorToast(err),
  });
}

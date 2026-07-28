import {useLogout} from '@common/auth/requests/use-logout';
import {useAuth} from '@common/auth/use-auth';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {useMutation} from '@tanstack/react-query';
import {toast} from '@ui/toast/toast';

interface Response extends BackendResponse {}

export function useDeleteAccount() {
  const {user} = useAuth();
  const logout = useLogout();
  return useMutation({
    mutationFn: () => deleteAccount(user!.id),
    onSuccess: () => {
      toast('Account deleted');
      logout.mutate();
    },
    onError: err => showHttpErrorToast(err),
  });
}

function deleteAccount(userId: number): Promise<Response> {
  return apiClient
    .delete(`users/${userId}`, {params: {deleteCurrentUser: true}})
    .then(r => r.data);
}

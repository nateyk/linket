import {apiClient} from '@common/http/query-client';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettingsPreviewMode} from '../../admin/settings/preview/use-settings-preview-mode';
import {showHttpErrorToast} from '../../http/errors/show-http-error-toast';

const appearanceMessage = (
  <Trans message="Can't logout while in appearance editor." />
);

export function useLogout() {
  const {isInsideSettingsPreview: isAppearanceEditorActive} =
    useSettingsPreviewMode();
  return useMutation({
    mutationFn: () => (isAppearanceEditorActive ? noopLogout() : logout()),
    onSuccess: () => {
      // reload the page to clear query data and reset cookies
      window.location.href = '/login';
    },
    onError: err =>
      showHttpErrorToast(
        err,
        isAppearanceEditorActive ? appearanceMessage : undefined,
      ),
  });
}

function logout() {
  return apiClient
    .post<{bootstrapData: string}>('/auth/logout')
    .then(response => response.data);
}

function noopLogout() {
  return Promise.reject(appearanceMessage.props.message);
}

import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {UploadedFile} from '@ui/utils/files/uploaded-file';

interface Payload {
  file: UploadedFile;
}

export function useImportHcDataFromZip() {
  const {trans} = useTrans();
  return useMutation({
    mutationFn: (payload: Payload) => importData(payload),
    onSuccess: () => {
      toast(trans(message('Help center data imported')));
    },
    onError: err => showHttpErrorToast(err),
  });
}

function importData(payload: Payload): Promise<Response> {
  const formData = new FormData();
  formData.append('file', payload.file.native);
  return apiClient.post('hc/actions/import', formData).then(r => r.data);
}

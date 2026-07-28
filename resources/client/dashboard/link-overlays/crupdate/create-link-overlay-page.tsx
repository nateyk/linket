import {CrupdateLinkOverlayForm} from '@app/dashboard/link-overlays/crupdate/crupdate-link-overlay-form';
import {createLinkOverlayOptions} from '@app/dashboard/link-overlays/link-overlays-queries';
import {CrupdateLinkOverlayBody} from '@app/gen/schemas/crupdate-link-overlay-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {useForm} from 'react-hook-form';

export function Component() {
  const {trans} = useTrans();
  const navigate = useNavigate();
  const form = useForm<CrupdateLinkOverlayBody>({
    defaultValues: {
      position: 'bottom-left',
      theme: 'default',
      label: trans(message('Label')),
      message: trans(message('Your message here')),
      btn_text: trans(message('Button text')),
      btn_link: 'https://google.com',
      colors: {
        'bg-color': 'rgb(61, 75, 101)',
        'text-color': 'rgb(255, 255, 255)',
        'label-bg-color': 'rgb(255, 255, 255)',
        'label-color': 'rgb(0, 0, 0)',
      },
    },
  });
  const createOverlay = useMutation(createLinkOverlayOptions());

  const handleCreate = (values: CrupdateLinkOverlayBody) => {
    createOverlay.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Overlay created')));
        navigate('..', {relative: 'path'});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <CrupdateLinkOverlayForm
      form={form}
      onSubmit={handleCreate}
      isLoading={createOverlay.isPending}
    />
  );
}

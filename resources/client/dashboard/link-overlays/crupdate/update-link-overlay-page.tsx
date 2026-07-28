import {CrupdateLinkOverlayForm} from '@app/dashboard/link-overlays/crupdate/crupdate-link-overlay-form';
import {
  retrieveLinkOverlayOptions,
  updateLinkOverlayOptions,
} from '@app/dashboard/link-overlays/link-overlays-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkOverlayBody} from '@app/gen/schemas/crupdate-link-overlay-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {useForm} from 'react-hook-form';

export function Component() {
  const {trans} = useTrans();
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  const {overlayId} = useRequiredParams(['overlayId']);
  const query = useSuspenseQuery(retrieveLinkOverlayOptions(Number(overlayId)));
  const linkOverlay = query.data.data;

  const form = useForm<CrupdateLinkOverlayBody>({
    defaultValues: {
      name: linkOverlay.name,
      position: linkOverlay.position,
      theme: linkOverlay.theme,
      label: linkOverlay.label,
      message: linkOverlay.message,
      btn_text: linkOverlay.btn_text,
      btn_link: linkOverlay.btn_link,
      colors: linkOverlay.colors,
    },
  });
  const updateOverlay = useMutation(
    updateLinkOverlayOptions(Number(overlayId)),
  );

  const handleUpdate = (values: CrupdateLinkOverlayBody) => {
    updateOverlay.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Overlay updated')));
        navigate(`/${routeType}/link-overlays`);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <CrupdateLinkOverlayForm
      form={form}
      isLoading={updateOverlay.isPending}
      onSubmit={handleUpdate}
    />
  );
}

import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveLinkOverlays,
  createLinkOverlay,
  deleteLinkOverlays,
  listLinkOverlays,
  retrieveLinkOverlay,
  unarchiveLinkOverlays,
  updateLinkOverlay,
} from '@app/gen/link-overlays';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const linkOverlaysBaseKey = ['link-overlays'];

export const listLinkOverlaysOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listLinkOverlays>,
) => {
  const params = {...search};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...linkOverlaysBaseKey, params],
    queryFn: () => listLinkOverlays(params),
  });
};

export const retrieveLinkOverlayOptions = (
  id: FirstParam<typeof retrieveLinkOverlay>,
) => {
  return queryOptions({
    queryKey: [...linkOverlaysBaseKey, `${id}`],
    queryFn: () => retrieveLinkOverlay(id),
  });
};

export const createLinkOverlayOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createLinkOverlay>) =>
      createLinkOverlay(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkOverlaysBaseKey,
      });
    },
  });
};

export const updateLinkOverlayOptions = (
  id: FirstParam<typeof updateLinkOverlay>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateLinkOverlay>) =>
      updateLinkOverlay(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkOverlaysBaseKey,
      });
    },
  });
};

export const deleteLinkOverlaysOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      deleteLinkOverlays({linkOverlayIds: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkOverlaysBaseKey,
      });
    },
  });
};

export const archiveLinkOverlaysOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      archiveLinkOverlays({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkOverlaysBaseKey,
      });
    },
  });
};

export const unarchiveLinkOverlaysOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      unarchiveLinkOverlays({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkOverlaysBaseKey,
      });
    },
  });
};

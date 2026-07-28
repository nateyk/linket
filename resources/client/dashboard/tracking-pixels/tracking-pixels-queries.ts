import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveTrackingPixels,
  createTrackingPixel,
  deleteTrackingPixels,
  listTrackingPixels,
  retrieveTrackingPixel,
  unarchiveTrackingPixels,
  updateTrackingPixel,
} from '@app/gen/tracking-pixels';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const trackingPixelsBaseKey = ['tracking-pixels'];

export const listTrackingPixelsOptions = (
  routeType: DatatableRouteType,
  search: FirstParam<typeof listTrackingPixels>,
) => {
  const params = {...search};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...trackingPixelsBaseKey, params],
    queryFn: () => listTrackingPixels(params),
  });
};

export const retrieveTrackingPixelOptions = (
  id: FirstParam<typeof retrieveTrackingPixel>,
) => {
  return queryOptions({
    queryKey: [...trackingPixelsBaseKey, `${id}`],
    queryFn: () => retrieveTrackingPixel(id),
  });
};

export const createTrackingPixelOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createTrackingPixel>) =>
      createTrackingPixel(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trackingPixelsBaseKey,
      });
    },
  });
};

export const updateTrackingPixelOptions = (
  id: FirstParam<typeof updateTrackingPixel>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateTrackingPixel>) =>
      updateTrackingPixel(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trackingPixelsBaseKey,
      });
    },
  });
};

export const deleteTrackingPixelsOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      deleteTrackingPixels({trackingPixelIds: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trackingPixelsBaseKey,
      });
    },
  });
};

export const archiveTrackingPixelsOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      archiveTrackingPixels({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trackingPixelsBaseKey,
      });
    },
  });
};

export const unarchiveTrackingPixelsOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) =>
      unarchiveTrackingPixels({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trackingPixelsBaseKey,
      });
    },
  });
};

import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveLinkPages,
  createLinkPage,
  deleteLinkPages,
  listLinkPages,
  retrieveLinkPage,
  unarchiveLinkPages,
  updateLinkPage,
} from '@app/gen/link-pages';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const linkPagesBaseKey = ['link-pages'];

export const listLinkPagesOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listLinkPages>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...linkPagesBaseKey, params],
    queryFn: () => listLinkPages(params),
  });
};

export const retrieveLinkPageOptions = (
  id: FirstParam<typeof retrieveLinkPage>,
) => {
  return queryOptions({
    queryKey: [...linkPagesBaseKey, `${id}`],
    queryFn: () => retrieveLinkPage(id),
  });
};

export const createLinkPageOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createLinkPage>) =>
      createLinkPage(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkPagesBaseKey,
      });
    },
  });
};

export const updateLinkPageOptions = (
  id: FirstParam<typeof updateLinkPage>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateLinkPage>) =>
      updateLinkPage(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkPagesBaseKey,
      });
    },
  });
};

export const deleteLinkPagesOptions = () => {
  return mutationOptions({
    mutationFn: (ids: number[]) => deleteLinkPages({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkPagesBaseKey,
      });
    },
  });
};

export const archiveLinkPagesOptions = () => {
  return mutationOptions({
    mutationFn: (ids: number[]) => archiveLinkPages({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkPagesBaseKey,
      });
    },
  });
};

export const unarchiveLinkPagesOptions = () => {
  return mutationOptions({
    mutationFn: (ids: number[]) => unarchiveLinkPages({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkPagesBaseKey,
      });
    },
  });
};

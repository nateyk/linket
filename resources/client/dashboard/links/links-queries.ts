import {biolinksBaseKey} from '@app/dashboard/biolink/biolinks-queries';
import {foldersBaseKey} from '@app/dashboard/folders/folders-queries';
import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  batchUpdateLinks,
  createLink,
  createMultipleLinks,
  deleteLinks,
  exportLinksCsv,
  listLinks,
  retrieveLink,
  updateLink,
  validateLinkPassword,
} from '@app/gen/links';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const linksBaseKey = ['links'];

export const listLinksOptions = (
  routeType: DatatableRouteType,
  search: FirstParam<typeof listLinks>,
) => {
  const params = search ?? {};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...linksBaseKey, params],
    queryFn: () => listLinks(params),
  });
};

export const retrieveLinkOptions = (id: number) => {
  return queryOptions({
    queryKey: [...linksBaseKey, `${id}`],
    queryFn: () => retrieveLink(id),
  });
};

export const createLinkOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createLink>) => createLink(body),
    onSuccess: () => invalidateLinkQueries(),
  });
};

export const updateLinkOptions = (linkId: FirstParam<typeof updateLink>) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateLink>) =>
      updateLink(linkId, body),
    onSuccess: () => invalidateLinkQueries(),
  });
};

export const deleteLinksOptions = () =>
  mutationOptions({
    mutationFn: (linkIds: (number | string)[]) =>
      deleteLinks({ids: linkIds.join(',')}),
    onSuccess: () => invalidateLinkQueries(),
  });

export const batchUpdateLinksOptions = () =>
  mutationOptions({
    mutationFn: (body: FirstParam<typeof batchUpdateLinks>) =>
      batchUpdateLinks(body),
    onSuccess: () => invalidateLinkQueries(),
  });

export const validateLinkPasswordOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof validateLinkPassword>) =>
      validateLinkPassword(body),
  });
};

export const createMultipleLinksOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createMultipleLinks>) =>
      createMultipleLinks(body),
    onSuccess: () => invalidateLinkQueries(),
  });
};

export const exportLinksCsvOptions = (
  payload: FirstParam<typeof exportLinksCsv>,
) => {
  return mutationOptions({
    mutationFn: () => exportLinksCsv(payload),
  });
};

const invalidateLinkQueries = () => {
  return Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: linksBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: foldersBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: biolinksBaseKey,
    }),
  ]);
};

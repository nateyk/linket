import {linksBaseKey} from '@app/dashboard/links/links-queries';
import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveFolders,
  attachFolderLinks,
  createFolder,
  deleteFolders,
  detachFolderLinks,
  exportFoldersCsv,
  listFolders,
  retrieveFolder,
  unarchiveFolders,
  updateFolder,
} from '@app/gen/folders';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const foldersBaseKey = ['folders'];

export const listFoldersOptions = (
  routeType: DatatableRouteType,
  search: FirstParam<typeof listFolders>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...foldersBaseKey, params],
    queryFn: () => listFolders(params),
  });
};

export const retrieveFolderOptions = (
  id: FirstParam<typeof retrieveFolder>,
) => {
  return queryOptions({
    queryKey: [...foldersBaseKey, `${id}`],
    queryFn: () => retrieveFolder(id),
  });
};

export const createFolderOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createFolder>) => createFolder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: foldersBaseKey,
      });
    },
  });
};

export const updateFolderOptions = (
  folderId: FirstParam<typeof updateFolder>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateFolder>) =>
      updateFolder(folderId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: foldersBaseKey,
      });
    },
  });
};

export const deleteFoldersOptions = () =>
  mutationOptions({
    mutationFn: (folderIds: (number | string)[]) =>
      deleteFolders({folderIds: folderIds.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: foldersBaseKey,
      });
    },
  });

export const archiveFoldersOptions = () =>
  mutationOptions({
    mutationFn: (folderIds: (number | string)[]) =>
      archiveFolders({ids: folderIds.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: foldersBaseKey,
      });
    },
  });

export const unarchiveFoldersOptions = () =>
  mutationOptions({
    mutationFn: (folderIds: (number | string)[]) =>
      unarchiveFolders({ids: folderIds.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: foldersBaseKey,
      });
    },
  });

export const attachFolderLinksOptions = (
  folderId: FirstParam<typeof attachFolderLinks>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof attachFolderLinks>) =>
      attachFolderLinks(folderId, body),
    onSuccess: () =>
      Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: foldersBaseKey,
        }),
        queryClient.invalidateQueries({
          queryKey: linksBaseKey,
        }),
      ]),
  });
};

export const detachFolderLinksOptions = (
  folderId: FirstParam<typeof detachFolderLinks>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof detachFolderLinks>) =>
      detachFolderLinks(folderId, body),
    onSuccess: () =>
      Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: foldersBaseKey,
        }),
        queryClient.invalidateQueries({
          queryKey: linksBaseKey,
        }),
      ]),
  });
};

export const exportFoldersCsvOptions = (
  payload: FirstParam<typeof exportFoldersCsv>,
) => {
  return mutationOptions({
    mutationFn: () => exportFoldersCsv(payload),
  });
};

import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {createTag, deleteTags, listTags, updateTag} from '@app/gen/tags';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const tagsBaseKey = ['tags'];

export const listTagsOptions = (
  routeType: DatatableRouteType,
  search: FirstParam<typeof listTags>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...tagsBaseKey, params],
    queryFn: () => listTags(params),
  });
};

export const createTagOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createTag>) => createTag(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tagsBaseKey,
      });
    },
  });
};

export const updateTagOptions = (id: FirstParam<typeof updateTag>) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateTag>) => updateTag(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tagsBaseKey,
      });
    },
  });
};

export const deleteTagsOptions = () => {
  return mutationOptions({
    mutationFn: (ids: (number | string)[]) => deleteTags({ids: ids.join(',')}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tagsBaseKey,
      });
    },
  });
};

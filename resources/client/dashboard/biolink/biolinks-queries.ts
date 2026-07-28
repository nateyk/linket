import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  changeBiolinkContentOrder,
  createBiolink,
  createBiolinkLink,
  createBiolinkWidget,
  deleteBiolink,
  deleteBiolinkWidget,
  detachBiolinkLink,
  listBiolinks,
  retrieveBiolink,
  updateBiolink,
  updateBiolinkAppearance,
  updateBiolinkLink,
  updateBiolinkWidget,
} from '@app/gen/biolinks';
import {queryClient} from '@common/http/query-client';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam, ThirdParam} from '@ui/utils/ts/extract-params';

export const biolinksBaseKey = ['biolinks'];

export const listCurrentUserBiolinksOptions = () => {
  return queryOptions({
    queryKey: [...biolinksBaseKey, 'current-user'],
    queryFn: () => listBiolinks({fields_preset: 'minimal'}),
    initialData: () => {
      const bootstrapBiolinks = (getBootstrapData().biolinks ?? []).filter(
        b =>
          b.workspace_id === useWorkspaceStore.getState().activeWorkspace?.id,
      );
      if (bootstrapBiolinks) {
        return {data: bootstrapBiolinks};
      }
    },
  });
};

export const listBiolinksOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listBiolinks>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...biolinksBaseKey, params],
    queryFn: () => listBiolinks(params),
  });
};

export const retrieveBiolinkOptions = (
  id: FirstParam<typeof retrieveBiolink>,
) => {
  return queryOptions({
    queryKey: [...biolinksBaseKey, `${id}`],
    queryFn: () => retrieveBiolink(id),
  });
};

export const createBiolinkOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createBiolink>) => createBiolink(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: biolinksBaseKey,
      });
    },
  });
};

export const updateBiolinkOptions = (
  biolinkId: FirstParam<typeof updateBiolink>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateBiolink>) =>
      updateBiolink(biolinkId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: biolinksBaseKey,
      });
    },
  });
};

export const deleteBiolinkOptions = () =>
  mutationOptions({
    mutationFn: (id: FirstParam<typeof deleteBiolink>) => deleteBiolink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: biolinksBaseKey,
      });
    },
  });

export const createBiolinkLinkOptions = (
  biolinkId: FirstParam<typeof createBiolinkLink>,
) => {
  // will return full biolink with content, no need to invalidate queries
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof createBiolinkLink>) =>
      createBiolinkLink(biolinkId, body),
  });
};

export const updateBiolinkLinkOptions = (
  biolinkId: FirstParam<typeof updateBiolinkLink>,
  linkId: FirstParam<typeof updateBiolinkLink>,
) => {
  // will return full biolink with content, no need to invalidate queries
  return mutationOptions({
    mutationFn: (body: ThirdParam<typeof updateBiolinkLink>) =>
      updateBiolinkLink(biolinkId, linkId, body),
  });
};

export const detachBiolinkLinkOptions = (
  biolinkId: FirstParam<typeof detachBiolinkLink>,
  linkId: FirstParam<typeof detachBiolinkLink>,
) => {
  return mutationOptions({
    mutationFn: () => detachBiolinkLink(biolinkId, linkId),
  });
};

export const changeBiolinkContentOrderOptions = (
  biolinkId: FirstParam<typeof changeBiolinkContentOrder>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof changeBiolinkContentOrder>) =>
      changeBiolinkContentOrder(biolinkId, body),
  });
};

export const createBiolinkWidgetOptions = (
  biolinkId: FirstParam<typeof createBiolinkWidget>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof createBiolinkWidget>) =>
      createBiolinkWidget(biolinkId, body),
  });
};

export const updateBiolinkWidgetOptions = (
  biolinkId: FirstParam<typeof updateBiolinkWidget>,
  widgetId: FirstParam<typeof updateBiolinkWidget>,
) => {
  return mutationOptions({
    mutationFn: (body: ThirdParam<typeof updateBiolinkWidget>) =>
      updateBiolinkWidget(biolinkId, widgetId, body),
  });
};

export const deleteBiolinkWidgetOptions = (
  biolinkId: FirstParam<typeof deleteBiolinkWidget>,
  widgetId: SecondParam<typeof deleteBiolinkWidget>,
) => {
  return mutationOptions({
    mutationFn: () => deleteBiolinkWidget(biolinkId, widgetId),
  });
};

export const updateBiolinkAppearanceOptions = (
  biolinkId: FirstParam<typeof updateBiolinkAppearance>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateBiolinkAppearance>) =>
      updateBiolinkAppearance(biolinkId, body),
  });
};

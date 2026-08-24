import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  changeStoreContentOrder,
  createStore,
  createStoreLink,
  deleteStore,
  detachStoreLink,
  listStores,
  retrieveStore,
  updateStore,
  updateStoreLink,
} from '@app/gen/stores';
import {
  createStoreWidget,
  deleteStoreWidget,
  updateStoreWidget,
} from '@app/gen/store-widgets';
import {updateStoreAppearance} from '@app/gen/store-appearance';
import {queryClient} from '@common/http/query-client';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam, ThirdParam} from '@ui/utils/ts/extract-params';

// canonical key — MUST stay ['stores'] verbatim per spec (Task 3 preflight ruling)
export const storesBaseKey = ['stores'] as const;
// compat alias — old code still imports biolinksBaseKey
export const biolinksBaseKey = storesBaseKey;

export const listCurrentUserStoresOptions = () => {
  return queryOptions({
    queryKey: [...storesBaseKey, 'current-user'],
    queryFn: () => listStores({fields_preset: 'minimal'}),
    initialData: () => {
      const bootstrapStores =
        ((getBootstrapData() as any).stores as any) ??
        ((getBootstrapData() as any).biolinks as any) ??
        [];
      const filtered = (bootstrapStores as any[]).filter(
        b =>
          b.workspace_id === useWorkspaceStore.getState().activeWorkspace?.id,
      );
      if (filtered) {
        return {data: filtered} as any;
      }
    },
  });
};

export const listStoresOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listStores>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (routeType === 'admin') {
    (params as any).workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...storesBaseKey, params],
    queryFn: () => listStores(params as any),
  });
};

export const retrieveStoreOptions = (
  id: FirstParam<typeof retrieveStore>,
) => {
  return queryOptions({
    queryKey: [...storesBaseKey, `${id}`],
    queryFn: () => retrieveStore(id),
  });
};

export const createStoreOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createStore>) => createStore(body as any),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storesBaseKey as unknown as string[],
      });
    },
  });
};

export const updateStoreOptions = (
  storeId: FirstParam<typeof updateStore>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateStore>) =>
      updateStore(storeId, body as any),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storesBaseKey as unknown as string[],
      });
    },
  });
};

export const deleteStoreOptions = () =>
  mutationOptions({
    mutationFn: (id: FirstParam<typeof deleteStore>) => deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: storesBaseKey as unknown as string[],
      });
    },
  });

export const createStoreLinkOptions = (
  storeId: FirstParam<typeof createStoreLink>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof createStoreLink>) =>
      createStoreLink(storeId, body as any),
  });
};

export const updateStoreLinkOptions = (
  storeId: FirstParam<typeof updateStoreLink>,
  linkId: FirstParam<typeof updateStoreLink>,
) => {
  // second param is actually biolinkLinkId but keep signature compat
  return mutationOptions({
    mutationFn: (body: ThirdParam<typeof updateStoreLink>) =>
      updateStoreLink(storeId, linkId as any, body as any),
  });
};

export const detachStoreLinkOptions = (
  storeId: FirstParam<typeof detachStoreLink>,
  linkId: FirstParam<typeof detachStoreLink>,
) => {
  return mutationOptions({
    mutationFn: () => detachStoreLink(storeId, linkId as any),
  });
};

export const changeStoreContentOrderOptions = (
  storeId: FirstParam<typeof changeStoreContentOrder>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof changeStoreContentOrder>) =>
      changeStoreContentOrder(storeId, body as any),
  });
};

export const createStoreWidgetOptions = (
  storeId: FirstParam<typeof createStoreWidget>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof createStoreWidget>) =>
      createStoreWidget(storeId, body as any),
  });
};

export const updateStoreWidgetOptions = (
  storeId: FirstParam<typeof updateStoreWidget>,
  widgetId: FirstParam<typeof updateStoreWidget>,
) => {
  return mutationOptions({
    mutationFn: (body: ThirdParam<typeof updateStoreWidget>) =>
      updateStoreWidget(storeId, widgetId as any, body as any),
  });
};

export const deleteStoreWidgetOptions = (
  storeId: FirstParam<typeof deleteStoreWidget>,
  widgetId: SecondParam<typeof deleteStoreWidget>,
) => {
  return mutationOptions({
    mutationFn: () => deleteStoreWidget(storeId, widgetId as any),
  });
};

export const updateStoreAppearanceOptions = (
  storeId: FirstParam<typeof updateStoreAppearance>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateStoreAppearance>) =>
      updateStoreAppearance(storeId, body as any),
    onSuccess: response => {
      queryClient.setQueryData([...storesBaseKey, `${storeId}`] as unknown as string[], response);
      queryClient.invalidateQueries({
        queryKey: [...storesBaseKey, 'current-user'] as unknown as string[],
      });
    },
  });
};

// ——— Legacy compat aliases (biolinks → stores) ———
export const listCurrentUserBiolinksOptions = listCurrentUserStoresOptions;
export const listBiolinksOptions = listStoresOptions;
export const retrieveBiolinkOptions = retrieveStoreOptions;
export const createBiolinkOptions = createStoreOptions;
export const updateBiolinkOptions = updateStoreOptions;
export const deleteBiolinkOptions = deleteStoreOptions;
export const createBiolinkLinkOptions = createStoreLinkOptions;
export const updateBiolinkLinkOptions = updateStoreLinkOptions;
export const detachBiolinkLinkOptions = detachStoreLinkOptions;
export const changeBiolinkContentOrderOptions = changeStoreContentOrderOptions;
export const createBiolinkWidgetOptions = createStoreWidgetOptions;
export const updateBiolinkWidgetOptions = updateStoreWidgetOptions;
export const deleteBiolinkWidgetOptions = deleteStoreWidgetOptions;
export const updateBiolinkAppearanceOptions = updateStoreAppearanceOptions;

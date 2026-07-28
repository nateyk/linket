import {ValidateUploadBackendCredentialsBody} from '@app/gen/schemas/validate-upload-backend-credentials-body';
import {
  getSearchableModels,
  getServerMaxUploadSize,
  importRecordsIntoScout,
  listSettings,
  loadMenuEditorConfig,
  loadSeoTags,
  updateSettings,
  validateUploadBackendCredentials,
} from '@app/gen/settings';
import {flushCache, generateSitemap, getSiteAlerts} from '@app/gen/system';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {queryClient} from '@common/http/query-client';
import {MenuItemCategory} from '@common/menus/menu-item-category';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam} from '@ui/utils/ts/extract-params';

const settingsBaseKey = ['admin-settings'];

export const listSettingsOptions = () => {
  return queryOptions({
    queryKey: [...settingsBaseKey],
    queryFn: () => listSettings() as unknown as Promise<AdminSettings>,
    staleTime: Infinity,
  });
};

export const updateSettingsOptions = () => {
  return mutationOptions({
    mutationFn: ({files, ...other}: AdminSettings) => {
      const formData = new FormData();

      Object.entries(files || {}).forEach(([key, file]) => {
        formData.set(key, file);
      });

      for (const key in other) {
        formData.set(
          key,
          JSON.stringify(other[key as keyof Omit<AdminSettings, 'files'>]),
        );
      }

      return updateSettings({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: settingsBaseKey});
    },
  });
};

export const loadSeoTagsOptions = () => {
  return queryOptions({
    queryKey: [...settingsBaseKey, 'seo-tags'],
    queryFn: () => loadSeoTags(),
    staleTime: Infinity,
  });
};

export const loadMenuEditorConfigOptions = () => {
  return queryOptions<{
    config: {
      positions: {
        name: string;
        label: string;
        route: string;
      }[];
      available_routes: string[];
    };
    categories: MenuItemCategory[];
  }>({
    queryKey: [...settingsBaseKey, 'menu-editor-config'],
    queryFn: () => loadMenuEditorConfig() as any,
    staleTime: Infinity,
  });
};

export const validateUploadBackendCredentialsOptions = () => {
  return mutationOptions({
    mutationFn: (payload: ValidateUploadBackendCredentialsBody) =>
      validateUploadBackendCredentials(payload),
  });
};

export const getSearchableModelsOptions = () => {
  return queryOptions({
    queryKey: [...settingsBaseKey, 'searchable-models'],
    queryFn: () => getSearchableModels(),
    staleTime: Infinity,
  });
};

export const importRecordsIntoScoutOptions = () => {
  return mutationOptions({
    mutationFn: (payload: FirstParam<typeof importRecordsIntoScout>) =>
      importRecordsIntoScout(payload),
  });
};

export const getServerMaxUploadSizeOptions = () => {
  return queryOptions({
    queryKey: [...settingsBaseKey, 'server-max-upload-size'],
    queryFn: () => getServerMaxUploadSize(),
    staleTime: Infinity,
  });
};

export const flushCacheOptions = () => {
  return mutationOptions({
    mutationFn: () => flushCache(),
  });
};

export const getSiteAlertsOptions = () => {
  return queryOptions({
    queryKey: [...settingsBaseKey, 'site-alerts'],
    queryFn: () => getSiteAlerts(),
  });
};

export const generateSitemapOptions = () => {
  return mutationOptions({
    mutationFn: () => generateSitemap(),
  });
};

import {apiClient, queryClient} from '@common/http/query-client';
import {HelpArticle, HelpCategory} from '@common/help/help-queries';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export const helpAdminBaseKey = ['help-admin'];

interface CategoryPayload {
  name: string;
  slug?: string;
}

interface ArticlePayload {
  title: string;
  slug?: string;
  help_category_id: number;
  body: string;
  short_description: string;
}

export const listHelpCategoriesOptions = (search?: string) =>
  queryOptions({
    queryKey: [...helpAdminBaseKey, 'categories', {search: search ?? ''}],
    queryFn: () =>
      apiClient
        .get<{data: (HelpCategory & {articles_count?: number})[]}>(
          'admin/help/categories',
          {params: search ? {search} : {}},
        )
        .then(r => r.data.data),
  });

export const createHelpCategoryOptions = () =>
  mutationOptions({
    mutationFn: (payload: CategoryPayload) =>
      apiClient.post('admin/help/categories', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const updateHelpCategoryOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: CategoryPayload) =>
      apiClient.patch(`admin/help/categories/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const deleteHelpCategoryOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient.delete(`admin/help/categories/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const sortHelpCategoriesOptions = () =>
  mutationOptions({
    mutationFn: (ids: number[]) =>
      apiClient.post('admin/help/categories/sort', {ids}).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const listHelpArticlesOptions = (params?: {
  search?: string;
  category?: number;
}) =>
  queryOptions({
    queryKey: [...helpAdminBaseKey, 'articles', params ?? {}],
    queryFn: () =>
      apiClient
        .get<{data: HelpArticle[]}>('admin/help/articles', {params})
        .then(r => r.data.data),
  });

export const createHelpArticleOptions = () =>
  mutationOptions({
    mutationFn: (payload: ArticlePayload) =>
      apiClient.post('admin/help/articles', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const updateHelpArticleOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: ArticlePayload) =>
      apiClient.patch(`admin/help/articles/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

export const deleteHelpArticleOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient.delete(`admin/help/articles/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: helpAdminBaseKey});
    },
  });

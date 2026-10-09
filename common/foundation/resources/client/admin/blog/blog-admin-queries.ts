import {apiClient, queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export const blogAdminBaseKey = ['blog'];

export const blogArticlesListOptions = (params?: Record<string, unknown>) =>
  queryOptions({
    placeholderData: (data) => data, // keepPreviousData behavior
    queryKey: [...blogAdminBaseKey, 'articles', params ?? {}],
    queryFn: () =>
      apiClient
        .get<{pagination: unknown}>('/api/v1/blog/admin/articles', {params: {perPage: 20, ...params}})
        .then(r => r.data),
  });

export const blogArticleOptions = (id: number) =>
  queryOptions({
    queryKey: [...blogAdminBaseKey, 'article', id],
    queryFn: () =>
      apiClient
        .get<{article: unknown}>(`/api/v1/blog/admin/articles/${id}`)
        .then(r => r.data),
  });

export const createBlogArticleOptions = () =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post('/api/v1/blog/admin/articles', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const updateBlogArticleOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.put(`/api/v1/blog/admin/articles/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const deleteBlogArticleOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient.delete(`/api/v1/blog/admin/articles/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const blogCategoriesListOptions = (params?: Record<string, unknown>) =>
  queryOptions({
    placeholderData: (data) => data,
    queryKey: [...blogAdminBaseKey, 'categories', params ?? {}],
    queryFn: () =>
      apiClient
        .get('/api/v1/blog/admin/categories', {params: {perPage: 50, ...params}})
        .then(r => r.data),
  });

export const createBlogCategoryOptions = () =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post('/api/v1/blog/admin/categories', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const updateBlogCategoryOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.patch(`/api/v1/blog/admin/categories/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const deleteBlogCategoryOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient.delete(`/api/v1/blog/admin/categories/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: blogAdminBaseKey});
    },
  });

export const blogAdminQueries = {
  articlesList: blogArticlesListOptions,
  article: blogArticleOptions,
  createArticle: createBlogArticleOptions,
  updateArticle: updateBlogArticleOptions,
  deleteArticle: deleteBlogArticleOptions,
  categoriesList: blogCategoriesListOptions,
  createCategory: createBlogCategoryOptions,
  updateCategory: updateBlogCategoryOptions,
  deleteCategory: deleteBlogCategoryOptions,
};
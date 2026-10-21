import {apiClient, queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export type AdminServiceSubcategory = {
  id: number;
  service_category_id: number;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'inactive';
  featured: boolean;
  add_to_menu: boolean;
  position: number;
  services_count?: number;
};

export type AdminServiceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'inactive';
  featured: boolean;
  add_to_menu: boolean;
  position: number;
  services_count?: number;
  subcategories?: AdminServiceSubcategory[];
};

export const serviceCategoriesAdminKey = ['admin', 'service-categories'];

export const serviceCategoriesAdminOptions = () =>
  queryOptions({
    queryKey: [...serviceCategoriesAdminKey, 'list'],
    queryFn: () =>
      apiClient
        .get<{data: AdminServiceCategory[]}>('/api/v1/admin/service-categories')
        .then(r => r.data),
  });

export const createServiceCategoryOptions = () =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient
        .post('/api/v1/admin/service-categories', payload)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: serviceCategoriesAdminKey});
    },
  });

export const updateServiceCategoryOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient
        .patch(`/api/v1/admin/service-categories/${id}`, payload)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: serviceCategoriesAdminKey});
    },
  });

export const deleteServiceCategoryOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient
        .delete(`/api/v1/admin/service-categories/${id}`)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: serviceCategoriesAdminKey});
    },
  });

export const createServiceSubcategoryOptions = () =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient
        .post('/api/v1/admin/service-subcategories', payload)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: serviceCategoriesAdminKey});
    },
  });

export const updateServiceSubcategoryOptions = (id: number) =>
  mutationOptions({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient
        .patch(`/api/v1/admin/service-subcategories/${id}`, payload)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceCategoriesAdminKey,
      });
    },
  });

export const deleteServiceSubcategoryOptions = () =>
  mutationOptions({
    mutationFn: (id: number) =>
      apiClient
        .delete(`/api/v1/admin/service-subcategories/${id}`)
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: serviceCategoriesAdminKey});
    },
  });

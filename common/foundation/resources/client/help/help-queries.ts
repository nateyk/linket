import {apiClient, queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export interface HelpArticleListItem {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  views: number;
  likes: number;
  dislikes: number;
  help_category_id: number;
  created_at: string;
}

export interface HelpArticle extends HelpArticleListItem {
  body?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface HelpCategory {
  id: number;
  name: string;
  slug: string;
  views: number;
  articles?: HelpArticleListItem[];
}

export interface HelpIndexData {
  categories: HelpCategory[];
  commonCategories: HelpCategory[];
}

export interface HelpCategoryData {
  category: HelpCategory;
  articles: HelpArticleListItem[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface HelpArticleData {
  article: HelpArticle;
  relatedArticles: HelpArticleListItem[];
}

export const helpBaseKey = ['help'];

export const helpIndexOptions = (search?: string) =>
  queryOptions({
    queryKey: [...helpBaseKey, 'index', {search: search ?? ''}],
    queryFn: () =>
      apiClient
        .get<HelpIndexData>('help', {params: search ? {search} : {}})
        .then(r => r.data),
  });

export const helpCategoryOptions = (slug: string) =>
  queryOptions({
    queryKey: [...helpBaseKey, 'category', slug],
    queryFn: () =>
      apiClient
        .get<HelpCategoryData>(`help/categories/${slug}`)
        .then(r => r.data),
  });

export const helpArticleOptions = (slug: string) =>
  queryOptions({
    queryKey: [...helpBaseKey, 'article', slug],
    queryFn: () =>
      apiClient.get<HelpArticleData>(`help/articles/${slug}`).then(r => r.data),
  });

export const reactToArticleOptions = (slug: string) =>
  mutationOptions({
    mutationFn: (action: 1 | 2) =>
      apiClient
        .post<{message: string}>(`help/articles/${slug}/react`, {action})
        .then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [...helpBaseKey, 'article', slug]});
    },
  });

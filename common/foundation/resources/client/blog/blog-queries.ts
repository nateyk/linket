import {apiClient} from '@common/http/query-client';
import {
  LengthAwarePaginationMeta,
  LengthAwarePaginationResponse,
} from '@common/http/backend-response/pagination-response';
import {queryOptions} from '@tanstack/react-query';

export interface BlogArticleListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body_text: string;
  cover_image: string | null;
  published_at: string | null;
  reading_time_minutes: number;
  views: number;
  blog_category_id: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  author?: {
    id: number;
    name: string;
  } | null;
}

export interface BlogArticle extends BlogArticleListItem {
  body?: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  views: number;
}

/** Backend pagination envelope; merged into the article list for the UI. */
export interface BlogPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface BlogIndexData {
  data: BlogArticleListItem[];
  pagination: BlogPagination;
}

export interface BlogCategoryData {
  category: BlogCategory;
  articles: BlogArticleListItem[];
  pagination: BlogPagination;
}

export interface BlogArticleData {
  article: BlogArticle;
  relatedArticles: BlogArticleListItem[];
}

export const blogBaseKey = ['blog'];

export const blogIndexOptions = (search?: string, page?: number) =>
  queryOptions({
    queryKey: [
      ...blogBaseKey,
      'index',
      {search: search ?? '', page: page ?? 1},
    ],
    queryFn: () =>
      apiClient
        .get<BlogIndexData>('blog', {
          params: { ...(search ? {search} : {}), ...(page ? {page} : {}) },
        })
        .then(r => r.data),
  });

export const blogCategoryOptions = (slug: string, page?: number) =>
  queryOptions({
    queryKey: [...blogBaseKey, 'category', slug, {page: page ?? 1}],
    queryFn: () =>
      apiClient
        .get<BlogCategoryData>(`blog/categories/${slug}`, {
          params: page ? {page} : {},
        })
        .then(r => r.data),
  });

export const blogArticleOptions = (slug: string) =>
  queryOptions({
    queryKey: [...blogBaseKey, 'article', slug],
    queryFn: () =>
      apiClient.get<BlogArticleData>(`blog/${slug}`).then(r => r.data),
  });

/**
 * The blog API returns `{data, pagination}` while PaginationControls expects a
 * flat length-aware response. Merge the envelope into that shape.
 */
export function blogPaginationResponse<T>(
  data: T[],
  pagination: BlogPagination,
): LengthAwarePaginationResponse<T> {
  return {...(pagination as LengthAwarePaginationMeta), data};
}

import {
  blogArticlesListOptions,
  blogArticleOptions,
  createBlogArticleOptions,
  updateBlogArticleOptions,
  deleteBlogArticleOptions,
  blogCategoriesListOptions,
  createBlogCategoryOptions,
  updateBlogCategoryOptions,
  deleteBlogCategoryOptions,
} from '@common/admin/blog/blog-admin-queries';
import {apiClient, queryClient} from '@common/http/query-client';
import {describe, test, expect, vi, beforeEach} from 'vitest';

vi.mock('@common/http/query-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe('blogAdminQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('blogArticlesListOptions produces correct query key and fetches with params', async () => {
    const options = blogArticlesListOptions({page: 2, search: 'test'});

    expect(options.queryKey).toEqual(['blog', 'articles', {page: 2, search: 'test'}]);

    const mockResponse = {pagination: {data: [], total: 0}};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const result = await options.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/blog/admin/articles',
      {params: {perPage: 20, page: 2, search: 'test'}},
    );
    expect(result).toEqual(mockResponse);
  });

  test('blogArticleOptions produces correct query key and fetches', async () => {
    const options = blogArticleOptions(42);

    expect(options.queryKey).toEqual(['blog', 'article', 42]);

    const mockArticle = {id: 42, title: 'Test'};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: {article: mockArticle}});

    const result = await options.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/blog/admin/articles/42');
    expect(result).toEqual({article: mockArticle});
  });

  test('createBlogArticleOptions posts to the correct endpoint and has onSuccess', async () => {
    const options = createBlogArticleOptions();
    const payload = {title: 'New', body: '<p>Body</p>', blog_category_id: 1};
    const mockResponse = {article: {id: 1, ...payload}};
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/blog/admin/articles', payload);
    expect(result).toEqual(mockResponse);
    expect(typeof onSuccess).toBe('function');
  });

  test('updateBlogArticleOptions puts to the correct endpoint', async () => {
    const options = updateBlogArticleOptions(3);
    const payload = {title: 'Updated'};
    const mockResponse = {article: {id: 3, ...payload}};
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/blog/admin/articles/3', payload);
    expect(result).toEqual(mockResponse);
    expect(typeof onSuccess).toBe('function');
  });

  test('deleteBlogArticleOptions deletes at the correct endpoint', async () => {
    const options = deleteBlogArticleOptions();
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({data: {}});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(5);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/blog/admin/articles/5');
    expect(result).toEqual({});
    expect(typeof onSuccess).toBe('function');
  });

  test('blogCategoriesListOptions produces correct query key and fetches', async () => {
    const options = blogCategoriesListOptions({search: 'guides'});

    expect(options.queryKey).toEqual(['blog', 'categories', {search: 'guides'}]);

    const mockResponse = {data: []};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const result = await options.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/blog/admin/categories',
      {params: {perPage: 50, search: 'guides'}},
    );
    expect(result).toEqual(mockResponse);
  });

  test('createBlogCategoryOptions posts and has onSuccess', async () => {
    const options = createBlogCategoryOptions();
    const payload = {name: 'New Category'};
    const mockResponse = {category: {id: 2, ...payload}};
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/blog/admin/categories', payload);
    expect(result).toEqual(mockResponse);
    expect(typeof onSuccess).toBe('function');
  });

  test('updateBlogCategoryOptions patches and has onSuccess', async () => {
    const options = updateBlogCategoryOptions(4);
    const payload = {name: 'Updated'};
    const mockResponse = {category: {id: 4, ...payload}};
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/blog/admin/categories/4', payload);
    expect(result).toEqual(mockResponse);
    expect(typeof onSuccess).toBe('function');
  });

  test('deleteBlogCategoryOptions deletes and has onSuccess', async () => {
    const options = deleteBlogCategoryOptions();
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({data: {}});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(6);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/blog/admin/categories/6');
    expect(result).toEqual({});
    expect(typeof onSuccess).toBe('function');
  });
});
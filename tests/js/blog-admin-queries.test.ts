import {
  blogAdminQueries,
  createBlogArticleOptions,
  updateBlogArticleOptions,
  deleteBlogArticleOptions,
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

  test('articlesList produces correct query key and fetches with params', async () => {
    const queryOptions = blogAdminQueries.articlesList({page: 2, search: 'test'});

    expect(queryOptions.queryKey).toEqual(['blog', 'articles', {page: 2, search: 'test'}]);

    const mockResponse = {data: [], total: 0};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const result = await queryOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/blog/admin/articles',
      {params: {perPage: 20, page: 2, search: 'test'}},
    );
    expect(result).toEqual(mockResponse);
  });

  test('article(id) produces correct query key and fetches', async () => {
    const queryOptions = blogAdminQueries.article(42);

    expect(queryOptions.queryKey).toEqual(['blog', 'article', 42]);

    const mockArticle = {id: 42, title: 'Test'};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: {article: mockArticle}});

    const result = await queryOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/blog/admin/articles/42');
    expect(result).toEqual({article: mockArticle});
  });

  test('createArticle posts to the correct endpoint and invalidates', async () => {
    const options = createBlogArticleOptions();
    const payload = {title: 'New', body: '<p>Body</p>', blog_category_id: 1};
    const mockResponse = {article: {id: 1, ...payload}};
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/blog/admin/articles', payload);
    expect(result).toEqual(mockResponse);
    expect(typeof onSuccess).toBe('function');
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });

  test('updateArticle puts to the correct endpoint', async () => {
    const options = updateBlogArticleOptions(3);
    const payload = {title: 'Updated'};
    const mockResponse = {article: {id: 3, ...payload}};
    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/blog/admin/articles/3', payload);
    expect(result).toEqual(mockResponse);
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });

  test('deleteArticle deletes at the correct endpoint', async () => {
    const options = deleteBlogArticleOptions();
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({data: {}});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(5);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/blog/admin/articles/5');
    expect(result).toEqual({});
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });

  test('categoriesList produces correct query key and fetches', async () => {
    const queryOptions = blogAdminQueries.categoriesList({search: 'guides'});

    expect(queryOptions.queryKey).toEqual(['blog', 'categories', {search: 'guides'}]);

    const mockResponse = {data: []};
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const result = await queryOptions.queryFn();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/blog/admin/categories',
      {params: {perPage: 50, search: 'guides'}},
    );
    expect(result).toEqual(mockResponse);
  });

  test('createCategory posts and invalidates', async () => {
    const options = createBlogCategoryOptions();
    const payload = {name: 'New Category'};
    const mockResponse = {category: {id: 2, ...payload}};
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/blog/admin/categories', payload);
    expect(result).toEqual(mockResponse);
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });

  test('updateCategory patches and invalidates', async () => {
    const options = updateBlogCategoryOptions(4);
    const payload = {name: 'Updated'};
    const mockResponse = {category: {id: 4, ...payload}};
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({data: mockResponse});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(payload);

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/blog/admin/categories/4', payload);
    expect(result).toEqual(mockResponse);
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });

  test('deleteCategory deletes and invalidates', async () => {
    const options = deleteBlogCategoryOptions();
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({data: {}});

    const {mutationFn, onSuccess} = options;
    const result = await mutationFn(6);

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/blog/admin/categories/6');
    expect(result).toEqual({});
    onSuccess();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['blog'],
    });
  });
});
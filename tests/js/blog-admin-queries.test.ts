import {blogAdminQueries} from '@common/admin/blog/blog-admin-queries';
import {queryFactoryHelpers} from '@common/http/queries-file-helpers';
import {describe, test, expect, vi} from 'vitest';

vi.mock('@common/http/queries-file-helpers', () => ({
  queryFactoryHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

describe('blogAdminQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('articlesList produces correct query key and fetches with params', () => {
    const queryOptions = blogAdminQueries.articlesList({page: 2, search: 'test'});

    expect(queryOptions.queryKey).toEqual(['blog', 'articles', {page: 2, search: 'test'}]);

    const mockResponse = {pagination: {data: [], total: 0}};
    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return queryOptions.queryFn({pageParam: 2}).then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith(
        '/api/v1/blog/admin/articles',
        expect.objectContaining({page: 2, search: 'test', perPage: 20}),
      );
      expect(result).toEqual({pagination: mockResponse});
    });
  });

  test('article(id) produces correct query key and fetches', () => {
    const queryOptions = blogAdminQueries.article(42);

    expect(queryOptions.queryKey).toEqual(['blog', 'article', 42]);

    const mockArticle = {id: 42, title: 'Test'};
    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockArticle);

    return queryOptions.queryFn().then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith('/api/v1/blog/admin/articles/42');
      expect(result).toEqual({article: mockArticle});
    });
  });

  test('createArticle posts to the correct endpoint', () => {
    const payload = {title: 'New', body: '<p>Body</p>', blog_category_id: 1};
    const mockResponse = {article: {id: 1, ...payload}};
    (queryFactoryHelpers.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return blogAdminQueries.createArticle(payload).then(result => {
      expect(queryFactoryHelpers.post).toHaveBeenCalledWith(
        '/api/v1/blog/admin/articles',
        payload,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  test('updateArticle puts to the correct endpoint', () => {
    const payload = {title: 'Updated'};
    const mockResponse = {article: {id: 3, ...payload}};
    (queryFactoryHelpers.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return blogAdminQueries.updateArticle(3, payload).then(result => {
      expect(queryFactoryHelpers.put).toHaveBeenCalledWith(
        '/api/v1/blog/admin/articles/3',
        payload,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  test('deleteArticle deletes at the correct endpoint', () => {
    (queryFactoryHelpers.del as ReturnType<typeof vi.fn>).mockResolvedValue({});

    return blogAdminQueries.deleteArticle(5).then(result => {
      expect(queryFactoryHelpers.del).toHaveBeenCalledWith('/api/v1/blog/admin/articles/5');
      expect(result).toEqual({});
    });
  });

  test('categoriesList produces correct query key and fetches', () => {
    const queryOptions = blogAdminQueries.categoriesList({search: 'guides'});

    expect(queryOptions.queryKey).toEqual(['blog', 'categories', {search: 'guides'}]);

    const mockResponse = {data: []};
    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return queryOptions.queryFn().then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith(
        '/api/v1/blog/admin/categories',
        {search: 'guides', perPage: 50},
      );
      expect(result).toEqual(mockResponse);
    });
  });

  test('createCategory posts to the correct endpoint', () => {
    const payload = {name: 'New Category'};
    const mockResponse = {category: {id: 2, ...payload}};
    (queryFactoryHelpers.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return blogAdminQueries.createCategory(payload).then(result => {
      expect(queryFactoryHelpers.post).toHaveBeenCalledWith(
        '/api/v1/blog/admin/categories',
        payload,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  test('updateCategory puts to the correct endpoint', () => {
    const payload = {name: 'Updated'};
    const mockResponse = {category: {id: 4, ...payload}};
    (queryFactoryHelpers.put as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    return blogAdminQueries.updateCategory(4, payload).then(result => {
      expect(queryFactoryHelpers.put).toHaveBeenCalledWith(
        '/api/v1/blog/admin/categories/4',
        payload,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  test('deleteCategory deletes at the correct endpoint', () => {
    (queryFactoryHelpers.del as ReturnType<typeof vi.fn>).mockResolvedValue({});

    return blogAdminQueries.deleteCategory(6).then(result => {
      expect(queryFactoryHelpers.del).toHaveBeenCalledWith('/api/v1/blog/admin/categories/6');
      expect(result).toEqual({});
    });
  });

  test('invalidateKey is correct', () => {
    expect(blogAdminQueries.invalidateKey).toEqual(['blog']);
  });
});
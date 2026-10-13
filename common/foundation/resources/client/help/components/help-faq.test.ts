import {describe, expect, test} from 'vitest';
import {HelpCategory} from '@common/help/help-queries';
import {selectTopArticles} from './help-faq';

const makeCategory = (
  id: number,
  articles: Array<{
    id: number;
    views?: number;
    short_description?: string;
  }>,
): HelpCategory => ({
  id,
  name: `Category ${id}`,
  slug: `category-${id}`,
  views: 0,
  articles: articles.map(a => ({
    id: a.id,
    title: `Article ${a.id}`,
    slug: `article-${a.id}`,
    short_description: a.short_description ?? `Answer ${a.id}`,
    views: a.views ?? 0,
    likes: 0,
    dislikes: 0,
    help_category_id: id,
    created_at: '2026-01-01',
  })),
});

describe('selectTopArticles', () => {
  test('sorts by views descending and respects the limit', () => {
    const categories = [
      makeCategory(1, [
        {id: 1, views: 10},
        {id: 2, views: 50},
      ]),
      makeCategory(2, [{id: 3, views: 30}]),
    ];

    const result = selectTopArticles(categories, 2);

    expect(result.map(a => a.id)).toEqual([2, 3]);
  });

  test('dedupes articles that appear in multiple categories', () => {
    const shared = {
      id: 9,
      views: 100,
      short_description: 'shared',
    };
    const categories = [
      makeCategory(1, [shared]),
      makeCategory(2, [shared, {id: 1, views: 5}]),
    ];

    const result = selectTopArticles(categories, 10);

    expect(result.filter(a => a.id === 9)).toHaveLength(1);
  });

  test('drops articles without a usable short description', () => {
    const categories = [
      makeCategory(1, [
        {id: 1, views: 100, short_description: '   '},
        {id: 2, views: 5, short_description: 'has answer'},
      ]),
    ];

    const result = selectTopArticles(categories, 10);

    expect(result.map(a => a.id)).toEqual([2]);
  });

  test('returns empty when there are no articles', () => {
    expect(selectTopArticles([makeCategory(1, [])], 6)).toEqual([]);
  });

  test('tolerates categories with no articles relation', () => {
    const bare = {id: 1, name: 'Bare', slug: 'bare', views: 0};
    expect(selectTopArticles([bare], 6)).toEqual([]);
  });
});

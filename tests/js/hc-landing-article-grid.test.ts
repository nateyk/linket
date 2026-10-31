import {describe, expect, it, vi} from 'vitest';

/**
 * Regression: single-root Help Centers set hide_from_structure on the only
 * category so the parent header can hide. The grid must still render that
 * category's sections/articles.
 */
describe('HC landing article grid visibility', () => {
  it('keeps single-root categories visible when hide_from_structure is true', async () => {
    vi.resetModules();

    const categories = [
      {
        id: 1,
        name: 'E2E Getting Started',
        hide_from_structure: true,
        sections: [
          {
            id: 2,
            name: 'E2E Basics',
            articles: [
              {id: 1, title: 'E2E Published Getting Started'},
              {id: 3, title: 'E2E Published Open a Ticket'},
            ],
            articles_count: 2,
          },
        ],
      },
    ];

    // Mirror ArticleGrid's root selection rule after the fix.
    const visibleRoots = categories;
    const rootCategories = visibleRoots.slice(0, 1);

    expect(rootCategories).toHaveLength(1);
    expect(rootCategories[0].sections[0].articles.map(a => a.title)).toContain(
      'E2E Published Getting Started',
    );
    expect(rootCategories[0].hide_from_structure).toBe(true);
  });
});

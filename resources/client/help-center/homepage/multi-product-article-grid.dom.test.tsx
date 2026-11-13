/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {MultiProductArticleGrid} from '@app/help-center/homepage/multi-product-article-grid';
import {MemoryRouter} from 'react-router';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@app/help-center/help-center-queries', () => ({
  helpCenterQueries: {categories: {landingPageData: () => ({})}},
}));

vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({
    data: {
      categories: [
        {
          id: 10,
          name: 'Seller guides',
          description: 'Resources for sellers',
          image: undefined,
          parent_id: null,
          hide_from_structure: false,
          articles_count: 1,
          articles: [],
          sections: [
            {
              id: 20,
              name: 'Getting started',
              parent_id: 10,
              image: undefined,
              description: undefined,
              hide_from_structure: false,
              articles_count: 1,
              articles: [{id: 50, title: 'Welcome'}],
              sections: [],
            },
          ],
        },
        {
          id: 11,
          name: 'Empty guides',
          description: undefined,
          image: undefined,
          parent_id: null,
          hide_from_structure: false,
          articles_count: 0,
          articles: [],
          sections: [],
        },
      ],
    },
  }),
}));

describe('Help Center multi-product category navigation', () => {
  it('makes entire category and section rows native keyboard-accessible links', () => {
    render(
      <MemoryRouter>
        <MultiProductArticleGrid />
      </MemoryRouter>,
    );

    const category = screen.getByRole('link', {name: /Seller guides/i});
    const section = screen.getByRole('link', {name: /Getting started/i});
    const empty = screen.getByRole('link', {name: /Empty guides/i});

    expect(category.getAttribute('href')).toContain('/hc/categories/10/');
    expect(section.getAttribute('href')).toContain('/hc/categories/10/20/');
    expect(empty.getAttribute('href')).toContain('/hc/categories/11/');

    expect(category.querySelector('a')).toBeNull();
    expect(section.querySelector('a')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});

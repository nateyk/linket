/** @vitest-environment jsdom */
import {cleanup, render, screen, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Component as SearchPage} from '@app/help-center/search/hc-search-page';

const fixture = vi.hoisted(() => ({
  results: [] as {id: number; title: string; slug: string; updated_at: string; path: any[]}[],
  query: 'help',
  total: 0,
  clicked: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({
    data: {
      query: fixture.query,
      pagination: {
        data: fixture.results,
        current_page: 1,
        from: fixture.results.length ? 1 : null,
        to: fixture.results.length || null,
        per_page: 30,
        total: fixture.total,
      },
    },
  }),
}));
vi.mock('@app/help-center/help-center-queries', () => ({
  helpCenterQueries: {articles: {search: () => ({})}},
}));
vi.mock('@app/help-center/search/use-search-term-logger', () => ({
  useSearchTermLogger: () => ({log: vi.fn(), updateLastSearch: fixture.clicked}),
}));
vi.mock('@app/help-center/search/hc-search-bar', () => ({
  HcSearchBar: () => <button type="button">Search documentation</button>,
}));
vi.mock('@common/ui/navigation/navbar/navbar', () => ({
  Navbar: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, string | number>}) => (
    <>{Object.entries(values ?? {}).reduce(
      (text, [key, value]) => text.replaceAll(':' + key, String(value)),
      message,
    )}</>
  ),
}));
vi.mock('@ui/breadcrumbs/breadcrumb', () => ({
  Breadcrumb: ({children}: {children: React.ReactNode}) => <nav>{children}</nav>,
}));
vi.mock('@ui/breadcrumbs/breadcrumb-item', () => ({
  BreadcrumbItem: ({children}: {children: React.ReactNode}) => <span>{children}</span>,
}));

afterEach(() => {
  cleanup();
  fixture.results = [];
  fixture.total = 0;
  fixture.clicked.mockClear();
});

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/hc/search/help']}>
      <Routes>
        <Route path="/hc/search/:query" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Help Center search page', () => {
  it('keeps one page heading and an accessible recovery link when there are no results', () => {
    const {container} = renderSearch();

    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('0 results');
    expect(screen.getByText('No articles match your search query')).toBeTruthy();
    expect(screen.getByRole('link', {name: 'Help center'}).getAttribute('href')).toBe('/hc');
    expect(container.querySelector('main')?.className).toContain('sm:px-24');
  });

  it('renders keyboard-reachable article and category links with wrapping for long labels', () => {
    fixture.results = [
      {
        id: 43,
        title: 'A very long article title that must remain readable on small screens',
        slug: 'long-guide',
        updated_at: '2026-11-13',
        path: [
          {id: 2, name: 'Getting started', parent_id: null},
          {id: 3, name: 'Guides', parent_id: 2},
        ],
      },
    ];
    fixture.total = 5;
    renderSearch();

    const list = screen.getByRole('list', {name: 'Search'});
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    const article = within(list).getByRole('link', {name: fixture.results[0].title});
    expect(article.getAttribute('href')).toContain('/hc/articles/2/3/43/');
    expect(article.className).toContain('focus-visible:outline-2');
    expect(article.closest('li')?.className).toContain('sm:p-20');
    expect(screen.getByRole('status').textContent).toContain('5 results');
    expect(within(list).getByRole('link', {name: 'Guides'})).toBeTruthy();
  });
});

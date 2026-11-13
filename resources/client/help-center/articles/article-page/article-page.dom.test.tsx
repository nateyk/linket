/** @vitest-environment jsdom */
import {cleanup, render, screen, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Component as ArticlePage} from '@app/help-center/articles/article-page/article-page';

const fixture = vi.hoisted(() => ({
  body: '<h2 id="shipping">Shipping</h2><p>Details</p><img src="/diagram.png" alt="Shipping diagram" />',
  nav: [{indent: false, display_name: 'Shipping', slug: 'shipping', type: 'h2'}],
  title: 'A detailed guide for new sellers',
}));

vi.mock('@app/help-center/help-center-queries', () => ({
  helpCenterQueries: {articles: {getForArticlePage: () => ({})}},
}));
vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({
    data: {
      article: {
        id: 50,
        title: fixture.title,
        body: fixture.body,
        managed_by_role: null,
        path: [{id: 2, name: 'Guides', parent_id: null}],
        attachments: [],
      },
      pageNav: fixture.nav,
      categoryNav: [],
    },
  }),
}));
vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({hasPermission: () => true, hasRole: () => false}),
}));
vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({article: {hide_new_ticket_link: true}}),
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: (value: {message: string}) => value.message}),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@common/http/page-meta-tags', () => ({
  PageMetaTags: () => null,
}));
vi.mock('@app/help-center/articles/hc-sidenav', () => ({
  HcSidenav: () => <div />,
}));
vi.mock('@app/help-center/articles/article-page/article-page-breadcrumb', () => ({
  ArticlePageBreadcrumb: () => <nav>Help center</nav>,
}));
vi.mock('@app/help-center/articles/article-attachments', () => ({
  ArticleAttachments: () => null,
}));
vi.mock('@app/help-center/articles/article-page/article-page-feedback', () => ({
  ArticlePageFeedback: () => null,
}));
vi.mock('@app/help-center/search/hc-search-bar', () => ({
  HcSearchBar: () => <button type="button">Search documentation</button>,
}));
vi.mock('@common/ui/dashboard-layout/dashboard-layout', () => ({
  DashboardLayout: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));
vi.mock('@common/ui/dashboard-layout/dashboard-navbar', () => ({
  DashboardNavbar: ({children}: {children: React.ReactNode}) => <header>{children}</header>,
}));
vi.mock('@common/ui/dashboard-layout/dashboard-sidenav', () => ({
  DashboardSidenav: ({children}: {children: React.ReactNode}) => <aside>{children}</aside>,
}));
vi.mock('@common/ui/dashboard-layout/dashboard-content', () => ({
  DashboardContent: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('@common/text-editor/highlight/highlight-code', () => ({
  highlightAllCode: vi.fn(),
}));

afterEach(() => cleanup());

function renderArticle() {
  return render(
    <MemoryRouter initialEntries={['/hc/articles/50/guide']}>
      <Routes>
        <Route path="/hc/articles/:articleId/:slug" element={<ArticlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Help Center article reading experience', () => {
  it('provides a labelled edit link and compact screen table of contents with native disclosure', () => {
    const {container} = renderArticle();

    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe(fixture.title);
    expect(screen.getByRole('link', {name: 'Edit article'}).getAttribute('href')).toContain('/admin/hc/articles/50/edit');

    const disclosure = container.querySelector('details');
    expect(disclosure).not.toBeNull();
    expect(disclosure?.className).toContain('xl:hidden');
    expect(within(disclosure as HTMLElement).getByText('On this page')).toBeTruthy();
    expect(within(disclosure as HTMLElement).getByRole('link', {name: 'Shipping'}).getAttribute('href')).toBe('#shipping');
    const content = container.querySelector('.max-w-3xl');
    expect(content?.className).toContain('sm:px-24');
    expect(container.querySelector('h1')?.className).toContain('break-words');
  });

  it('turns standalone article images into accessible links without nesting existing links', () => {
    const {container} = renderArticle();

    const image = screen.getByAltText('Shipping diagram');
    const preview = image.closest('a');
    expect(preview?.getAttribute('href')).toContain('/diagram.png');
    expect(preview?.getAttribute('target')).toBe('_blank');
    expect(preview?.getAttribute('rel')).toContain('noopener');
    expect(preview?.getAttribute('aria-label')).toBe('Shipping diagram');
    expect(container.querySelector('.article-body')?.className).toContain('[&_pre]:overflow-x-auto');
  });
});

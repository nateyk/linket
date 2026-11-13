import {ArticleLink} from '@app/help-center/articles/article-link';
import {ArticlePath} from '@app/help-center/articles/article-path';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {HcSearchBar} from '@app/help-center/search/hc-search-bar';
import searchImage from '@app/help-center/search/search.svg';
import {useSearchTermLogger} from '@app/help-center/search/use-search-term-logger';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Trans} from '@ui/i18n/trans';
import {ArticleIcon} from '@ui/icons/material/Article';
import {IllustratedMessage} from '@ui/images/illustrated-message';
import {SvgImage} from '@ui/images/svg-image';
import {Link, useParams} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const searchLogger = useSearchTermLogger();
  const {query: searchTerm} = useParams();

  const query = useSuspenseQuery({
    ...helpCenterQueries.articles.search(
      {query: searchTerm, perPage: '30'},
      r => {
        searchLogger.log({
          term: r.query,
          results: r.pagination.data,
          categoryId: r.categoryIds?.[0],
        });
      },
    ),
  });
  const results = query.data.pagination.data;
  const count =
    'total' in query.data.pagination &&
    typeof query.data.pagination.total === 'number'
      ? query.data.pagination.total
      : results.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar menuPosition="header" color="bg">
        <HcSearchBar />
      </Navbar>
      <main className="container mx-auto w-full max-w-5xl px-16 pb-64 sm:px-24">
        <Breadcrumb size="sm" className="mb-24 mt-24 sm:mt-34">
          <BreadcrumbItem onSelected={() => navigate('/hc')}>
            <Trans message="Help center" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Trans message="Search" />
          </BreadcrumbItem>
        </Breadcrumb>

        <header className="mb-24 min-w-0 sm:mb-32">
          <h1 id="hc-search-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <Trans message="Search" />
          </h1>
          <p className="mt-8 break-words text-sm text-muted-foreground" role="status">
            <Trans
              message={'Showing :count results for ":query"'}
              values={{count, query: query.data.query}}
            />
          </p>
        </header>

        {results.length === 0 ? (
          <div className="rounded-panel border border-divider-lighter px-16 py-40 sm:py-48">
            <IllustratedMessage
              image={<SvgImage src={searchImage} />}
              title={<Trans message="No articles match your search query" />}
              action={
                <Link
                  to="/hc"
                  className="inline-flex min-h-44 items-center rounded-panel px-16 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Trans message="Help center" />
                </Link>
              }
            />
          </div>
        ) : (
          <ul role="list" aria-labelledby="hc-search-title" className="space-y-12 sm:space-y-16">
            {results.map(article => (
              <li
                key={article.id}
                className="flex min-w-0 items-start gap-12 rounded-panel border border-divider-lighter bg-background p-16 transition-colors hover:bg-hover focus-within:border-primary/50 sm:gap-16 sm:p-20"
              >
                <ArticleIcon className="mt-4 flex-shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <h2 className="mb-6 break-words text-base font-semibold leading-snug sm:text-lg">
                    <ArticleLink
                      article={article}
                      className="rounded-sm text-main underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      onClick={() => searchLogger.updateLastSearch({clickedArticle: true})}
                    />
                  </h2>
                  <ArticlePath
                    path={article.path}
                    className="break-words text-sm leading-relaxed text-muted-foreground"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

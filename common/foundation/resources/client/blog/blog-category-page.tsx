import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {PaginationControls} from '@common/ui/navigation/pagination-controls';
import {useSuspenseQuery} from '@tanstack/react-query';
import {SearchIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {BlogArticleCard} from './components/blog-article-card';
import {blogCategoryOptions, blogPaginationResponse} from './blog-queries';

export function Component() {
  const {slug} = useParams();
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || undefined;
  const {data} = useSuspenseQuery(blogCategoryOptions(slug!, page));
  const {category, articles} = data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>{category.name}</StaticPageTitle>
      <Helmet>
        <meta
          name="description"
          content={category.description || `Articles in ${category.name}.`}
        />
      </Helmet>
      <Header />
      <div className="border-b bg-muted/50">
        <div className="mx-auto w-full max-w-3xl px-6 py-12 text-center">
          <nav className="mb-2 text-sm text-muted-foreground">
            <Link to="/blog" className="hover:underline">
              <Trans message="Blog" />
            </Link>
            <span className="mx-1">/</span>
            <span>{category.name}</span>
          </nav>
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mx-auto max-w-2xl text-muted-foreground text-balance">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-14">
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => (
              <BlogArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <SearchIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No articles in this category" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Check back soon for new posts." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        )}
        <div className="mt-14">
          <PaginationControls
            pagination={blogPaginationResponse(articles, data.pagination)}
            scrollToTop
          />
        </div>
      </div>
      <Footer
        className="mx-auto w-full max-w-7xl"
        padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
      />
    </div>
  );
}

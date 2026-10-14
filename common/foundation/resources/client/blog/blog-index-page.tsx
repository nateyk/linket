import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {MixedImage} from '@ui/images/mixed-image';
import {PaginationControls} from '@common/ui/navigation/pagination-controls';
import {useSuspenseQuery} from '@tanstack/react-query';
import {ArrowRightIcon, ClockIcon, SearchIcon} from 'lucide-react';
import {Link, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {BlogArticleCard} from './components/blog-article-card';
import {BlogArticleListItem, blogIndexOptions, blogPaginationResponse} from './blog-queries';

export function Component() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const page = Number(searchParams.get('page')) || undefined;
  const {data} = useSuspenseQuery(blogIndexOptions(search, page));
  const [latest, ...rest] = data.data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>
        <Trans message="Blog" />
      </StaticPageTitle>
      <Helmet>
        <meta
          name="description"
          content="Insights, guides, and product updates to help you get the most out of Linket."
        />
      </Helmet>
      <Header />
      <div className="border-b bg-muted/50">
        <div className="mx-auto w-full max-w-3xl px-6 py-14 text-center md:py-20">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            <Trans message="Blog" />
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
            <Trans message="Insights, guides, and product updates to help you get the most out of Linket" />
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-14">
        {data.data.length > 0 ? (
          <div className="flex flex-col gap-14">
            {!search && !page && latest && (
              <FeaturedArticle article={latest} />
            )}

            {(search || page ? data.data.length > 0 : rest.length > 0) && (
              <section>
                {!search && !page && (
                  <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    <Trans message="Latest articles" />
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(search || page ? data.data : rest).map(article => (
                    <BlogArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <SearchIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No articles yet" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="We couldn't find any posts. Please check back soon." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        )}
        <div className="mt-14">
          <PaginationControls
            pagination={blogPaginationResponse(data.data, data.pagination)}
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

function FeaturedArticle({article}: {article: BlogArticleListItem}) {
  return (
    <section>
      <Link
        to={`/blog/${article.slug}`}
        className="group grid gap-6 md:grid-cols-2 md:items-center"
      >
        {article.cover_image ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-card bg-muted ring-1 ring-foreground/10">
            <MixedImage
              src={article.cover_image}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="relative aspect-video w-full rounded-card bg-muted ring-1 ring-foreground/10" />
        )}
        <div className="flex flex-col">
          {article.category && (
            <span className="mb-3 text-sm font-medium text-primary">
              {article.category.name}
            </span>
          )}
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground group-hover:underline md:text-3xl">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="mb-4 text-muted-foreground">{article.excerpt}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {article.published_at && (
              <span>
                {new Date(article.published_at).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              <Trans
                message=":count min read"
                values={{count: article.reading_time_minutes}}
              />
            </span>
          </div>
          <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
            <Trans message="Read article" />
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
          </div>
        </div>
      </Link>
    </section>
  );
}

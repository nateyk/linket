import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {PaginationControls} from '@common/ui/navigation/pagination-controls';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {ArrowRightIcon, SearchIcon} from 'lucide-react';
import {Link, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {BlogArticleCard} from './components/blog-article-card';
import {BlogFeaturedSidebarItem} from './components/blog-featured-sidebar-item';
import {BlogHeroPost} from './components/blog-hero-post';
import {blogIndexOptions, blogPaginationResponse} from './blog-queries';

export function Component() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const page = Number(searchParams.get('page')) || undefined;
  const {data} = useSuspenseQuery(blogIndexOptions(search, page));

  // Page 1 (no filters) gets the editorial layout: newest post as hero,
  // the next few as a featured sidebar, the rest in the recent grid.
  const showEditorial = !search && !page && data.data.length > 0;
  const [heroPost, ...rest] = data.data;
  const sidebarPosts = showEditorial ? rest.slice(0, 3) : [];
  const recentPosts = showEditorial ? rest.slice(sidebarPosts.length) : data.data;

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
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 pt-10 md:pt-14">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
            <Trans message="Blog" />
          </h1>
          <p className="text-muted-foreground text-balance">
            <Trans message="Insights, guides, and product updates to help you get the most out of Linket" />
          </p>
        </div>

        {data.data.length > 0 ? (
          <div className="flex flex-col gap-14">
            {showEditorial && heroPost && (
              <section className="grid gap-6 lg:grid-cols-3">
                <BlogHeroPost
                  article={heroPost}
                  className={sidebarPosts.length ? 'lg:col-span-2' : undefined}
                />
                {sidebarPosts.length > 0 && (
                  <Card.Root className="h-fit">
                    <Card.Header>
                      <Card.Title>
                        <Trans message="Featured posts" />
                      </Card.Title>
                    </Card.Header>
                    <Card.Content className="flex flex-col gap-4">
                      {sidebarPosts.map(article => (
                        <BlogFeaturedSidebarItem
                          key={article.id}
                          article={article}
                        />
                      ))}
                    </Card.Content>
                  </Card.Root>
                )}
              </section>
            )}

            {recentPosts.length > 0 && (
              <section>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold tracking-tight">
                    <Trans message="Recent Posts" />
                  </h2>
                  <Button
                    render={<Link to="/blog" />}
                    variant="outline"
                    size="sm"
                  >
                    <Trans message="All Posts" />
                    <ArrowRightIcon />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recentPosts.map(article => (
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

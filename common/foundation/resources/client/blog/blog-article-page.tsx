import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Trans} from '@ui/i18n/trans';
import {MixedImage} from '@ui/images/mixed-image';
import {useSuspenseQuery} from '@tanstack/react-query';
import {CalendarIcon, ClockIcon, EyeIcon} from 'lucide-react';
import {Link, useParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {BlogArticleBody} from './components/blog-article-body';
import {BlogArticleJsonLd} from './components/blog-article-json-ld';
import {RelatedBlogPosts} from './components/related-blog-posts';
import {blogArticleOptions} from './blog-queries';

export function Component() {
  const {slug} = useParams();
  const {data} = useSuspenseQuery(blogArticleOptions(slug!));
  const {article, relatedArticles} = data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>{article.title}</StaticPageTitle>
      <Helmet>
        <meta name="description" content={article.meta_description || article.excerpt} />
      </Helmet>
      <BlogArticleJsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.meta_description || article.excerpt,
          datePublished: article.published_at,
          image: article.cover_image ?? undefined,
          author: article.author
            ? {'@type': 'Person', name: article.author.name}
            : undefined,
        }}
      />
      <Header />
      <article className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10">
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          <div>
            <nav className="mb-3 text-sm text-muted-foreground">
              <Link to="/blog" className="hover:underline">
                <Trans message="Blog" />
              </Link>
              {article.category && (
                <>
                  <span className="mx-1">/</span>
                  <Link
                    to={`/blog/categories/${article.category.slug}`}
                    className="hover:underline"
                  >
                    {article.category.name}
                  </Link>
                </>
              )}
            </nav>
            <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {article.title}
            </h1>
            <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {article.author && <span>{article.author.name}</span>}
              {article.published_at && (
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="size-4" />
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
              <span className="flex items-center gap-1.5">
                <EyeIcon className="size-4" />
                <Trans
                  message=":count views"
                  values={{count: article.views}}
                />
              </span>
            </div>
            {article.cover_image && (
              <div className="mb-8 aspect-video w-full overflow-hidden rounded-card bg-muted ring-1 ring-foreground/10">
                <MixedImage
                  src={article.cover_image}
                  className="size-full object-cover"
                />
              </div>
            )}
            <BlogArticleBody html={article.body ?? ''} />
          </div>
          <aside className="hidden xl:block">
            <RelatedBlogPosts articles={relatedArticles} />
          </aside>
        </div>
      </article>
      <Footer
        className="mx-auto w-full max-w-7xl"
        padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
      />
    </div>
  );
}

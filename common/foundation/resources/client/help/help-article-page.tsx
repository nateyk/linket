import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {CalendarIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {HelpSearch} from './components/help-search';
import {ArticleFeedback} from './components/article-feedback';
import {RelatedArticles} from './components/related-articles';
import {HelpArticleBody} from './components/help-article-body';
import {HelpArticleJsonLd} from './components/help-article-json-ld';
import {helpArticleOptions} from './help-queries';

export function Component() {
  const {slug} = useParams();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const {data} = useSuspenseQuery(helpArticleOptions(slug!));
  const {article, relatedArticles} = data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>{article.title}</StaticPageTitle>
      <Helmet>
        <meta name="description" content={article.short_description} />
      </Helmet>
      <HelpArticleJsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.short_description,
          datePublished: article.created_at,
        }}
      />
      <Header />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10">
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          <div>
            <nav className="mb-3 text-sm text-muted-foreground">
              <Link to="/help" className="hover:underline">
                <Trans message="Help Center" />
              </Link>
              {article.category && (
                <>
                  <span className="mx-1">/</span>
                  <Link
                    to={`/help/categories/${article.category.slug}`}
                    className="hover:underline"
                  >
                    {article.category.name}
                  </Link>
                </>
              )}
            </nav>
            <h1 className="mb-3 text-2xl font-bold md:text-3xl">{article.title}</h1>
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="size-4" />
              {new Date(article.created_at).toLocaleDateString()}
            </div>
          </div>
          <aside className="hidden xl:block">
            <div className="mb-3">
              <HelpSearch defaultValue={search} />
            </div>
            <RelatedArticles articles={relatedArticles} />
          </aside>
        </div>
        {/* The article body flows below the opening row instead of inside the
            grid's left column: a long article in a 1fr column would stretch
            one column far past the fold while the aside floats in dead
            space. */}
        <HelpArticleBody html={article.body ?? ''} />
        <Card.Root className="mt-8 p-6">
          <ArticleFeedback
            slug={article.slug}
            likes={article.likes}
            dislikes={article.dislikes}
          />
        </Card.Root>
      </div>
      <Footer
        className="mx-auto w-full max-w-7xl"
        padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
      />
    </div>
  );
}

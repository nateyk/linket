import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FileTextIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {HelpSearch} from './components/help-search';
import {helpCategoryOptions} from './help-queries';

export function Component() {
  const {slug} = useParams();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const {data} = useSuspenseQuery(helpCategoryOptions(slug!));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>{data.category.name}</StaticPageTitle>
      <Helmet>
        <meta
          name="description"
          content={`Help articles about ${data.category.name}.`}
        />
      </Helmet>
      <Header />
      <div className="border-b bg-muted/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <nav className="mb-1 text-sm text-muted-foreground">
              <Link to="/help" className="hover:underline">
                <Trans message="Help Center" />
              </Link>
              <span className="mx-1">/</span>
              <span>{data.category.name}</span>
            </nav>
            <h1 className="text-2xl font-bold md:text-3xl">{data.category.name}</h1>
          </div>
          <HelpSearch defaultValue={search} className="w-full md:w-80" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10">
        {data.articles.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.articles.map(article => (
              <Link key={article.id} to={`/help/articles/${article.slug}`}>
                <Card.Root className="p-4 transition-colors hover:bg-muted/50">
                  <h2 className="flex items-center gap-2 text-base font-medium">
                    <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                    {article.title}
                  </h2>
                </Card.Root>
              </Link>
            ))}
          </div>
        ) : (
          <Card.Root className="p-10 text-center">
            <span className="text-muted-foreground">
              <Trans message="No articles found" />
            </span>
          </Card.Root>
        )}
      </div>
      <Footer
        className="mx-auto max-w-7xl"
        padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
      />
    </div>
  );
}

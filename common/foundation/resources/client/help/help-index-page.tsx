import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Link} from 'react-router';
import {StaticPageTitle} from '../seo/static-page-title';
import {HelpCategoryCard} from './components/help-category-card';
import {HelpSearch} from './components/help-search';
import {helpIndexOptions} from './help-queries';
import {useSearchParams} from 'react-router';

export function Component() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const {data} = useSuspenseQuery(helpIndexOptions(search));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>
        <Trans message="Help Center" />
      </StaticPageTitle>
      <Header />
      <div className="border-b bg-muted/50">
        <div className="mx-auto w-full max-w-3xl px-6 py-12 text-center md:py-16">
          <h1 className="mb-6 text-3xl font-bold md:text-4xl">
            <Trans message="Hi, how can we help?" />
          </h1>
          <HelpSearch defaultValue={search} autoFocus={!!search} />
          {data.commonCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">
                <Trans message="Common topics:" />
              </span>
              {data.commonCategories.map(category => (
                <Link key={category.id} to={`/help/categories/${category.slug}`}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    {category.name}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {data.categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {data.categories.map(category => (
              <HelpCategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <Card.Root className="p-10 text-center">
            <span className="text-muted-foreground">
              <Trans message="No data found" />
            </span>
          </Card.Root>
        )}
      </div>
      <Footer />
    </div>
  );
}

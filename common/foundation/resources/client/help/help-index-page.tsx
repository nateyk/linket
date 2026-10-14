import {Footer} from '@common/ui/footer/footer';
import {Header} from '@common/ui/landing-page/header/header';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {SearchIcon} from 'lucide-react';
import {Link, useSearchParams} from 'react-router';
import {Helmet} from '../seo/helmet';
import {StaticPageTitle} from '../seo/static-page-title';
import {HelpCategoryCard} from './components/help-category-card';
import {HelpFaq} from './components/help-faq';
import {HelpSearch} from './components/help-search';
import {helpIndexOptions} from './help-queries';

export function Component() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') ?? undefined;
  const {data} = useSuspenseQuery(helpIndexOptions(search));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StaticPageTitle>
        <Trans message="Help Center" />
      </StaticPageTitle>
      <Helmet>
        <meta
          name="description"
          content="Browse help articles and guides to get the most out of Linket."
        />
      </Helmet>
      <Header />
      <div className="border-b bg-muted/50">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center md:py-24">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-balance md:text-5xl">
            <Trans message="How can we help you today?" />
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
            <Trans message="Search for a topic or question, or browse our guides below" />
          </p>
          <HelpSearch defaultValue={search} autoFocus={!!search} size="lg" />
          {data.commonCategories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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

      {!search && <HelpFaq categories={data.categories} />}

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-14">
        {data.categories.length > 0 ? (
          <>
            <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              <Trans message="Browse by category" />
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {data.categories.map(category => (
                <HelpCategoryCard key={category.id} category={category} />
              ))}
            </div>
          </>
        ) : (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <SearchIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No help articles yet" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="We couldn't find any help content. Please check back soon." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        )}
      </div>
      <Footer
        className="mx-auto w-full max-w-7xl"
        padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
      />
    </div>
  );
}

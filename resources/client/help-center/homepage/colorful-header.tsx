import {getArticleLink} from '@app/help-center/articles/article-link';
import {ArticlePath} from '@app/help-center/articles/article-path';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {HcPublicNavbar} from '@app/help-center/homepage/hc-public-navbar';
import {LandingPagePattern} from '@app/help-center/homepage/landing-page-pattern';
import {useLandingPageHeaderBackground} from '@app/help-center/homepage/use-landing-page-header-background';
import {useSearchTermLogger} from '@app/help-center/search/use-search-term-logger';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Card} from '@shadcn/card/card';
import {useQuery} from '@tanstack/react-query';
import {ComboBox} from '@ui/forms/combobox/combobox';
import {Item} from '@ui/forms/listbox/item';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SearchIcon} from '@ui/icons/material/Search';
import {useSettings} from '@ui/settings/use-settings';
import {useMemo, useState} from 'react';

const DEFAULT_HC_PATTERN = 'images/hc-header-pattern.svg';

export function ColorfulHeader() {
  const {hcLanding} = useSettings();
  const config = hcLanding?.header;
  const {trans} = useTrans();
  const customBackground = useLandingPageHeaderBackground();

  const patternImageStyle = useMemo(() => {
    if (customBackground?.backgroundImage) {
      return customBackground;
    }
    return {
      backgroundImage: `url(${DEFAULT_HC_PATTERN})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center top',
    };
  }, [customBackground]);

  return (
    <section className="relative isolate overflow-hidden bg-primary pb-12 text-primary-foreground md:pb-16">
      <LandingPagePattern blur />
      <div
        className="pointer-events-none absolute inset-0 opacity-35 mix-blend-soft-light"
        style={patternImageStyle}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/55 via-primary/80 to-primary"
        aria-hidden
      />
      <HcPublicNavbar
        className="relative z-10 mx-auto max-w-6xl"
        logoColor="light"
        primaryButtonColor="white"
        tone="onPrimary"
      />
      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-6 text-center md:px-12 md:pt-10 lg:max-w-4xl">
        <h1 className="text-3xl font-semibold md:text-5xl">
          {config?.title ? (
            <Trans message={config.title} />
          ) : (
            <Trans message="How can we help you?" />
          )}
        </h1>
        <p className="mt-3 text-base text-primary-foreground/85 md:mt-4 md:text-xl">
          {config?.subtitle ? (
            <Trans message={config.subtitle} />
          ) : (
            <Trans message="Ask Questions. Browse Articles. Find Answers." />
          )}
        </p>
        <div className="light mx-auto mt-8 max-w-2xl text-left text-foreground">
          <Card className="gap-0 py-0 shadow-md ring-border">
            <SearchField
              placeholder={
                config?.placeholder
                  ? trans(message(config.placeholder))
                  : undefined
              }
            />
          </Card>
        </div>
      </div>
    </section>
  );
}

interface SearchFieldProps {
  placeholder?: string;
}
function SearchField({placeholder}: SearchFieldProps) {
  const [query, setQuery] = useState('');
  const {trans} = useTrans();
  const searchLogger = useSearchTermLogger();
  const {data, isLoading} = useQuery(
    helpCenterQueries.articles.search({query}, r => {
      searchLogger.log({
        term: r.query,
        results: r.pagination.data,
        categoryId: r.categoryIds?.[0],
      });
    }),
  );
  const navigate = useNavigate();

  return (
    <ComboBox
      inputValue={query}
      onInputValueChange={setQuery}
      isAsync
      isLoading={isLoading}
      items={data?.pagination.data ?? []}
      clearInputOnItemSelection
      hideEndAdornment
      placeholder={
        placeholder ?? trans(message('Enter your question or keyword here'))
      }
      startAdornment={
        <SearchIcon className="ml-2 size-5 text-muted-foreground" />
      }
      className="relative w-full"
      inputClassName="min-h-15 border-0 bg-card shadow-none ring-0"
      inputRing="ring-0"
      inputRadius="rounded-card"
      size="lg"
      selectionMode="none"
    >
      {result => (
        <Item
          padding="py-8 px-12"
          radius="rounded"
          key={result.id}
          value={result.id}
          onSelected={() => {
            searchLogger.updateLastSearch({clickedArticle: true});
            navigate(getArticleLink(result));
          }}
          description={<ArticlePath path={result.path} />}
          textLabel={result.title}
        >
          {result.title}
        </Item>
      )}
    </ComboBox>
  );
}

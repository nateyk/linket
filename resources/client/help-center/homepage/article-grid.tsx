import {ArticleLink} from '@app/help-center/articles/article-link';
import {CategoryLink} from '@app/help-center/categories/category-link';
import {HcCategoryImage} from '@app/help-center/hc-category-icons';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {LandingPageDataCategory} from '@app/help-center/homepage/hc-landing-page-data';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ArrowRightAltIcon} from '@ui/icons/material/ArrowRightAlt';
import {ChevronRightIcon} from 'lucide-react';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {Fragment} from 'react';

export function ArticleGrid() {
  const {hcLanding} = useSettings();
  const query = useSuspenseQuery(
    helpCenterQueries.categories.landingPageData(),
  );

  const variant = hcLanding?.content?.variant ?? 'articleGrid';
  const visibleRoots = query.data.categories.filter(
    category => !category.hide_from_structure,
  );
  const rootCategories =
    variant === 'multiProduct' ? visibleRoots : visibleRoots.slice(0, 1);

  if (rootCategories.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 md:space-y-16">
      {rootCategories.map(category => (
        <div key={category.id}>
          {!category.hide_from_structure ? (
            <ParentCategoryHeader category={category} />
          ) : null}
          <CategoriesGrid categories={category.sections ?? []} />
        </div>
      ))}
    </div>
  );
}

type ParentCategoryHeaderProps = {
  category: LandingPageDataCategory;
};
function ParentCategoryHeader({category}: ParentCategoryHeaderProps) {
  if (!category.name) {
    return null;
  }
  return (
    <Fragment>
      <h2
        className={clsx(
          'mb-8 flex items-center gap-3 text-2xl font-bold md:text-3xl',
          category.image && 'mb-6',
        )}
      >
        {category.image && (
          <HcCategoryImage src={category.image} className="h-30 w-30 rounded" />
        )}
        <CategoryLink category={category} />
      </h2>
      {category.description && (
        <p className="mt-4 text-sm text-muted-foreground">
          {category.description}
        </p>
      )}
    </Fragment>
  );
}

type CategoriesGridProps = {
  categories: LandingPageDataCategory[];
};
function CategoriesGrid({categories}: CategoriesGridProps) {
  const {hcLanding} = useSettings();
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3 md:gap-x-16 md:gap-y-16">
      {categories.map(category => {
        if (
          hcLanding?.hide_small_categories &&
          (category.articles?.length ?? 0) < 2
        ) {
          return null;
        }
        return <ArticleGridItem key={category.id} category={category} />;
      })}
    </div>
  );
}

interface ArticleGridItemProps {
  category: LandingPageDataCategory;
}
function ArticleGridItem({category}: ArticleGridItemProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          {category.image ? (
            <HcCategoryImage src={category.image} iconSize="w-20 h-20" />
          ) : null}
          <h3 className="text-lg font-semibold">
            <CategoryLink category={category} />
          </h3>
        </div>
        {category.description ? (
          <div className="mt-1 text-sm text-muted-foreground">
            {category.description}
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        {(category.articles ?? []).map(article => (
          <ArticleLink
            key={article.id}
            article={article}
            section={category}
            className="group flex items-center gap-3 border-b border-border py-3 text-sm last:border-b-0 md:text-base"
          >
            <span className="mr-auto block min-w-0 truncate">
              {article.title}
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </ArticleLink>
        ))}
      </div>

      {(category.articles?.length ?? 0) < category.articles_count && (
        <CategoryLink
          category={category}
          className="mt-auto flex items-center gap-4 text-base font-semibold"
        >
          <Trans
            message="See all :count articles"
            values={{count: category.articles_count}}
          />
          <ArrowRightAltIcon />
        </CategoryLink>
      )}
    </div>
  );
}

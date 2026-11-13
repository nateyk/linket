import {getCategoryLink} from '@app/help-center/categories/category-link';
import {HcCategoryImage} from '@app/help-center/hc-category-icons';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {LandingPageDataCategory} from '@app/help-center/homepage/hc-landing-page-data';
import {useSuspenseQuery} from '@tanstack/react-query';
import {KeyboardArrowRightIcon} from '@ui/icons/material/KeyboardArrowRight';
import clsx from 'clsx';
import {Fragment} from 'react';
import {Link} from 'react-router';

export function MultiProductArticleGrid() {
  const query = useSuspenseQuery(
    helpCenterQueries.categories.landingPageData(),
  );
  return (
    <div className="grid grid-cols-1 gap-20 md:grid-cols-2">
      {query.data.categories.map(category => (
        <CategoryRow key={category.id} category={category} />
      ))}
    </div>
  );
}

interface CategoryRowProps {
  category: LandingPageDataCategory;
}

function CategoryRow({category}: CategoryRowProps) {
  const sections = category.sections
    .filter(section => section.articles?.length)
    .slice(0, 3);

  return (
    <Fragment>
      <Link
        to={getCategoryLink(category)}
        className="block rounded-xl border p-24 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex items-center gap-10">
          {category.image && (
            <HcCategoryImage
              className="h-10 w-10 flex-shrink-0"
              radius="rounded-md"
              src={category.image}
            />
          )}
          <h2 className="min-w-0 break-words text-[21px] font-medium">
            {category.name}
          </h2>
        </div>
        {category.description && (
          <p className="mt-10 text-sm">{category.description}</p>
        )}
      </Link>
      {sections.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          {sections.map((section, index) => (
            <SectionItem
              key={section.id}
              section={section}
              className={index !== sections.length - 1 ? 'border-b' : undefined}
            />
          ))}
        </div>
      )}
    </Fragment>
  );
}

interface ArticleRowProps {
  className?: string;
  section: LandingPageDataCategory;
}

function SectionItem({className, section}: ArticleRowProps) {
  return (
    <Link
      to={getCategoryLink(section)}
      className={clsx(
        'flex items-center gap-12 p-12 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        className,
      )}
    >
      <span className="block min-w-0 flex-auto break-words text-sm">
        {section.name}
      </span>
      <KeyboardArrowRightIcon
        size="sm"
        className="ml-auto flex-shrink-0 text-muted-foreground"
      />
    </Link>
  );
}

import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {ChevronRightIcon, FileTextIcon} from 'lucide-react';
import {Link} from 'react-router';
import {HelpCategory} from '../help-queries';

interface Props {
  category: HelpCategory;
}

export function HelpCategoryCard({category}: Props) {
  return (
    <Card.Root className="group h-full gap-0 py-0 transition-shadow hover:shadow-sm">
      <div className="flex flex-col flex-1 p-6">
        <Link
          to={`/help/categories/${category.slug}`}
          className="hover:underline"
        >
          <Card.Title className="flex items-center gap-2 text-lg">
            {category.name}
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              <Trans
                message=":count articles"
                values={{count: category.articles?.length ?? 0}}
              />
            </span>
          </Card.Title>
        </Link>
        <div className="my-4 flex flex-1 flex-col gap-1">
          {category.articles?.map(article => (
            <Link
              key={article.id}
              to={`/help/articles/${article.slug}`}
              className="group/link flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <FileTextIcon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{article.title}</span>
              <ChevronRightIcon className="size-4 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
            </Link>
          ))}
        </div>
        <Link
          to={`/help/categories/${category.slug}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Trans message="View all" />
          <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card.Root>
  );
}

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
    <Card.Root className="flex h-full flex-col p-6">
      <Link to={`/help/categories/${category.slug}`} className="hover:underline">
        <Card.Title className="text-lg">{category.name}</Card.Title>
      </Link>
      <div className="my-4 flex flex-1 flex-col gap-1">
        {category.articles?.map(article => (
          <Link
            key={article.id}
            to={`/help/articles/${article.slug}`}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FileTextIcon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{article.title}</span>
            <ChevronRightIcon className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
      <Link
        to={`/help/categories/${category.slug}`}
        className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <Trans message="View more" />
        <ChevronRightIcon className="size-4" />
      </Link>
    </Card.Root>
  );
}

import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {FileTextIcon} from 'lucide-react';
import {Link} from 'react-router';
import {HelpArticleListItem} from '../help-queries';

interface Props {
  articles: HelpArticleListItem[];
}

export function RelatedArticles({articles}: Props) {
  if (!articles.length) {
    return null;
  }
  return (
    <Card.Root className="sticky top-6 p-2">
      <h2 className="mb-3 px-3 pt-2 font-medium">
        <Trans message="Related articles" />
      </h2>
      <nav className="flex flex-col">
        {articles.map(article => (
          <Link
            key={article.id}
            to={`/help/articles/${article.slug}`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FileTextIcon className="size-4 shrink-0" />
            <span className="line-clamp-2">{article.title}</span>
          </Link>
        ))}
      </nav>
    </Card.Root>
  );
}

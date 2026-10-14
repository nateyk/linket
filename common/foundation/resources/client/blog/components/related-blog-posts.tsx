import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {NewspaperIcon} from 'lucide-react';
import {Link} from 'react-router';
import {BlogArticleListItem} from '../blog-queries';

interface Props {
  articles: BlogArticleListItem[];
}

export function RelatedBlogPosts({articles}: Props) {
  if (!articles.length) {
    return null;
  }
  return (
    <Card.Root className="sticky top-6 p-2">
      <h5 className="mb-3 px-3 pt-2 font-medium">
        <Trans message="Related posts" />
      </h5>
      <nav className="flex flex-col">
        {articles.map(article => (
          <Link
            key={article.id}
            to={`/blog/${article.slug}`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <NewspaperIcon className="size-4 shrink-0" />
            <span className="line-clamp-2">{article.title}</span>
          </Link>
        ))}
      </nav>
    </Card.Root>
  );
}

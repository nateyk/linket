import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {MixedImage} from '@ui/images/mixed-image';
import {CalendarIcon, ClockIcon} from 'lucide-react';
import {Link} from 'react-router';
import {BlogArticleListItem} from '../blog-queries';

interface Props {
  article: BlogArticleListItem;
}

export function BlogArticleCard({article}: Props) {
  return (
    <Card.Root className="group h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-sm">
      <Link
        to={`/blog/${article.slug}`}
        className="flex flex-1 flex-col focus-visible:outline-none"
      >
        {article.cover_image ? (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <MixedImage
              src={article.cover_image}
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-5">
          {article.category && (
            <div className="mb-2">
              <span className="text-xs font-medium text-primary">
                {article.category.name}
              </span>
            </div>
          )}
          <Card.Title className="mb-2 line-clamp-2 text-lg group-hover:underline">
            {article.title}
          </Card.Title>
          {article.excerpt && (
            <Card.Description className="mb-4 line-clamp-3">
              {article.excerpt}
            </Card.Description>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {article.published_at && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {new Date(article.published_at).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              <Trans
                message=":count min read"
                values={{count: article.reading_time_minutes}}
              />
            </span>
          </div>
        </div>
      </Link>
    </Card.Root>
  );
}

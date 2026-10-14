import {Trans} from '@ui/i18n/trans';
import {MixedImage} from '@ui/images/mixed-image';
import {ClockIcon} from 'lucide-react';
import {Link} from 'react-router';
import {BlogArticleListItem} from '../blog-queries';

interface Props {
  article: BlogArticleListItem;
}

export function BlogFeaturedSidebarItem({article}: Props) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group flex items-center gap-4 rounded-card-sm py-1 focus-visible:outline-none"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-card-sm bg-muted">
        {article.cover_image ? (
          <MixedImage
            src={article.cover_image}
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="line-clamp-2 text-sm font-medium group-hover:underline">
          {article.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          <Trans
            message=":count min read"
            values={{count: article.reading_time_minutes}}
          />
        </span>
      </div>
    </Link>
  );
}

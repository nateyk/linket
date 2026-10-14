import {Badge} from '@shadcn/badge/badge';
import {cn} from '@ui/utils/cn';
import {MixedImage} from '@ui/images/mixed-image';
import {Link} from 'react-router';
import {BlogArticleListItem} from '../blog-queries';

interface Props {
  article: BlogArticleListItem;
  className?: string;
}

export function BlogHeroPost({article, className}: Props) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-card bg-muted ring-1 ring-foreground/10 focus-visible:outline-none',
        className,
      )}
    >
      <div className="relative aspect-video w-full">
        {article.cover_image ? (
          <MixedImage
            src={article.cover_image}
            className="size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-6">
          {article.category && (
            <Badge className="bg-white/20 text-white backdrop-blur-sm">
              {article.category.name}
            </Badge>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-white text-balance md:text-3xl">
            {article.title}
          </h2>
        </div>
      </div>
    </Link>
  );
}

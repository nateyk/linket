import {Card} from '@shadcn/card/card';
import {MixedImage} from '@ui/images/mixed-image';
import {Link} from 'react-router';
import {BlogArticleListItem} from '../blog-queries';
import {BlogArticleMeta} from './blog-article-meta';

interface Props {
  article: BlogArticleListItem;
}

export function BlogArticleCard({article}: Props) {
  return (
    <Card.Root className="group h-full gap-0 overflow-hidden py-0 transition-opacity hover:opacity-80">
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
        <div className="flex flex-1 flex-col gap-2 p-5">
          <Card.Title className="line-clamp-2 text-lg">
            {article.title}
          </Card.Title>
          {article.excerpt && (
            <Card.Description className="line-clamp-2">
              {article.excerpt}
            </Card.Description>
          )}
          <div className="mt-auto pt-2">
            <BlogArticleMeta article={article} />
          </div>
        </div>
      </Link>
    </Card.Root>
  );
}

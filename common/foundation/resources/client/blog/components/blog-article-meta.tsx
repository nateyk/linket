import {Trans} from '@ui/i18n/trans';
import {BlogArticleListItem} from '../blog-queries';

interface Props {
  article: BlogArticleListItem;
}

/**
 * Card meta row: category • date • read time.
 * Separated from the card so the hero/sidebar can reuse the pieces.
 */
export function BlogArticleMeta({article}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {article.category && (
        <span className="font-medium text-primary">
          {article.category.name}
        </span>
      )}
      {article.category && article.published_at && (
        <span aria-hidden="true">•</span>
      )}
      {article.published_at && (
        <span>{new Date(article.published_at).toLocaleDateString()}</span>
      )}
      <span aria-hidden="true">•</span>
      <span>
        <Trans
          message=":count min read"
          values={{count: article.reading_time_minutes}}
        />
      </span>
    </div>
  );
}

import {ArticleDatatableItem} from '@app/help-center/articles/article-datatable/article-datatable-item';
import {ArticlePath} from '@app/help-center/articles/article-path';
import {ColumnConfig} from '@common/datatable/column-config';
import {NameWithAvatar} from '@common/datatable/column-templates/name-with-avatar';
import {TableContext} from '@common/ui/tables/table-context';
import {IconButton} from '@ui/buttons/icon-button';
import {Chip} from '@ui/forms/input-field/chip-field/chip';
import {ChipList} from '@ui/forms/input-field/chip-field/chip-list';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CheckIcon} from '@ui/icons/material/Check';
import {CloseIcon} from '@ui/icons/material/Close';
import {EditIcon} from '@ui/icons/material/Edit';
import clsx from 'clsx';
import {useContext} from 'react';
import {Link} from 'react-router';

export const ArticleDatatableColumns: ColumnConfig<ArticleDatatableItem>[] = [
  {
    key: 'name',
    width: 'flex-3 min-w-50',
    visibleInMode: 'all',
    header: () => <Trans message="Article" />,
    body: article => <ArticleColumn article={article} />,
  },
  {
    key: 'author_id',
    allowsSorting: true,
    width: 'min-w-50',
    visibleInMode: 'all',
    header: () => <Trans message="Owner" />,
    body: article =>
      article.author ? (
        <NameWithAvatar
          image={article.author.image}
          label={article.author.name}
          description={article.author.email}
          avatarCircle
        />
      ) : null,
  },
  {
    key: 'draft',
    allowsSorting: true,
    width: 'w-32 flex-shrink-0',
    header: () => <Trans message="Status" />,
    body: article =>
      !article.draft ? (
        <span className="inline-flex items-center gap-6 rounded-full bg-positive/10 px-8 py-4 text-xs font-medium text-positive">
          <CheckIcon size="xs" aria-hidden="true" />
          <Trans message="Published" />
        </span>
      ) : (
        <span className="inline-flex items-center gap-6 rounded-full bg-chip px-8 py-4 text-xs font-medium text-muted-foreground">
          <CloseIcon size="xs" aria-hidden="true" />
          <Trans message="Draft" />
        </span>
      ),
  },
  {
    key: 'used_by_ai_agent',
    allowsSorting: true,
    width: 'w-32 flex-shrink-0',
    header: () => <Trans message="AI agent" />,
    body: article =>
      article.used_by_ai_agent ? (
        <span className="inline-flex items-center gap-6 text-xs font-medium text-positive">
          <CheckIcon size="xs" aria-hidden="true" />
          <Trans message="Enabled" />
        </span>
      ) : (
        <span className="inline-flex items-center gap-6 text-xs text-muted-foreground">
          <CloseIcon size="xs" aria-hidden="true" />
          <Trans message="Disabled" />
        </span>
      ),
  },
  {
    key: 'updated_at',
    allowsSorting: true,
    width: 'w-24',
    header: () => <Trans message="Last updated" />,
    body: article => (
      <time>
        <FormattedDate date={article.updated_at} />
      </time>
    ),
  },
  {
    key: 'actions',
    header: () => <Trans message="Actions" />,
    width: 'w-10.5 flex-shrink-0',
    hideHeader: true,
    align: 'end',
    visibleInMode: 'all',
    body: article => <EditArticleAction article={article} />,
  },
];

function EditArticleAction({article}: {article: ArticleDatatableItem}) {
  const {trans} = useTrans();
  return (
    <IconButton
      size="md"
      elementType={Link}
      to={`${article.id}/edit`}
      aria-label={trans({message: 'Edit article'})}
      className="text-muted-foreground"
    >
      <EditIcon />
    </IconButton>
  );
}

interface ArticleColumnProps {
  article: ArticleDatatableItem;
}
function ArticleColumn({article}: ArticleColumnProps) {
  const {isCollapsedMode} = useContext(TableContext);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-8">
        {article.tags.length ? (
          <ChipList size="xs">
            {article.tags.slice(0, 3).map(tag => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </ChipList>
        ) : null}
        <Link
          to={`${article.id}/edit`}
          className={clsx(
            'rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            isCollapsedMode
              ? 'whitespace-normal'
              : 'overflow-hidden overflow-ellipsis whitespace-nowrap font-medium',
          )}
        >
          {article.title}
        </Link>
      </div>
      {!isCollapsedMode && (
        <div className="mt-4 text-xs">
          <ArticlePath path={article.path} />
        </div>
      )}
    </div>
  );
}

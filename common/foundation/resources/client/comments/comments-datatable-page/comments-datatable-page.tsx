import {commentQueries} from '@common/comments/comment-queries';
import {Commentable} from '@common/comments/commentable';
import {CommentDatatableItem} from '@common/comments/comments-datatable-page/comment-datatable-item';
import {CommentsDatatableFilters} from '@common/comments/comments-datatable-page/comments-datatable-filters';
import {DeleteCommentsButton} from '@common/comments/comments-datatable-page/delete-comments-button';
import {validateCommentsDatatableParams} from '@common/comments/comments-datatable-page/validate-comments-datatable-params';
import {GlobalLoadingProgress} from '@common/core/global-loading-progress';
import {DataTableHeader} from '@common/datatable/data-table-header';
import {DataTablePaginationFooter} from '@common/datatable/data-table-pagination-footer';
import {useBackendFilterUrlParams} from '@common/datatable/filters/backend-filter-url-params';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {useDatatableSearchParams} from '@common/datatable/filters/utils/use-datatable-search-params';
import {useDatatableQuery} from '@common/datatable/requests/use-datatable-query';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {FullPageLoader} from '@ui/progress/full-page-loader';
import {MessageCircleIcon} from 'lucide-react';
import {Fragment, useCallback, useMemo, useState} from 'react';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';

interface Props {
  hideTitle?: boolean;
  commentable?: Commentable;
}

function CommentsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <MessageCircleIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching comments" />
          ) : (
            <Trans message="No comments have been created yet" />
          )}
        </Empty.Title>
        {isFiltering ? (
          <Empty.Description>
            <Trans message="Try another search query or different filters." />
          </Empty.Description>
        ) : null}
      </Empty.Header>
    </Empty.Root>
  );
}

export function Component({hideTitle, commentable}: Props) {
  const filters = useMemo(() => {
    return CommentsDatatableFilters.filter(
      f => f.key !== 'commentable_id' || !commentable,
    );
  }, [commentable]);
  const {encodedFilters} = useBackendFilterUrlParams(filters);
  const {searchParams, mergeIntoSearchParams, setSearchQuery, isFiltering} =
    useDatatableSearchParams(validateCommentsDatatableParams);
  const [selectedComments, setSelectedComments] = useState<number[]>([]);

  const query = useDatatableQuery(
    commentQueries.index({
      ...searchParams,
      with: 'commentable',
      withCount: 'reports',
      filters: encodedFilters,
      commentable_type: commentable?.model_type,
      commentable_id: commentable?.id,
      loader: 'commentDatatablePage',
    }),
  );

  const toggleComment = useCallback(
    (id: number) => {
      const newValues = [...selectedComments];
      if (!newValues.includes(id)) {
        newValues.push(id);
      } else {
        const index = newValues.indexOf(id);
        newValues.splice(index, 1);
      }
      setSelectedComments(newValues);
    },
    [selectedComments, setSelectedComments],
  );

  const pagination = query.data?.pagination;

  return (
    <div className="flex h-full flex-col">
      <Fragment>
        <StaticPageTitle>
          <Trans message="Comments" />
        </StaticPageTitle>
        <GlobalLoadingProgress query={query} />
        {!hideTitle && (
          <DashboardLayout.SectionHeader>
            <DashboardLayout.SidebarToggle />
            <DashboardLayout.SectionTitle>
              <Trans message="Comments" />
            </DashboardLayout.SectionTitle>
          </DashboardLayout.SectionHeader>
        )}
      </Fragment>
      <div className="flex-auto overflow-y-auto p-3 md:p-6">
        <DataTableHeader
          filters={filters}
          searchValue={searchParams.query}
          onSearchChange={setSearchQuery}
          selectedItems={selectedComments}
          selectedActions={
            <DeleteCommentsButton
              size="sm"
              variant="flat"
              commentIds={selectedComments}
              onDelete={() => setSelectedComments([])}
            />
          }
        />
        <FilterList className="mb-3.5" filters={filters} />

        {query.isLoading ? (
          <FullPageLoader className="min-h-50" />
        ) : (
          <div className="rounded-sm border-x border-t">
            {pagination?.data.map(comment => (
              <CommentDatatableItem
                key={comment.id}
                comment={comment}
                isSelected={selectedComments.includes(comment.id)}
                onToggle={() => toggleComment(comment.id)}
                onDelete={() => setSelectedComments([])}
              />
            ))}
          </div>
        )}

        {(query.isFetched || query.isPlaceholderData) &&
        !pagination?.data.length ? (
          <CommentsEmptyState isFiltering={isFiltering} />
        ) : undefined}

        <DataTablePaginationFooter
          className="mt-2.5"
          query={query as any}
          onPageChange={page => mergeIntoSearchParams({page: page.toString()})}
          onPerPageChange={perPage =>
            mergeIntoSearchParams({perPage: perPage.toString()})
          }
        />
      </div>
    </div>
  );
}

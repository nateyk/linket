import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {useNumberFormatter} from '@ui/i18n/use-number-formatter';
import {cn} from '@ui/utils/cn';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {
  defaultPerPage,
  hasNextPage,
  LengthAwarePaginationMeta,
  PaginatedResource,
  PaginationResponse,
  perPageOptions,
  SimplePaginationMeta,
} from '../http/backend-response/pagination-response';

type DataTablePaginationFooterProps = {
  data:
    | PaginatedResource<unknown>
    | PaginationResponse<unknown>
    | undefined
    | null;
  isLoading?: boolean;
  onPerPageChange?: (perPage: number) => void;
  onPageChange?: (page: number) => void;
  hideIfOnlyOnePage?: boolean;
  className?: string;
};
export function DataTablePaginationFooter({
  data,
  isLoading,
  onPerPageChange,
  onPageChange,
  hideIfOnlyOnePage,
  className,
}: DataTablePaginationFooterProps) {
  const isMobile = useIsMobileMediaQuery();
  const numberFormatter = useNumberFormatter();
  const meta = (data && 'meta' in data ? data.meta : data) as
    | SimplePaginationMeta
    | LengthAwarePaginationMeta;
  const currentPage = meta?.current_page ? +meta.current_page : 1;
  const perPage = meta?.per_page ? +meta.per_page : defaultPerPage;

  if (
    !data ||
    (hideIfOnlyOnePage && currentPage == 1 && !hasNextPage(data as any))
  ) {
    return null;
  }

  const perPageSelect = onPerPageChange ? (
    <Field.Root orientation="horizontal" className="w-auto items-center gap-2">
      <Field.Label className="font-normal text-muted-foreground">
        <Trans message="Items per page" />
      </Field.Label>
      <Select.Root
        disabled={isLoading}
        value={`${perPage}`}
        onValueChange={value => {
          if (value) onPerPageChange(Number(value));
        }}
      >
        <Select.Trigger className="h-8 min-w-16">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {perPageOptions.map(option => (
            <Select.Item key={option.key} value={`${option.key}`}>
              {option.key}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Field.Root>
  ) : null;

  return (
    <div
      className={cn(
        'flex h-12 items-center justify-end gap-5 px-5 select-none',
        className,
      )}
    >
      {meta?.from && meta?.to && 'total' in meta ? (
        <div className="text-sm text-muted-foreground">
          <Trans
            message=":from - :to of :total"
            values={{
              from: meta.from,
              to: meta.to,
              total: numberFormatter.format(meta.total),
            }}
          />
        </div>
      ) : null}
      {!isMobile && perPageSelect}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || currentPage < 2}
          onClick={() => {
            onPageChange?.(currentPage - 1);
          }}
        >
          <Trans message="Previous" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || !hasNextPage(data as any)}
          onClick={() => {
            onPageChange?.(currentPage + 1);
          }}
        >
          <Trans message="Next" />
        </Button>
      </div>
    </div>
  );
}

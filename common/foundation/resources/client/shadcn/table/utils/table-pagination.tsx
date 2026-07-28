import {
  defaultPerPage,
  getNextPageParam,
  getPreviousPageParam,
  PaginatedResource,
  perPageOptions,
} from '@common/http/backend-response/pagination-response';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {RowData, Table} from '@tanstack/react-table';
import {Trans} from '@ui/i18n/trans';
import {useNumberFormatter} from '@ui/i18n/use-number-formatter';
import {cn} from '@ui/utils/cn';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';

type Props<TData extends RowData> = {
  table: Table<TData>;
  disabled?: boolean;
  className?: string;
};

export function TablePagination<TData extends RowData>({
  table,
  disabled,
  className,
}: Props<TData>) {
  const {pageIndex, pageSize} = table.getState().pagination;
  const total = table.getRowCount();
  const from = total ? pageIndex * pageSize + 1 : 0;
  const to = total ? Math.min(from + pageSize - 1, total) : 0;

  // using simple or cursor pagination likely, if there's only one page, whole pagination will be hidden
  const haveTotal = total && total > pageSize;

  const hasNextPage = table.getCanNextPage();
  const hasPreviousPage = table.getCanPreviousPage();

  if (!haveTotal && !hasNextPage && !hasPreviousPage) {
    return null;
  }

  return PaginationLayout({
    className,
    disabled,
    pageSize,
    onPageSizeChange: pageSize => table.setPageSize(pageSize),
    onPrevious: () => table.previousPage(),
    onNext: () => table.nextPage(),
    havePrevious: table.getCanPreviousPage(),
    haveNext: table.getCanNextPage(),
    total: haveTotal ? total : undefined,
    from,
    to,
  });
}

export function BackendPagination({
  response,
  className,
  disabled,
  onPageSizeChange,
  onPageChange,
}: Omit<Props<any>, 'table'> & {
  response: PaginatedResource;
  onPageSizeChange?: PaginationLayoutProps['onPageSizeChange'];
  onPageChange: (page: number) => void;
}) {
  const haveNext = response.links.next != null;
  const havePrevious = response.links.prev != null;
  if (!haveNext && !havePrevious) {
    return null;
  }

  return PaginationLayout({
    className,
    disabled,
    pageSize: response.meta.per_page ?? defaultPerPage,
    onPageSizeChange,
    onPrevious: () => {
      const previous = getPreviousPageParam(response);
      if (previous) {
        onPageChange(Number(previous));
      }
    },
    onNext: () => {
      const next = getNextPageParam(response);
      if (next) {
        onPageChange(Number(next));
      }
    },
    havePrevious,
    haveNext,
  });
}

type PaginationLayoutProps = {
  className?: string;
  disabled?: boolean;
  pageSize: number;
  onPageSizeChange?: (pageSize: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  havePrevious: boolean;
  haveNext: boolean;
  total?: number;
  from?: number;
  to?: number;
};
function PaginationLayout({
  className,
  disabled,
  pageSize,
  onPageSizeChange,
  onPrevious,
  onNext,
  havePrevious,
  haveNext,
  total,
  from,
  to,
}: PaginationLayoutProps) {
  const isMobile = useIsMobileMediaQuery();
  const numberFormatter = useNumberFormatter();

  const perPageSelect = onPageSizeChange ? (
    <Field.Root orientation="horizontal" className="w-auto items-center gap-2">
      <Field.Label className="font-normal text-muted-foreground">
        <Trans message="Items per page" />
      </Field.Label>
      <Select.Root
        disabled={disabled}
        value={`${pageSize}`}
        onValueChange={value => {
          if (value) onPageSizeChange(Number(value));
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
        'flex h-12 items-center justify-end gap-5 select-none',
        className,
      )}
    >
      {total && from && to && (
        <div className="text-sm text-muted-foreground">
          <Trans
            message=":from - :to of :total"
            values={{
              from,
              to,
              total: numberFormatter.format(total),
            }}
          />
        </div>
      )}
      {!isMobile && perPageSelect}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !havePrevious}
          onClick={() => {
            onPrevious();
          }}
        >
          <Trans message="Previous" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !haveNext}
          onClick={() => {
            onNext();
          }}
        >
          <Trans message="Next" />
        </Button>
      </div>
    </div>
  );
}

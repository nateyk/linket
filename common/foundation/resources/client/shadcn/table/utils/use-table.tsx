import {
  defaultPerPage,
  PaginationLinks,
  PaginationMeta,
} from '@common/http/backend-response/pagination-response';
import {SortDescriptor} from '@common/ui/tables/types/sort-descriptor';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowSelectionOptions,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityOptions,
  VisibilityState,
} from '@tanstack/react-table';

type QueryPagination = {
  per_page?: number;
  page?: number;
};

type Props<D extends {id: number | string}> = {
  data: D[];
  columns: ColumnDef<D>[];
  enableRowSelection?: RowSelectionOptions<D>['enableRowSelection'];
  enableMultiRowSelection?: RowSelectionOptions<D>['enableMultiRowSelection'];
  sort: SortDescriptor | null;
  onSortChange: (descriptor: SortDescriptor | null) => void;
  selectedRows?: number[];
  onSelectedRowsChange?: (rows: number[]) => void;
  visibleColumns?: VisibilityState;
  onColumnVisibilityChange?: VisibilityOptions['onColumnVisibilityChange'];
  pagination?: QueryPagination;
  onPaginationChange?: (pagination: QueryPagination) => void;
  isClientSide?: boolean;
  globalFilter?: string;
  response?: {
    meta: PaginationMeta;
    links: PaginationLinks;
  };
};

const defaultRowSelection: RowSelectionState = {};
const defaultSorting: SortingState = [];

export function useTable<D extends {id: number | string}>({
  data,
  columns,
  enableRowSelection,
  enableMultiRowSelection = true,
  sort,
  onSortChange,
  selectedRows,
  onSelectedRowsChange,
  visibleColumns,
  onColumnVisibilityChange,
  isClientSide = false,
  globalFilter,
  pagination,
  onPaginationChange,
  response,
}: Props<D>) {
  const tablePagination = queryPaginationToTablePagination(pagination);
  const sorting = sort ? querySortToTableSort(sort) : defaultSorting;
  const rowSelection = selectedRows
    ? arrayToTableRowSelection(selectedRows)
    : defaultRowSelection;

  const total =
    response?.meta && 'total' in response.meta
      ? response.meta.total
      : undefined;

  return useReactTable({
    data,
    columns,
    enableRowSelection,
    enableMultiRowSelection,
    getRowId: row => `${row.id}`,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isClientSide ? getSortedRowModel() : undefined,
    getPaginationRowModel: isClientSide ? getPaginationRowModel() : undefined,
    getFilteredRowModel: isClientSide ? getFilteredRowModel() : undefined,
    globalFilterFn: 'includesString',
    // handled by useDatatableQueryState
    autoResetPageIndex: false,
    onColumnVisibilityChange,
    onSortingChange: next => {
      onSortChange(
        tableSortToQuerySort(typeof next === 'function' ? next(sorting) : next),
      );
    },
    onRowSelectionChange: next => {
      onSelectedRowsChange?.(
        tableRowSelectionToArray(
          typeof next === 'function' ? next(rowSelection) : next,
        ),
      );
    },
    onPaginationChange: next => {
      onPaginationChange?.(
        tablePaginationToQueryPagination(
          typeof next === 'function' ? next(tablePagination) : next,
        ),
      );
    },
    manualPagination: !isClientSide,
    // use length aware pagination meta from backend for full pagination state
    rowCount: total,
    // use simple/cursor pagination meta to determine if there's a next page
    pageCount:
      total == undefined && response?.meta && response?.links.next != null
        ? -1
        : undefined,
    state: {
      globalFilter,
      sorting,
      rowSelection,
      columnVisibility: visibleColumns,
      pagination: tablePagination,
    },
  });
}

function queryPaginationToTablePagination(
  pagination: QueryPagination | undefined,
): PaginationState {
  return {
    pageIndex: pagination?.page != null ? pagination.page - 1 : 0,
    pageSize: pagination?.per_page ?? defaultPerPage,
  };
}

function tablePaginationToQueryPagination(
  pagination: PaginationState,
): QueryPagination {
  return {
    page: pagination.pageIndex + 1,
    per_page: pagination.pageSize,
  };
}

function querySortToTableSort(sort: SortDescriptor): SortingState {
  return [
    {
      id: sort.orderBy,
      desc: sort.orderDir === 'desc',
    },
  ];
}

function tableSortToQuerySort(sort: SortingState): SortDescriptor | null {
  if (!sort[0]) {
    return null;
  }
  return {
    orderBy: sort[0].id,
    orderDir: sort[0].desc ? 'desc' : 'asc',
  };
}

function tableRowSelectionToArray(rowSelection: RowSelectionState): number[] {
  const rows = [];
  for (const key in rowSelection) {
    if (rowSelection[key]) {
      rows.push(Number(key));
    }
  }
  return rows;
}

function arrayToTableRowSelection(array: number[]): RowSelectionState {
  const rows: Record<string, boolean> = {};
  for (const row of array) {
    rows[row.toString()] = true;
  }
  return rows;
}

import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Table} from '@shadcn/table/table';
import {checkboxColumnDef} from '@shadcn/table/utils/checkbox-column-def';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import preview from '@storybook/preview';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  RowData,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontal,
} from 'lucide-react';
import {useState} from 'react';

const meta = preview.meta({
  title: 'Table',
  component: Table.Root,
  tags: ['autodocs'],
});

const invoices = [
  {
    invoice: 'INV001',
    paymentStatus: 'Paid',
    totalAmount: '$250.00',
    paymentMethod: 'Credit Card',
  },
  {
    invoice: 'INV002',
    paymentStatus: 'Pending',
    totalAmount: '$150.00',
    paymentMethod: 'PayPal',
  },
  {
    invoice: 'INV003',
    paymentStatus: 'Unpaid',
    totalAmount: '$350.00',
    paymentMethod: 'Bank Transfer',
  },
  {
    invoice: 'INV004',
    paymentStatus: 'Paid',
    totalAmount: '$450.00',
    paymentMethod: 'Credit Card',
  },
  {
    invoice: 'INV005',
    paymentStatus: 'Paid',
    totalAmount: '$550.00',
    paymentMethod: 'PayPal',
  },
  {
    invoice: 'INV006',
    paymentStatus: 'Pending',
    totalAmount: '$200.00',
    paymentMethod: 'Bank Transfer',
  },
  {
    invoice: 'INV007',
    paymentStatus: 'Unpaid',
    totalAmount: '$300.00',
    paymentMethod: 'Credit Card',
  },
];

export const BasicTable = meta.story(() => {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Invoice</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Method</Table.Head>
          <Table.Head>Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {invoices.map(invoice => (
          <Table.Row key={invoice.invoice}>
            <Table.Cell>{invoice.invoice}</Table.Cell>
            <Table.Cell>{invoice.paymentStatus}</Table.Cell>
            <Table.Cell>{invoice.paymentMethod}</Table.Cell>
            <Table.Cell>{invoice.totalAmount}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
});

export const ClientSideDataTable = meta.story(() => {
  return (
    <div className="w-full">
      <DataTable columns={columns} data={payments} />
    </div>
  );
});

type Payment = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  email: string;
};

const payments: Payment[] = [
  {
    id: '728ed52f',
    amount: 100,
    status: 'pending',
    email: 'm@example.com',
  },
  {
    id: '489e1d42',
    amount: 125,
    status: 'processing',
    email: 'example@gmail.com',
  },
];

const columns: ColumnDef<Payment>[] = [
  checkboxColumnDef<Payment>(),
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'email',
    header: ({column}) => (
      <SortableHeader column={column}>Email</SortableHeader>
    ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({row}) => {
      const amount = parseFloat(row.getValue('amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({row}) => {
      const payment = row.original;
      return (
        <Dropdown.Root>
          <Dropdown.Trigger
            render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <Dropdown.Content align="end">
            <Dropdown.Group>
              <Dropdown.GroupLabel>Actions</Dropdown.GroupLabel>
              <Dropdown.Item
                onClick={() => navigator.clipboard.writeText(payment.id)}
              >
                Copy payment ID
              </Dropdown.Item>
            </Dropdown.Group>
            <Dropdown.Separator />
            <Dropdown.Group>
              <Dropdown.Item>View customer</Dropdown.Item>
              <Dropdown.Item>View payment details</Dropdown.Item>
            </Dropdown.Group>
          </Dropdown.Content>
        </Dropdown.Root>
      );
    },
  },
];

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const isEmpty = !table.getRowModel().rows?.length;

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter emails..."
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={event =>
            table.getColumn('email')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Dropdown.Root>
          <Dropdown.Trigger
            render={
              <Button variant="outline" className="ml-auto">
                Columns
              </Button>
            }
          />
          <Dropdown.Content align="end">
            {table
              .getAllColumns()
              .filter(column => column.getCanHide())
              .map(column => (
                <Dropdown.CheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={value => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </Dropdown.CheckboxItem>
              ))}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{' '}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              {table.getFlatHeaders().map(header => (
                <Table.Head key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Table.Head>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map(row => (
              <Table.Row
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map(cell => (
                  <Table.Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        {isEmpty && (
          <Empty>
            <Empty.Header>No results.</Empty.Header>
          </Empty>
        )}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

type Product = {
  id: number;
  title: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  category: string;
};

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    gridCol: string;
  }
}

const productsDataTableColumns: ColumnDef<Product>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: {
      gridCol: 'max-content',
    },
  },
  {
    accessorKey: 'title',
    size: 250,
    header: ({column}) => {
      return (
        <>
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price',
  },
  {
    accessorKey: 'discountPercentage',
    header: 'Discount Percentage',
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
  },
  {
    accessorKey: 'stock',
    header: 'Stock',
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
  },
  {
    size: 1,
    accessorKey: 'category',
    header: 'Category',
  },
];

const queryClient = new QueryClient();

export const ServerSideDataTable = meta.story({
  decorators: [
    Story => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  render: function Render() {
    const [tableState, _setTableState] = useState<{
      pagination: PaginationState;
      sorting: SortingState;
      globalFilter: string;
    }>({
      pagination: {
        pageIndex: 0,
        pageSize: 15,
      },
      sorting: [],
      globalFilter: '',
    });

    const setTableState = (next: Partial<typeof tableState>) => {
      _setTableState(prev => {
        const shouldResetPageIndex =
          next.pagination?.pageIndex == null &&
          (prev.globalFilter !== next.globalFilter ||
            JSON.stringify(prev.sorting) !== JSON.stringify(next.sorting));
        return {
          ...prev,
          ...next,
          pagination: shouldResetPageIndex
            ? {
                pageIndex: 0,
                pageSize: prev.pagination.pageSize,
              }
            : (next.pagination ?? prev.pagination),
        };
      });
    };

    const query = useQuery({
      queryKey: ['server-side-data-table', tableState],
      placeholderData: keepPreviousData,
      queryFn: () => {
        const pagination = tableState.pagination;
        const skip = pagination.pageIndex * pagination.pageSize;
        const limit = pagination.pageSize;
        const sortBy = tableState.sorting.length
          ? tableState.sorting[0]!.id
          : undefined;
        const sortDir = tableState.sorting.length
          ? tableState.sorting[0]!.desc
            ? 'desc'
            : 'asc'
          : undefined;
        const query = tableState.globalFilter;
        return fetch(
          `https://dummyjson.com/products/search?skip=${skip}&limit=${limit}&sortBy=${sortBy}&sortDir=${sortDir}&q=${query}`,
        ).then(res => res.json());
      },
    });

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
      {},
    );
    const [rowSelection, setRowSelection] = useState(() => ({}));

    const serverHasNextPage =
      query.data?.total >
      (tableState.pagination.pageIndex + 1) * tableState.pagination.pageSize;

    const table = useReactTable({
      data: query.data?.products ?? [],
      columns: productsDataTableColumns,
      getCoreRowModel: getCoreRowModel(),
      onSortingChange: sorting =>
        setTableState({
          sorting:
            typeof sorting === 'function'
              ? sorting(tableState.sorting)
              : sorting,
        }),
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      onGlobalFilterChange: globalFilter => setTableState({globalFilter}),
      onPaginationChange: v => {
        const next = typeof v === 'function' ? v(tableState.pagination) : v;
        return setTableState({pagination: next});
      },
      manualPagination: true,
      pageCount: serverHasNextPage ? -1 : tableState.pagination.pageIndex + 1,
      state: {
        ...tableState,
        columnVisibility,
        rowSelection,
      },
    });

    return (
      <div className="w-full max-w-6xl">
        <div className="flex items-center py-4">
          <Input
            placeholder="Search..."
            value={tableState.globalFilter}
            onChange={event =>
              setTableState({globalFilter: event.target.value})
            }
            className="max-w-sm"
          />
          <Dropdown.Root>
            <Dropdown.Trigger
              render={
                <Button variant="outline" className="ml-auto">
                  Columns
                </Button>
              }
            />
            <Dropdown.Content align="end">
              {table
                .getAllColumns()
                .filter(column => column.getCanHide())
                .map(column => (
                  <Dropdown.CheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </Dropdown.CheckboxItem>
                ))}
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
        <Table.Root className="w-full">
          <Table.Header>
            <Table.Row>
              {table.getFlatHeaders().map(header => (
                <Table.Head key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </Table.Head>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map(row => (
              <Table.Row
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map(cell => (
                  <Table.Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <div className="mt-3 flex items-center justify-end gap-4 px-3">
          <Field.Root orientation="horizontal" className="w-fit">
            <Field.Label>Rows per page</Field.Label>
            <Select.Root
              value={tableState.pagination.pageSize.toString()}
              onValueChange={value =>
                setTableState({
                  pagination: {pageSize: parseInt(value!), pageIndex: 0},
                })
              }
            >
              <Select.Trigger className="h-8 w-20">
                <Select.Value />
              </Select.Trigger>
              <Select.Content align="start">
                <Select.Group>
                  <Select.Item value="15">15</Select.Item>
                  <Select.Item value="25">25</Select.Item>
                  <Select.Item value="50">50</Select.Item>
                  <Select.Item value="100">100</Select.Item>
                </Select.Group>
              </Select.Content>
              <Field.Error />
            </Select.Root>
          </Field.Root>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    );
  },
});

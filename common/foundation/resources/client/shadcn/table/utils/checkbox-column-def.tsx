import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {ColumnDef} from '@tanstack/react-table';

export function checkboxColumnDef<T>(): ColumnDef<T> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({table}) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({row}) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  };
}

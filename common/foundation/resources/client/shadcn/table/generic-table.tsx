import {Table} from '@shadcn/table/table';
import {flexRender, Row, Table as TanstackTable} from '@tanstack/react-table';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {CSSProperties} from 'react';

export function GenericTable({
  table,
  onRowClick,
}: {
  table: TanstackTable<any>;
  onRowClick?: (row: Row<any>) => void;
}) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row className="hover:bg-transparent">
          {table.getFlatHeaders().map(header => (
            <Table.Head
              key={header.id}
              style={
                {
                  '--width':
                    header.column.columnDef.size === 1
                      ? '1%'
                      : `${header.column.columnDef.size}px`,
                } as CSSProperties
              }
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map(row => (
          <Table.Row
            key={row.id}
            data-state={row.getIsSelected() && 'selected'}
            className={
              onRowClick ? 'hover:bg-muted/50' : 'hover:bg-transparent'
            }
            onClick={ignoreEventsFromPortal(e => {
              const cell = (e.target as HTMLElement).closest('td');
              const hasInteractiveChildren = cell?.querySelector(
                'button, a, input, select, textarea',
              );
              if (!hasInteractiveChildren) {
                onRowClick?.(row);
              }
            })}
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
  );
}

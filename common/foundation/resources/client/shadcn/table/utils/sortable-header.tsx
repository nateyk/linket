import {Button} from '@shadcn/button/button';
import {Column} from '@tanstack/react-table';
import {cn} from '@ui/utils/cn';
import {ArrowDownIcon} from 'lucide-react';
import {ReactNode} from 'react';

type Props = {
  column: Column<any>;
  children: ReactNode;
  className?: string;
};

export function SortableHeader({column, children, className}: Props) {
  const sort = column.getIsSorted();

  const handleSort = () => {
    if (sort === false) {
      column.toggleSorting(false); // asc
    } else if (sort === 'asc') {
      column.toggleSorting(true); // desc
    } else {
      column.clearSorting();
    }
  };

  return (
    <Button
      variant="link"
      className={cn('px-0', className)}
      onClick={() => handleSort()}
    >
      {children}
      <ArrowDownIcon
        className={cn(!sort && 'invisible', sort === 'asc' && 'rotate-180')}
      />
    </Button>
  );
}

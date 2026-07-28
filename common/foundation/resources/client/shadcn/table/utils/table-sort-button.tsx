import {SortDescriptor} from '@common/ui/tables/types/sort-descriptor';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {ArrowDownWideNarrowIcon, ArrowUpWideNarrowIcon} from 'lucide-react';
import {ReactNode} from 'react';

export type TableSortOptions = {
  label: ReactNode;
  orderBy: string;
  isDefault?: boolean;
};

const directionOptions = [
  {
    label: <Trans message="Ascending" />,
    orderDir: 'asc',
  },
  {
    label: <Trans message="Descending" />,
    orderDir: 'desc',
  },
];

type Props = {
  sortDescriptor: SortDescriptor | null;
  onSortChange: (sortDescriptor: SortDescriptor) => void;
  className?: string;
  sortOptions: TableSortOptions[];
};
export function TableSortButton({
  sortDescriptor,
  onSortChange,
  className,
  sortOptions,
}: Props) {
  const defaultSort = sortOptions.find(option => option.isDefault)!;

  const currentSort = {
    orderBy: sortDescriptor?.orderBy || defaultSort.orderBy,
    orderDir: sortDescriptor?.orderDir || 'desc',
  };

  const activeSortOption =
    sortOptions.find(option => option.orderBy === currentSort.orderBy) ??
    defaultSort;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={<Button variant="outline" className={className} />}
      >
        {currentSort.orderDir === 'asc' ? (
          <ArrowUpWideNarrowIcon />
        ) : (
          <ArrowDownWideNarrowIcon />
        )}
        {activeSortOption.label}
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Group>
          <Dropdown.GroupLabel>
            <Trans message="Sort by" />
          </Dropdown.GroupLabel>
          <Dropdown.RadioGroup
            value={currentSort.orderBy}
            onValueChange={orderBy => {
              onSortChange({
                orderBy,
                orderDir: currentSort.orderDir,
              });
            }}
          >
            {sortOptions.map(option => (
              <Dropdown.RadioItem key={option.orderBy} value={option.orderBy}>
                {option.label}
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Group>
        <Dropdown.Separator />
        <Dropdown.Group>
          <Dropdown.GroupLabel>
            <Trans message="Direction" />
          </Dropdown.GroupLabel>
          <Dropdown.RadioGroup
            value={currentSort.orderDir}
            onValueChange={orderDir => {
              onSortChange({
                orderBy: currentSort.orderBy,
                orderDir: orderDir as 'asc' | 'desc',
              });
            }}
          >
            {directionOptions.map(option => (
              <Dropdown.RadioItem key={option.orderDir} value={option.orderDir}>
                {option.label}
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Group>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

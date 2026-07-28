import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Trans} from '@ui/i18n/trans';
import {ListFilterIcon, PlusIcon} from 'lucide-react';
import {ComponentProps, ReactElement, useState} from 'react';
import {BackendFilter} from './backend-filter';

interface Props {
  filters: BackendFilter[];
  icon?: ReactElement;
  color?: ComponentProps<typeof Button>['color'];
  variant?: ComponentProps<typeof Button>['variant'];
  disabled?: boolean;
  className?: string;
}
export function AddFilterPopover({
  filters,
  color,
  variant = 'outline',
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <Button
            variant={variant}
            color={color}
            disabled={disabled}
            className={className}
          />
        }
      >
        <ListFilterIcon />
        <Trans message="Filter" />
      </Popover.Trigger>
      <Popover.Portal>
        <Content filters={filters} onClose={() => setOpen(false)} />
      </Popover.Portal>
    </Popover.Root>
  );
}

function Content({
  filters,
  onClose,
}: {
  filters: BackendFilter[];
  onClose: () => void;
}) {
  const {setQueryState, activeFilters} = useTableQueryState({filters});
  const [selectedFilterKey, setSelectedFilterKey] = useState<string | null>(
    null,
  );
  const selectedFilter = filters.find(
    filter => filter.key === selectedFilterKey,
  );

  const filterList = (
    <div className="flex flex-col gap-0">
      {filters.map(filter => (
        <Button
          key={filter.key}
          variant="ghost"
          className="justify-start font-normal"
          onClick={() => {
            setSelectedFilterKey(filter.key);
          }}
          disabled={activeFilters.includes(filter.key)}
        >
          <PlusIcon />
          {filter.label}
        </Button>
      ))}
    </div>
  );

  return (
    // w-74 allows date ranger picker to fully fit
    <Popover.Content className="w-74 overflow-hidden p-1.5">
      {selectedFilter
        ? selectedFilter.popoverContent({
            filter: selectedFilter,
            onApply: values => {
              if (selectedFilterKey) {
                setQueryState({[selectedFilterKey]: values});
              }
              onClose();
            },
            onDismiss: () => setSelectedFilterKey(null),
          })
        : filterList}
    </Popover.Content>
  );
}

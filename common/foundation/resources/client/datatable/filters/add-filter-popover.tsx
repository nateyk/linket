import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ListFilterIcon, PlusIcon} from 'lucide-react';
import {FilterTrans} from './filter-trans';
import {ComponentProps, ReactElement, useState} from 'react';
import {BackendFilter} from './backend-filter';

interface Props {
  filters: BackendFilter[];
  icon?: ReactElement;
  color?: ComponentProps<typeof Button>['color'];
  variant?: ComponentProps<typeof Button>['variant'];
  disabled?: boolean;
  className?: string;
  compactOnMobile?: boolean;
}
export function AddFilterPopover({
  filters,
  color,
  variant = 'outline',
  disabled,
  className,
  compactOnMobile = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const {trans} = useTrans();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <Button
            variant={variant}
            color={color}
            disabled={disabled}
            className={
              compactOnMobile
                ? `size-10 shrink-0 px-0 sm:h-9 sm:w-auto sm:px-3 ${className ?? ''}`
                : className
            }
            aria-label={trans({message: 'Filter'})}
          />
        }
      >
        <ListFilterIcon aria-hidden="true" />
        <span className={compactOnMobile ? 'sr-only sm:not-sr-only' : undefined}>
          <Trans message="Filter" />
        </span>
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
          <FilterTrans label={filter.label} />
        </Button>
      ))}
    </div>
  );

  return (
    // w-74 allows date ranger picker to fully fit
    <Popover.Content className="max-h-[min(65dvh,32rem)] w-74 max-w-[calc(100vw-2rem)] overflow-y-auto p-1.5">
      {selectedFilter?.popoverContent
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

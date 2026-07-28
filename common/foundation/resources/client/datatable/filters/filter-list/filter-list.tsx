import {Button} from '@shadcn/button/button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {opacityAnimation} from '@ui/animation/opacity-animation';
import {Skeleton} from '@ui/skeleton/skeleton';
import {cn} from '@ui/utils/cn';
import clsx from 'clsx';
import {AnimatePresence, m} from 'framer-motion';
import {ComponentProps} from 'react';
import {BackendFilter} from '../backend-filter';

type ButtonSize = ComponentProps<typeof Button>['size'];

interface FilterListProps {
  filters: BackendFilter[];
  // these filters will always be shown, even if value is not yet selected for filter
  pinnedFilters?: string[];
  className?: string;
  isLoading?: boolean;
}
export function FilterList({
  filters,
  pinnedFilters = [],
  className,
  isLoading,
}: FilterListProps) {
  const {queryState, setQueryState, activeFilters} = useTableQueryState({
    filters,
  });

  const visibleFilters = Array.from(
    new Set([...pinnedFilters, ...activeFilters]),
  );

  if (!visibleFilters.length) return null;

  const filterList = (
    <m.ul
      key="filter-list"
      className={cn('flex shrink-0 items-center gap-1.5', className)}
      {...opacityAnimation}
    >
      {visibleFilters.map(key => {
        const filter = filters.find(f => f.key === key);
        if (!filter) return null;

        const isInactive = !activeFilters.includes(key);

        return (
          <li key={key}>
            {filter.item?.({
              filter,
              value: queryState[key],
              onApply: value => setQueryState({[key]: value}),
              onRemove: () => setQueryState({[key]: null}),
              isInactive,
            })}
          </li>
        );
      })}
    </m.ul>
  );

  return (
    <AnimatePresence initial={false} mode="wait">
      {isLoading ? (
        <FilterListSkeleton count={visibleFilters.length} />
      ) : (
        filterList
      )}
    </AnimatePresence>
  );
}

function FilterListSkeleton({
  count,
  buttonSize,
}: {
  count?: number;
  buttonSize?: ButtonSize;
}) {
  const widths = ['w-22.5', 'w-19', 'w-32'];
  return (
    <m.div
      key="filter-list-skeleton"
      className={clsx(
        'flex items-center gap-1.5',
        buttonSizeToHeight(buttonSize),
      )}
      {...opacityAnimation}
    >
      {Array.from({length: count || 3}).map((_, index) => (
        <Skeleton
          key={index}
          variant="rect"
          className={`h-full rounded-md ${widths[index % widths.length]}`}
        />
      ))}
    </m.div>
  );
}

function buttonSizeToHeight(buttonSize: ButtonSize = 'xs'): string {
  switch (buttonSize) {
    case 'xs':
      return 'h-6';
    case 'sm':
      return 'h-8';
    case 'default':
      return 'h-9';
    case 'lg':
      return 'h-10';
  }
  return 'h-9';
}

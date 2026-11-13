import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowDownWideNarrowIcon, ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon} from 'lucide-react';
import type {ReactNode} from 'react';

export type CreatorFilterOption = {
  value: string;
  label: ReactNode;
};

type Props = {
  search: string;
  searchLabel: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: CreatorFilterOption[];
  sort?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: CreatorFilterOption[];
  defaultSort?: string;
  onClear: () => void;
};

/**
 * One quiet toolbar for creator listings. Uses the existing Linket/Base UI
 * primitives, not extra shadcn/Cubby themes or client-side table state.
 */
export function CreatorListingToolbar({
  search,
  searchLabel,
  onSearchChange,
  status,
  onStatusChange,
  statusOptions,
  sort,
  onSortChange,
  sortOptions,
  defaultSort = 'latest',
  onClear,
}: Props) {
  const {trans} = useTrans();
  const currentStatus = statusOptions.find(option => option.value === status);
  const currentSort = sortOptions?.find(option => option.value === sort);
  const filtersActive = Boolean(search.trim() || status || (sort && sort !== defaultSort));

  return (
    <div
      data-slot="creator-listing-toolbar"
      role="search"
      aria-label={searchLabel}
      className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5"
    >
      <div className="relative w-full min-w-0 sm:w-72 sm:max-w-xs sm:flex-none">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          bindToHookForm={false}
          type="search"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className="h-9 ps-9"
        />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Dropdown.Root>
          <Dropdown.Trigger
            aria-label={trans({message: 'Filter by status'})}
            render={
              <Button
                type="button"
                variant="outline"
                color={status ? 'primary' : 'default'}
                size="sm"
                className="h-9 gap-1.5 px-3"
              />
            }
          >
            <ListFilterIcon className="size-4" aria-hidden="true" />
            <Trans message="Status" />
            {currentStatus && (
              <span className="max-w-24 truncate text-xs font-medium">
                {currentStatus.label}
              </span>
            )}
            <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </Dropdown.Trigger>
          <Dropdown.Content align="start" className="min-w-48">
            <Dropdown.Group>
              <Dropdown.GroupLabel><Trans message="Status" /></Dropdown.GroupLabel>
              <Dropdown.RadioGroup
                value={status || 'all'}
                onValueChange={value => onStatusChange(value === 'all' ? '' : value)}
              >
                <Dropdown.RadioItem value="all">
                  <Trans message="All statuses" />
                </Dropdown.RadioItem>
                {statusOptions.map(option => (
                  <Dropdown.RadioItem key={option.value} value={option.value}>
                    {option.label}
                  </Dropdown.RadioItem>
                ))}
              </Dropdown.RadioGroup>
            </Dropdown.Group>
          </Dropdown.Content>
        </Dropdown.Root>
        {sortOptions && onSortChange && (
          <Dropdown.Root>
            <Dropdown.Trigger
              aria-label={trans({message: 'Sort by'})}
              render={
                <Button
                  type="button"
                  variant="outline"
                  color={sort && sort !== defaultSort ? 'primary' : 'default'}
                  size="sm"
                  className="h-9 gap-1.5 px-3"
                />
              }
            >
              <ArrowDownWideNarrowIcon className="size-4" aria-hidden="true" />
              <span className="max-w-28 truncate">{currentSort?.label ?? <Trans message="Sort" />}</span>
              <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </Dropdown.Trigger>
            <Dropdown.Content align="start" className="min-w-48">
              <Dropdown.Group>
                <Dropdown.GroupLabel><Trans message="Sort by" /></Dropdown.GroupLabel>
                <Dropdown.RadioGroup value={sort ?? defaultSort} onValueChange={onSortChange}>
                  {sortOptions.map(option => (
                    <Dropdown.RadioItem key={option.value} value={option.value}>
                      {option.label}
                    </Dropdown.RadioItem>
                  ))}
                </Dropdown.RadioGroup>
              </Dropdown.Group>
            </Dropdown.Content>
          </Dropdown.Root>
        )}
        {filtersActive && (
          <Button type="button" variant="ghost" color="default" size="sm" className="h-9 gap-1 px-2 text-muted-foreground" onClick={onClear}>
            <XIcon className="size-3.5" aria-hidden="true" />
            <Trans message="Clear filters" />
          </Button>
        )}
      </div>
    </div>
  );
}

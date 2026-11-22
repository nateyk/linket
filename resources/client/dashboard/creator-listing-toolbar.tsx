import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ListFilterIcon, SearchIcon, XIcon} from 'lucide-react';
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
  defaultSort,
  onClear,
}: Props) {
  const {trans} = useTrans();
  const resolvedDefaultSort = defaultSort ?? sortOptions?.[0]?.value ?? 'latest';
  const isStatusActive = Boolean(status);
  const isSortActive = Boolean(sort && sort !== resolvedDefaultSort);
  const activeFilterCount = (isStatusActive ? 1 : 0) + (isSortActive ? 1 : 0);
  const filtersActive = Boolean(search.trim() || activeFilterCount > 0);

  return (
    <div
      data-slot="creator-listing-toolbar"
      role="search"
      aria-label={searchLabel}
      className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center"
    >
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
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
            aria-label={trans({message: 'Filter'})}
            render={
              <Button
                type="button"
                variant="outline"
                color={activeFilterCount > 0 ? 'primary' : 'default'}
                size="sm"
                className="h-9 gap-2 px-3"
              />
            }
          >
            <ListFilterIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <Trans message="Filter" />
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Dropdown.Trigger>
          <Dropdown.Content align="start" className="min-w-56">
            <Dropdown.Group>
              <Dropdown.GroupLabel>
                <Trans message="Status" />
              </Dropdown.GroupLabel>
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

            {sortOptions && onSortChange && (
              <>
                <Dropdown.Separator />
                <Dropdown.Group>
                  <Dropdown.GroupLabel>
                    <Trans message="Sort by" />
                  </Dropdown.GroupLabel>
                  <Dropdown.RadioGroup
                    value={sort ?? resolvedDefaultSort}
                    onValueChange={onSortChange}
                  >
                    {sortOptions.map(option => (
                      <Dropdown.RadioItem key={option.value} value={option.value}>
                        {option.label}
                      </Dropdown.RadioItem>
                    ))}
                  </Dropdown.RadioGroup>
                </Dropdown.Group>
              </>
            )}
          </Dropdown.Content>
        </Dropdown.Root>

        {filtersActive && (
          <Button
            type="button"
            variant="ghost"
            color="default"
            size="sm"
            className="h-9 gap-1 px-2 text-muted-foreground"
            onClick={onClear}
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            <Trans message="Clear filters" />
          </Button>
        )}
      </div>
    </div>
  );
}

import {TextField} from '@ui/forms/input-field/text-field/text-field';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SearchIcon} from '@ui/icons/material/Search';
import {AnimatePresence} from 'framer-motion';
import {ComponentPropsWithoutRef, ReactNode} from 'react';
import {AddFilterPopover} from './filters/add-filter-popover';
import {BackendFilter} from './filters/backend-filter';

interface Props {
  actions?: ReactNode;
  filters?: BackendFilter[];
  filtersLoading?: boolean;
  searchPlaceholder?: MessageDescriptor;
  seachDefaultValues?: string;
  searchValue?: string;
  onSearchChange: (value: string) => void;
  selectedItems?: (string | number)[];
  selectedActions?: ReactNode;
}
export function DataTableHeader(props: Props) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {props.selectedItems?.length ? (
        <SelectedStateDatableHeader {...props} key="selected" />
      ) : (
        <DefaultDatatableHeader {...props} key="default" />
      )}
    </AnimatePresence>
  );
}

function DefaultDatatableHeader({
  searchPlaceholder = message('Type to search...'),
  seachDefaultValues,
  searchValue,
  onSearchChange,
  actions,
  filters,
  filtersLoading,
}: Props) {
  const {trans} = useTrans();
  return (
    <HeaderLayout>
      <TextField
        size="sm"
        className="max-w-110 min-w-45 flex-auto"
        inputWrapperClassName="mr-6 md:mr-0"
        placeholder={trans(searchPlaceholder)}
        startAdornment={<SearchIcon size="sm" />}
        defaultValue={seachDefaultValues}
        value={searchValue}
        onChange={e => {
          onSearchChange(e.target.value);
        }}
      />
      {filters && (
        <AddFilterPopover filters={filters} disabled={filtersLoading} />
      )}
      <div className="ml-auto w-0" />
      {actions}
    </HeaderLayout>
  );
}

function SelectedStateDatableHeader({selectedActions, selectedItems}: Props) {
  return (
    <HeaderLayout data-testid="datatable-selected-header">
      <div className="mr-auto font-medium">
        <Trans
          message="[one 1 item|other :count items] selected"
          values={{count: selectedItems?.length || 1}}
        />
      </div>
      {selectedActions}
    </HeaderLayout>
  );
}

interface AnimatedHeaderProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
}
export function HeaderLayout({children, ...domProps}: AnimatedHeaderProps) {
  return (
    <div
      className="relative mb-6 no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto md:gap-3"
      {...domProps}
    >
      {children}
    </div>
  );
}

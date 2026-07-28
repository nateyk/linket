import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {SearchIcon, XIcon} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDebouncedCallback} from 'use-debounce';

type Props = {
  className?: string;
  placeholder?: MessageDescriptor;
  debounce?: boolean;
};

export function TableSearchInput({
  className,
  placeholder = message('Search...'),
  debounce = true,
}: Props) {
  const {trans} = useTrans();
  const {queryState, setQueryState} = useTableQueryState();
  // prevent errors from base-ui due to defaultValue changing
  const [defaultValue] = useState(queryState.query);

  const setSearchValue = useCallback(
    (value: string) => {
      setQueryState(
        {query: value},
        // disable throttle because we are debouncing manually
        debounce
          ? {
              limitUrlUpdates: {
                method: 'throttle',
                timeMs: 0,
              },
            }
          : undefined,
      );
    },
    [setQueryState, debounce],
  );

  const debouncedSetSearchValue = useDebouncedCallback(setSearchValue, 300);
  const ref = useRef<HTMLInputElement>(null);

  // update the input value if it changes from outside the component
  useEffect(() => {
    if (ref.current) {
      ref.current.value = queryState.query ?? '';
    }
  }, [queryState.query]);

  return (
    <InputGroup className={cn('w-auto max-w-110 min-w-45 flex-1', className)}>
      <InputGroupAddon align="inline-start">
        <SearchIcon className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={trans(placeholder)}
        ref={ref}
        defaultValue={defaultValue}
        onChange={e => {
          const value = e.target.value;
          if (!debounce) {
            setSearchValue(value);
          } else if (value === '') {
            // when clearing the input, send update without debouncing
            setSearchValue('');
          } else {
            debouncedSetSearchValue(value);
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            // send update without debouncing
            setSearchValue((e.target as HTMLInputElement).value);
          }
        }}
      />
      {queryState.query && (
        <InputGroupAddon align="inline-end" onClick={() => setSearchValue('')}>
          <InputGroupButton size="icon-xs">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

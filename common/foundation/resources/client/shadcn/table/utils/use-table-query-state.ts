import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {getParsersForFilters} from '@common/datatable/filters/filter-parsers';
import {SortDescriptor} from '@common/ui/tables/types/sort-descriptor';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';
import {searchParamsToObject} from '@ui/utils/urls/search-params-from-url';
import {
  createParser,
  parseAsInteger,
  parseAsString,
  ParserMap,
  useQueryStates,
} from 'nuqs';
import {useCallback, useDeferredValue, useMemo} from 'react';
import {useSearchParams} from 'react-router';

type Params = {
  filters?: BackendFilter[];
  parsers?: ParserMap;
};

const sortParser = createParser<SortDescriptor | null>({
  parse: value => {
    const [orderBy, orderDir] = value.split(':');
    if (!orderBy) {
      return null;
    }
    return {
      orderBy,
      orderDir: orderDir as SortDescriptor['orderDir'],
    };
  },
  serialize: value => {
    if (!value?.orderBy) {
      return '';
    }

    return `${value.orderBy}:${value.orderDir ?? 'desc'}`;
  },
  eq: (a, b) => {
    return a?.orderBy === b?.orderBy && a?.orderDir === b?.orderDir;
  },
});

const baseParsers = {
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(15),
  query: parseAsString.withDefault(''),
  sort: sortParser,
  is_archived: parseAsString.withDefault('false'),
};

type Parsers = typeof baseParsers & ParserMap;

export function useTableQueryState({
  filters,
  parsers: customParsers,
}: Params = {}) {
  const [nativeSearchParams] = useSearchParams();

  const parsers = useMemo(() => {
    return {
      ...baseParsers,
      ...(filters ? getParsersForFilters(filters) : {}),
      ...(customParsers ? customParsers : {}),
    } as Parsers;
  }, [filters, customParsers]);

  const [queryState, _setQueryState] = useQueryStates(parsers, {
    // needed so react router's "useSearchParams" are updated
    shallow: false,
  });

  type QueryState = typeof queryState;
  type QueryStateUpdate = Partial<{
    [Key in keyof QueryState]: QueryState[Key] | null;
  }>;

  const paramIsPageAltering = useCallback(
    (key: keyof Parsers, next: QueryStateUpdate, old: QueryState) => {
      return (
        (key === 'per_page' && next.per_page !== old.per_page) ||
        (key === 'query' && next.query !== old.query) ||
        filters?.some(f => f.key === key)
      );
    },
    [filters],
  );

  const setQueryState = useCallback(
    (
      values: FirstParam<typeof _setQueryState>,
      options?: {resetPage?: boolean} & SecondParam<typeof _setQueryState>,
    ) => {
      return _setQueryState(old => {
        const next = typeof values === 'function' ? values(old) : values;
        if (!next) return;

        if (
          options?.resetPage ||
          Object.keys(next).some(key => paramIsPageAltering(key, next, old))
        ) {
          return {...next, page: 1};
        } else {
          return next;
        }
      }, options);
    },
    [_setQueryState, paramIsPageAltering],
  );

  // check if filter is actually in url and not just nuqs query state. Otherwise filters with default value will be considered active.
  const activeFilters: string[] = useMemo(() => {
    return (
      filters
        ?.filter(f => nativeSearchParams.get(f.key) != null)
        .map(f => f.key) ?? []
    );
  }, [filters, nativeSearchParams]);

  const isFiltering = !!activeFilters.length || !!queryState.query;

  // object from actual search params in the url. This will include params that are not present in parsers and without any parsing applied. This should be passed to react query, instead of queryState, so the query key matches the one used in the route loader.
  const searchParams = useMemo(
    () => searchParamsToObject(nativeSearchParams),
    [nativeSearchParams],
  );

  const deferredSearchParams = useDeferredValue(searchParams);

  return {
    queryState,
    setQueryState,
    searchParams,
    deferredSearchParams,
    isLoading: searchParams !== deferredSearchParams,
    parsers,
    activeFilters,
    isFiltering,
  };
}

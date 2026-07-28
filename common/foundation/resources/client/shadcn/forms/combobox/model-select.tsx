import {Combobox as ComboboxPrimitive} from '@base-ui/react';
import {queryClient} from '@common/http/query-client';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Item} from '@shadcn/item/item';
import {useQuery, UseQueryOptions} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import {ComponentProps, ReactNode, use, useState} from 'react';
import {useDebounce} from 'use-debounce';

export type ModelSelectProps<
  Model extends {id: number | string},
  ListResponse extends {data: Model[]},
  RetrieveResponse extends {data: Model},
> = {
  listOptions: (state: {
    query?: string;
  }) => UseQueryOptions<ListResponse, any, ListResponse, any[]>;
  retrieveOptions: (state: {
    id: number;
  }) => UseQueryOptions<RetrieveResponse, any, RetrieveResponse, any[]>;
  modelToLabel: (model: Model) => ReactNode;
  modelToImage?: (model: Model) => ReactNode;
};

function findSelectedItemInCache<Model extends {id: number | string}>(
  queryOptions: UseQueryOptions<any, any, any, any[]>,
  selectedValue: string | number,
): Model | undefined {
  const baseKey = queryOptions.queryKey[0];
  const matches = queryClient.getQueriesData<{data: Model[]} | {data: Model}>({
    queryKey: [baseKey],
  });
  for (const [, response] of matches) {
    if (response?.data) {
      if (Array.isArray(response.data)) {
        return response.data.find(item => `${item.id}` == `${selectedValue}`);
      } else {
        if (response.data.id && `${response.data.id}` == `${selectedValue}`) {
          return response.data;
        }
      }
    }
  }
}

export function ModelSelect<
  Model extends {id: number | string},
  ListResponse extends {data: Model[]},
  RetrieveResponse extends {data: Model},
>({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled,
  listOptions,
  retrieveOptions,
  modelToLabel,
  modelToImage,
  placeholder,
  ...props
}: ComponentProps<typeof Combobox.Root<string>> &
  ModelSelectProps<Model, ListResponse, RetrieveResponse> & {
    placeholder?: ReactNode;
  }) {
  const hookFieldCtx = use(HookForm.FieldContext);
  const mergedOnChange: ComboboxPrimitive.Root.Props<string>['onValueChange'] =
    (e, details) => {
      onValueChange?.(e, details);
      hookFieldCtx?.onChange(e);
    };

  // if is bound to hook form, make sure it's always controlled by defaulting to null
  const mergedValue = hookFieldCtx ? (hookFieldCtx.value ?? null) : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;

  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue] = useDebounce(inputValue, 300);

  const listOptionsWithQuery = listOptions({query: debouncedInputValue});
  const listQuery = useQuery(listOptionsWithQuery);
  const items = listQuery.data?.data ?? [];
  const listIsLoading = listQuery.isLoading || listQuery.isFetching;

  const selectedValue = mergedValue ?? defaultValue;

  // selected value in combobox will be the ID of item, but we will need full normalized model for display,
  // either get it from current dropdown items or fetch it from API, if not available.
  const selectedItemFromCache = findSelectedItemInCache<Model>(
    listOptionsWithQuery,
    selectedValue,
  );

  const selectedItemQuery = useQuery({
    ...retrieveOptions({id: selectedValue}),
    enabled: !!selectedValue && !selectedItemFromCache,
  });

  const selectedItem = selectedItemFromCache ?? selectedItemQuery.data?.data;

  return (
    <Combobox.Root
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      items={items}
      filter={null}
      onValueChange={mergedOnChange}
      defaultValue={defaultValue}
      value={mergedValue}
      disabled={mergedDisabled}
      bindToHookForm={false}
      {...props}
    >
      <Combobox.ButtonTrigger>
        {(value: number | null) => {
          if (!value) {
            return (
              <span className="text-muted-foreground">
                {placeholder ?? <Trans message="Select an item" />}
              </span>
            );
          }

          return selectedItem ? (
            <>
              {modelToImage ? modelToImage(selectedItem) : null}
              <span className="min-w-0 truncate">
                {modelToLabel(selectedItem)}
              </span>
            </>
          ) : (
            <div className="flex h-full w-full items-center gap-2">
              {modelToImage && (
                <Skeleton
                  variant="avatar"
                  className="size-6 shrink-0 rounded-full"
                />
              )}
              <Skeleton className="max-w-25 flex-1 text-xs" />
            </div>
          );
        }}
      </Combobox.ButtonTrigger>
      <Combobox.Content>
        <Combobox.InsetInput isLoading={listIsLoading} />
        <Combobox.List>
          {model => {
            const image = modelToImage ? modelToImage(model) : null;
            return (
              <Combobox.Item key={model.id} value={`${model.id}`}>
                <Item>
                  {image && <Item.Media>{image}</Item.Media>}
                  <Item.Content>
                    <Item.Title>{modelToLabel(model)}</Item.Title>
                  </Item.Content>
                </Item>
              </Combobox.Item>
            );
          }}
        </Combobox.List>
        {listIsLoading ? null : (
          <Combobox.Empty>
            <Trans message="No results found." />
          </Combobox.Empty>
        )}
      </Combobox.Content>
    </Combobox.Root>
  );
}

ModelSelect.findSelectedItemInCache = findSelectedItemInCache;

import {ApplyFilterPopoverContent} from '@common/datatable/filters/apply-filter-popover-content';
import {
  FilterListItemProps,
  FilterOperator,
  FilterPopoverContentProps,
  ParsedFilterValue,
} from '@common/datatable/filters/backend-filter';
import {FilterListItemLayout} from '@common/datatable/filters/filter-list/filter-list-item-layout';
import {
  ModelSelect,
  ModelSelectProps,
} from '@shadcn/forms/combobox/model-select';
import {Field} from '@shadcn/forms/field';
import {useQuery} from '@tanstack/react-query';
import {Skeleton} from '@ui/skeleton/skeleton';
import {ReactNode, useState} from 'react';

export type SelectModelFilterItemProps = FilterListItemProps<
  ParsedFilterValue<string>
>;

export type SelectModelFilterPopoverContentProps = FilterPopoverContentProps<
  ParsedFilterValue<string>
>;

export function ModelSelectFilterItem<
  Model extends {id: number | string},
  ListResponse extends {data: Model[]},
  RetrieveResponse extends {data: Model},
>({
  filter,
  value,
  onApply,
  onRemove,
  isInactive,
  retrieveOptions,
  modelToLabel,
  modelToImage,
}: SelectModelFilterItemProps &
  Omit<
    ModelSelectProps<Model, ListResponse, RetrieveResponse>,
    'listOptions'
  >) {
  const [isOpen, setIsOpen] = useState(false);

  const popover = filter.popoverContent({
    filter,
    value,
    onApply: next => {
      setIsOpen(false);
      onApply(next);
    },
  });

  const optionsWithId = retrieveOptions({
    id: value?.value ? Number(value.value) : 0,
  });

  const selectedItemFromCache = value?.value
    ? ModelSelect.findSelectedItemInCache<Model>(optionsWithId, value.value)
    : undefined;

  const {data} = useQuery({
    ...optionsWithId,
    enabled: !!value?.value && !selectedItemFromCache,
  });

  const selectedItem = selectedItemFromCache ?? data?.data;

  let valueLabel = (
    <div className="flex items-center gap-2">
      {modelToImage ? (
        <Skeleton variant="avatar" className="size-4.5 rounded-full" />
      ) : null}
      <Skeleton variant="text" className="w-12.5" />
    </div>
  );

  if (selectedItem) {
    const image = modelToImage ? modelToImage(selectedItem) : null;
    valueLabel = (
      <div className="flex items-center gap-2">
        {image}
        <span className="min-w-0 truncate">{modelToLabel(selectedItem)}</span>
      </div>
    );
  }

  return (
    <FilterListItemLayout
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      valueLabel={valueLabel}
      popoverContent={popover}
      label={filter.label}
      onRemove={onRemove}
      isInactive={isInactive}
    />
  );
}

export function ModelSelectFilterPopoverContent<
  Model extends {id: number | string},
  ListResponse extends {data: Model[]},
  RetrieveResponse extends {data: Model},
>({
  filter,
  value,
  defaultValue,
  onApply,
  onDismiss,
  placeholder,
  listOptions,
  retrieveOptions,
  modelToLabel,
  modelToImage,
}: SelectModelFilterPopoverContentProps &
  ModelSelectProps<Model, ListResponse, RetrieveResponse> & {
    placeholder?: ReactNode;
  }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => value?.value ?? defaultValue?.value ?? '',
  );

  return (
    <ApplyFilterPopoverContent
      label={filter.label}
      onApply={() => {
        onApply({
          value: selectedId != null ? String(selectedId) : '',
          operator:
            value?.operator ?? defaultValue?.operator ?? FilterOperator.eq,
        });
      }}
      onDismiss={onDismiss}
    >
      <Field.Root name="value">
        <ModelSelect
          placeholder={placeholder}
          value={selectedId}
          onValueChange={next => setSelectedId(next)}
          listOptions={listOptions}
          retrieveOptions={retrieveOptions}
          modelToLabel={modelToLabel}
          modelToImage={modelToImage}
          required
        />
        <Field.Error />
      </Field.Root>
    </ApplyFilterPopoverContent>
  );
}

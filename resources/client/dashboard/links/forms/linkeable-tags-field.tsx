import {
  createTagOptions,
  listTagsOptions,
} from '@app/dashboard/tags/tags-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Popover} from '@shadcn/popover/popover';
import {Spinner} from '@shadcn/spinner/spinner';
import {keepPreviousData, useMutation, useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CircleQuestionMarkIcon, PlusIcon} from 'lucide-react';
import {useState} from 'react';
import {useFormContext} from 'react-hook-form';
import {useDebounce} from 'use-debounce';

type TagItem = {
  id: number;
  name: string;
  isCreateItem?: boolean;
};

const createTagItems: TagItem[] = [{id: 0, name: '0', isCreateItem: true}];

export function LinkeableTagsField() {
  const {routeType} = useDatatableRouteType();
  const {trans} = useTrans();

  const [open, setOpen] = useState(false);
  const {setValue, getValues} = useFormContext<{tags: TagItem[]}>();
  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue] = useDebounce(inputValue, 300);

  const createTag = useMutation(createTagOptions());

  const query = useQuery({
    ...listTagsOptions(routeType, {query: debouncedInputValue}),
    placeholderData: keepPreviousData,
  });
  const shouldShowCreateItem =
    query.data &&
    !query.isPlaceholderData &&
    !query.data.data.length &&
    inputValue &&
    inputValue.length > 2;

  const items = shouldShowCreateItem ? createTagItems : query.data?.data;

  const handleCreateTag = (name: string) => {
    createTag.mutate(
      {name},
      {
        onSuccess: response => {
          setValue('tags', [...getValues('tags'), response.data], {
            shouldDirty: true,
          });
          setInputValue('');
          setOpen(false);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <HookForm.Field name="tags">
      <Field.Label className="gap-2">
        <Trans message="Tags" />
        <InfoTrigger />
      </Field.Label>
      <Combobox.Root
        items={items}
        filter={null}
        open={open}
        onOpenChange={setOpen}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        multiple
      >
        <Combobox.Chips>
          <Combobox.Value>
            {(value: TagItem[]) => (
              <>
                {value.map(item => (
                  <Combobox.Chip key={item.id}>{item.name}</Combobox.Chip>
                ))}
                <Combobox.ChipsInput
                  placeholder={trans(message('Select tags'))}
                />
              </>
            )}
          </Combobox.Value>
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.List>
            {(item: TagItem) => {
              if (item.isCreateItem) {
                return (
                  <Combobox.Item
                    key={item.id}
                    value={item}
                    onClick={e => {
                      e.preventBaseUIHandler();
                      handleCreateTag(inputValue);
                    }}
                  >
                    {createTag.isPending ? <Spinner /> : <PlusIcon />}
                    <Trans message={`Create "${inputValue}"`} />
                  </Combobox.Item>
                );
              }
              return (
                <Combobox.Item key={item.id} value={item}>
                  {item.name}
                </Combobox.Item>
              );
            }}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-xs" className="size-4" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Tags are used to organize your content in the dashboard." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

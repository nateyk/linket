import {Item} from '@common/shadcn/item/item';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {VirtualizedCombobox} from '@shadcn/forms/combobox/virtualized-combobox';
import {Field} from '@shadcn/forms/field';
import {InputGroupAddon} from '@shadcn/forms/input-group/input-group';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {getCountryList} from '@ui/utils/intl/countries';
import {GlobeIcon, InboxIcon} from 'lucide-react';
import * as React from 'react';
import {useRef, useState} from 'react';
import preview from '@storybook/preview';

const frameworks = [
  {label: message('Next.js'), value: 'next'},
  {label: message('SvelteKit'), value: 'sveltekit'},
  {label: message('Nuxt.js'), value: 'nuxt'},
  {label: message('Remix'), value: 'remix'},
  {label: message('Astro'), value: 'astro'},
] as const;
type Framework = (typeof frameworks)[number];

const countries = getCountryList().map(country => ({
  label: country.name,
  value: country.code,
}));

const meta = preview.meta({
  title: 'Combobox',
  component: Combobox.Root,
  subcomponents: {
    ComboboxInput: Combobox.Input,
    ComboboxValue: Combobox.Value,
    ComboboxTrigger: Combobox.Trigger,
    ComboboxClear: Combobox.Clear,
    ComboboxInsetInput: Combobox.InsetInput,
    ComboboxButtonTrigger: Combobox.ButtonTrigger,
    ComboboxContent: Combobox.Content,
    ComboboxList: Combobox.List,
    ComboboxItem: Combobox.Item,
    ComboboxGroup: Combobox.Group,
    ComboboxGroupLabel: Combobox.GroupLabel,
    ComboboxCollection: Combobox.Collection,
    ComboboxEmpty: Combobox.Empty,
    ComboboxSeparator: Combobox.Separator,
    ComboboxChips: Combobox.Chips,
    ComboboxChip: Combobox.Chip,
    ComboboxChipsInput: Combobox.ChipsInput,
  },
});

export const Basic = meta.story({
  render: () => (
    <Combobox.Root
      items={frameworks}
      itemToStringLabel={(item: Framework) => item.label.message}
      isItemEqualToValue={(item1, item2) => item1.value === item2.value}
    >
      <Combobox.Input placeholder="Select a framework">
        <InputGroupAddon>
          <GlobeIcon />
        </InputGroupAddon>
      </Combobox.Input>
      <Combobox.Content>
        <Combobox.Empty>
          <Trans message="No items found." />
        </Combobox.Empty>
        <Combobox.List>
          {(item: Framework) => (
            <Combobox.Item key={item.value} value={item}>
              <Trans {...item.label} />
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  ),
});

export const ItemsWithDescriptionAndMedia = meta.story({
  render: () => (
    <div className="w-full max-w-md">
      <Combobox.Root
        itemToStringLabel={(item: Framework) => item.label.message}
        isItemEqualToValue={(item1, item2) => item1.value === item2.value}
        items={frameworks}
      >
        <Combobox.Input placeholder="Select a framework" />
        <Combobox.Content>
          <Combobox.Empty>
            <Trans message="No items found." />
          </Combobox.Empty>
          <Combobox.List>
            {(framework: Framework) => (
              <Combobox.Item key={framework.value} value={framework}>
                <Item size="xs" className="p-0">
                  <Item.Media variant="icon">
                    <InboxIcon />
                  </Item.Media>
                  <Item.Content>
                    <Item.Title className="whitespace-nowrap">
                      <Trans {...framework.label} />
                    </Item.Title>
                    <Item.Description>
                      <Trans message="Description" />
                    </Item.Description>
                  </Item.Content>
                </Item>
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  ),
});

export const Multiple = meta.story({
  render: function Render() {
    const [value, setValue] = React.useState<Framework[]>([frameworks[0]]);

    return (
      <div className="w-full max-w-md">
        <Combobox.Root
          itemToStringLabel={(item: Framework) => item.label.message}
          items={frameworks}
          multiple
          value={value}
          onValueChange={setValue}
        >
          <Combobox.Chips>
            <Combobox.Value>
              {value.map((item: Framework) => (
                <Combobox.Chip key={item.value}>
                  {item.label.message}
                </Combobox.Chip>
              ))}
              <Combobox.ChipsInput placeholder="Add framework" />
            </Combobox.Value>
          </Combobox.Chips>
          <Combobox.Content>
            <Combobox.Empty>
              <Trans message="No items found." />
            </Combobox.Empty>
            <Combobox.List>
              {(item: Framework) => (
                <Combobox.Item key={item.value} value={item}>
                  <Trans {...item.label} />
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Content>
        </Combobox.Root>
      </div>
    );
  },
});

export const InputInsidePopup = meta.story({
  render: () => (
    <Combobox.Root items={countries} defaultValue={countries[0]}>
      <Combobox.ButtonTrigger
        placeholder={<Trans message="Select a country" />}
      />
      <Combobox.Content className="w-sm" align="center">
        <Combobox.InsetInput placeholder="Search" />
        <Combobox.Empty>
          <Trans message="No items found." />
        </Combobox.Empty>
        <Combobox.List>
          {(item: Combobox.GenericItem) => (
            <Combobox.Item key={item.value} value={item}>
              {item.label}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  ),
});

const timezones = [
  {
    value: 'Americas',
    items: [
      '(GMT-5) New York',
      '(GMT-8) Los Angeles',
      '(GMT-6) Chicago',
      '(GMT-5) Toronto',
      '(GMT-8) Vancouver',
      '(GMT-3) São Paulo',
    ],
  },
  {
    value: 'Europe',
    items: [
      '(GMT+0) London',
      '(GMT+1) Paris',
      '(GMT+1) Berlin',
      '(GMT+1) Rome',
      '(GMT+1) Madrid',
      '(GMT+1) Amsterdam',
    ],
  },
  {
    value: 'Asia/Pacific',
    items: [
      '(GMT+9) Tokyo',
      '(GMT+8) Shanghai',
      '(GMT+8) Singapore',
      '(GMT+4) Dubai',
      '(GMT+11) Sydney',
      '(GMT+9) Seoul',
    ],
  },
] as const;

export const GroupedWithSeparator = meta.story(() => {
  return (
    <Combobox.Root items={timezones}>
      <Combobox.Input placeholder="Select a timezone" />
      <Combobox.Content>
        <Combobox.Empty>No timezones found.</Combobox.Empty>
        <Combobox.List>
          {(group, index) => (
            <Combobox.Group key={group.value} items={group.items}>
              <Combobox.GroupLabel>{group.value}</Combobox.GroupLabel>
              <Combobox.Collection>
                {item => (
                  <Combobox.Item key={item} value={item}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.Collection>
              {index < timezones.length - 1 && <Combobox.Separator />}
            </Combobox.Group>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  );
});

type VirtualizedItem = {id: string; name: string};

const getItemLabel = (item: VirtualizedItem | null) => (item ? item.name : '');

const virtualizedItems: VirtualizedItem[] = Array.from(
  {length: 10000},
  (_, index) => {
    const id = String(index + 1);
    const indexLabel = id.padStart(4, '0');
    return {id, name: `Item ${indexLabel}`};
  },
);

export const Virtualized = meta.story(() => {
  const [open, setOpen] = useState(false);
  const virtualizerRef = useRef<VirtualizedCombobox.Virtualizer | null>(null);

  return (
    <div className="w-full max-w-md">
      <Field.Root>
        <Field.Label>Search 10,000 items</Field.Label>
        <VirtualizedCombobox.Root
          items={virtualizedItems}
          open={open}
          onOpenChange={setOpen}
          itemToStringValue={getItemLabel}
          virtualizerRef={virtualizerRef}
        >
          <Combobox.Input />
          <Combobox.Content>
            <Combobox.Empty>
              <Trans message="No countries found." />
            </Combobox.Empty>
            <VirtualizedCombobox.List
              enabled={open}
              virtualizerRef={virtualizerRef}
            >
              {(item: VirtualizedItem) => (
                <Combobox.Item value={item}>{item.name}</Combobox.Item>
              )}
            </VirtualizedCombobox.List>
          </Combobox.Content>
        </VirtualizedCombobox.Root>
      </Field.Root>
    </div>
  );
});

export const ComboboxInvalid = meta.story({
  render: () => (
    <Combobox.Root
      itemToStringLabel={(item: Framework) => item.label.message}
      items={frameworks}
    >
      <Combobox.Input placeholder="Select a framework" aria-invalid="true" />
      <Combobox.Content>
        <Combobox.Empty>No items found.</Combobox.Empty>
        <Combobox.List>
          {(item: Framework) => (
            <Combobox.Item key={item.value} value={item}>
              <Trans {...item.label} />
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox.Root>
  ),
});

const queryClient = new QueryClient();
type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export const AsyncSingle = meta.story({
  decorators: [
    Story => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  render: function Render() {
    const [searchValue, setSearchValue] = useState<string>('');
    const [selectedValue, setSelectedValue] = useState<Todo | undefined | null>(
      null,
    );

    const query = useQuery<Todo[]>({
      queryKey: ['todos', searchValue],
      queryFn: () =>
        fetch('https://jsonplaceholder.typicode.com/todos').then(
          async response => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            let items = await response.json();
            if (searchValue) {
              items = items.filter((item: Todo) =>
                item.title.includes(searchValue),
              );
            }
            return items.slice(0, 20);
          },
        ),
      placeholderData: keepPreviousData,
    });

    const isLoading = query.isFetching || query.isLoading;

    return (
      <div className="w-full max-w-md">
        <Combobox.Root
          items={query.data}
          value={selectedValue}
          filter={null}
          onValueChange={nextItem => setSelectedValue(nextItem)}
          inputValue={searchValue}
          onInputValueChange={nextInputValue => setSearchValue(nextInputValue)}
          itemToStringValue={item => item.id.toString()}
          itemToStringLabel={item => item.title}
          isItemEqualToValue={(item1, item2) => item1.id === item2.id}
        >
          <Combobox.Input placeholder="Select a todo" isLoading={isLoading} />
          <Combobox.Content>
            {query.data?.length === 0 && !isLoading && (
              <Combobox.Empty>No todos found.</Combobox.Empty>
            )}
            <Combobox.List>
              {(item: Todo) => (
                <Combobox.Item key={item.id} value={item}>
                  {item.title}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Content>
        </Combobox.Root>
      </div>
    );
  },
});

export const AsyncMultiple = meta.story({
  decorators: [
    Story => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  render: function Render() {
    const [searchValue, setSearchValue] = useState<string>('');
    const [selectedValue, setSelectedValue] = useState<Todo[]>([]);

    const query = useQuery<Todo[]>({
      queryKey: ['todos', searchValue],
      queryFn: () =>
        fetch('https://jsonplaceholder.typicode.com/todos').then(
          async response => {
            await new Promise(resolve => setTimeout(resolve, 200));
            let items = await response.json();
            if (searchValue) {
              items = items.filter((item: Todo) =>
                item.title.includes(searchValue),
              );
            }
            return items.slice(0, 20);
          },
        ),
      placeholderData: keepPreviousData,
    });

    return (
      <div className="w-full max-w-md">
        <Combobox.Root
          items={query.data}
          filter={null}
          multiple
          value={selectedValue}
          onValueChange={nextValue => setSelectedValue(nextValue)}
          inputValue={searchValue}
          onInputValueChange={nextInputValue => setSearchValue(nextInputValue)}
          itemToStringValue={item => item.id.toString()}
          itemToStringLabel={item => item.title}
          isItemEqualToValue={(item1, item2) => item1.id === item2.id}
        >
          <Combobox.Chips>
            <Combobox.Value>
              {selectedValue.map(item => (
                <Combobox.Chip key={item.id}>{item.title}</Combobox.Chip>
              ))}
              <Combobox.ChipsInput placeholder="Add todo" />
            </Combobox.Value>
          </Combobox.Chips>
          <Combobox.Content>
            <Combobox.Empty>
              <Trans message="Try different search term." />
            </Combobox.Empty>
            <Combobox.List>
              {(item: Todo) => (
                <Combobox.Item key={item.id} value={item}>
                  {item.title}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Content>
        </Combobox.Root>
      </div>
    );
  },
});

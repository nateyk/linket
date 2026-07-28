import {AdminDocsUrls} from '@app/admin/admin-config';
import {MenuItemForm} from '@common/admin/menus/menu-item-form';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {useSettingsPageStore} from '@common/admin/settings/layout/settings-page-store';
import {SettingsWithPreview} from '@common/admin/settings/layout/settings-with-preview';
import {useAvailableRoutes} from '@common/admin/settings/pages/menu-settings/use-available-routes';
import {loadMenuEditorConfigOptions} from '@common/admin/settings/settings-queries';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {MenuItemConfig} from '@common/menus/menu-config';
import {Accordion} from '@shadcn/accordion/accordion';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Empty} from '@shadcn/empty/empty';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Separator} from '@shadcn/separator';
import {useQuery, useSuspenseQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useFilter} from '@ui/i18n/use-filter';
import {useTrans} from '@ui/i18n/use-trans';
import {createSvgIconFromTree} from '@ui/icons/create-svg-icon';
import {
  useSortable,
  UseSortableProps,
} from '@ui/interactions/dnd/sortable/use-sortable';
import {moveItemInNewArray} from '@ui/utils/array/move-item-in-new-array';
import {ucFirst} from '@ui/utils/string/uc-first';
import {
  ChevronRightIcon,
  GripHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import {nanoid} from 'nanoid';
import {Fragment, useCallback, useRef, useState} from 'react';
import {
  useFieldArray,
  useForm,
  useFormContext,
  useForm as useHookForm,
  useWatch,
} from 'react-hook-form';

export function Component() {
  const {trans} = useTrans();
  const {data} = useAdminSettings();

  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        menus: data?.client.menus ?? [],
      },
    },
  });

  const handleAddNewMenu = () => {
    const id = nanoid(10);

    form.setValue(
      'client.menus',
      [
        {
          name: trans(
            message('New menu :number', {
              values: {
                number: form.getValues('client.menus').length + 1,
              },
            }),
          ),
          id,
          positions: [],
          items: [],
        },
        ...form.getValues('client.menus'),
      ],
      {shouldDirty: true},
    );
  };

  return (
    <SettingsWithPreview
      title={<Trans message="Menus" />}
      defaultRoute="/"
      docsLink={AdminDocsUrls.settings.menus}
    >
      <SettingsWithPreview.Content className="scrollbar-gutter-stable">
        <SettingsWithPreview.Form form={form}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddNewMenu()}
            className="mb-3"
          >
            <PlusIcon />
            <Trans message="Add new menu" />
          </Button>
          <MenuList />
        </SettingsWithPreview.Form>
      </SettingsWithPreview.Content>
      <SettingsWithPreview.Preview />
    </SettingsWithPreview>
  );
}

function useSyncPreviewRouteWithActiveMenu() {
  const form = useFormContext<AdminSettings>();
  const setPreviewRoute = useSettingsPageStore(s => s.setPreviewRoute);
  const {
    data: {config},
  } = useSuspenseQuery(loadMenuEditorConfigOptions());

  return useCallback(
    (menuId: string | number | null) => {
      const menu = form.getValues('client.menus').find(m => m.id === menuId);
      if (menu) {
        menu.positions.forEach(positionName => {
          const position = config.positions.find(r => r.name === positionName);
          if (position) {
            setPreviewRoute(position.route);
          }
        });
      } else {
        setPreviewRoute('/');
      }
    },
    [config.positions, form, setPreviewRoute],
  );
}

function MenuList() {
  const syncPreviewRouteWithActiveMenu = useSyncPreviewRouteWithActiveMenu();
  const form = useFormContext<AdminSettings>();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const menus = useWatch({
    control: form.control,
    name: 'client.menus',
  });

  return (
    <Accordion.Root
      variant="separated"
      value={expandedMenus}
      onValueChange={nextValue => {
        setExpandedMenus(nextValue);
        syncPreviewRouteWithActiveMenu(nextValue[0]);
      }}
    >
      {menus.map((menu, index) => (
        <Accordion.Item key={menu.id} value={menu.id}>
          <Accordion.Trigger>{menu.name}</Accordion.Trigger>
          <Accordion.Content>
            <MenuEditor id={menu.id} index={index} />
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

function MenuEditor({id, index}: {id: string; index: number}) {
  const menuFormPath = `client.menus.${index}` as const;
  return (
    <div className="flex flex-col gap-2">
      <Field.Group>
        <HookForm.Field name={`${menuFormPath}.name`}>
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input />
          <Field.Error />
        </HookForm.Field>
        <MenuPositionsField name={`${menuFormPath}.positions`} />
      </Field.Group>
      <Separator className="my-2" />
      <MenuItemsManager formPath={`${menuFormPath}.items`} />
      <DeleteMenuTrigger menuId={id} />
    </div>
  );
}

interface MenuPositionsFieldProps {
  name: `client.menus.${number}.positions`;
}
function MenuPositionsField({name}: MenuPositionsFieldProps) {
  const syncPreviewRouteWithActiveMenu = useSyncPreviewRouteWithActiveMenu();
  const form = useFormContext<AdminSettings>();
  const {data} = useSuspenseQuery(loadMenuEditorConfigOptions());
  const positions = data.config.positions;

  const labelForPosition = (positionName: string) =>
    positions.find(position => position.name === positionName)?.label ??
    positionName;

  return (
    <HookForm.Field name={name}>
      <Field.Label>
        <Trans message="Where should this menu appear on the site?" />
      </Field.Label>
      <Combobox.Root
        multiple
        items={positions.map(position => position.name)}
        onValueChange={(value: string[]) => {
          form.setValue(name, value, {shouldDirty: true});
          if (value[0]) {
            syncPreviewRouteWithActiveMenu(value[0]);
          }
        }}
      >
        <Combobox.Chips>
          <Combobox.Value>
            {(values: string[]) =>
              values.map(value => (
                <Combobox.Chip key={value}>
                  {labelForPosition(value)}
                </Combobox.Chip>
              ))
            }
          </Combobox.Value>
          <Combobox.ChipsInput />
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.Empty>
            <Trans message="No positions found" />
          </Combobox.Empty>
          <Combobox.List>
            {(position: string) => (
              <Combobox.Item key={position} value={position}>
                {labelForPosition(position)}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

interface MenuItemsManagerProps {
  formPath: string;
}
export function MenuItemsManager({formPath}: MenuItemsManagerProps) {
  const typedFormPath = formPath as `client.menus.${number}.items`;
  const form = useFormContext<AdminSettings>();
  const items =
    useWatch({
      control: form.control,
      name: formPath as `client.menus.${number}.items`,
    }) ?? [];

  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null,
  );
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  return (
    <Fragment>
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="font-medium">
          <Trans message="Menu items" />
        </div>

        <Drawer.Root
          position="right"
          open={addDrawerOpen}
          onOpenChange={setAddDrawerOpen}
        >
          <Drawer.Trigger
            render={
              <Button type="button" variant="ghost" color="primary" size="sm" />
            }
          >
            <PlusIcon />
            <Trans message="Add" />
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>
                  <Trans message="Add menu item" />
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <AddMenuItemContent
                  onAdd={menuItemConfig => {
                    form.setValue(typedFormPath, [...items, menuItemConfig], {
                      shouldDirty: true,
                    });
                    setAddDrawerOpen(false);
                  }}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <MenuListItem
            key={item.id}
            item={item}
            items={items}
            onClick={() => setSelectedItemIndex(index)}
            onSortEnd={(oldIndex, newIndex) => {
              form.setValue(
                typedFormPath,
                moveItemInNewArray(items, oldIndex, newIndex),
                {shouldDirty: true},
              );
            }}
          />
        ))}
      </div>

      {!items.length ? (
        <Empty.Root className="p-4">
          <Empty.Header>
            <Empty.Title className="text-base">
              <Trans message="No menu items yet" />
            </Empty.Title>
            <Empty.Description>
              <Trans message="Click “add“ button to start adding links, pages, routes and other items to this menu." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      ) : null}

      {selectedItemIndex !== null && (
        <Drawer.Root
          position="right"
          open
          onOpenChange={isOpen => {
            if (!isOpen) {
              setSelectedItemIndex(null);
            }
          }}
        >
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Content>
              <Drawer.Header className="flex-row items-center justify-between gap-4">
                <Drawer.Title>
                  <Trans message="Edit menu item" />
                </Drawer.Title>
                <Drawer.Close
                  render={<Button type="button" variant="outline" size="sm" />}
                >
                  <Trans message="Save & close" />
                </Drawer.Close>
              </Drawer.Header>
              <Drawer.Body>
                <MenuItemForm
                  formPathPrefix={`${formPath}.${selectedItemIndex}`}
                />
                <div className="mt-6 text-right">
                  <DeleteMenuItemTrigger
                    itemsPath={formPath}
                    itemIndex={selectedItemIndex}
                    onDelete={() => setSelectedItemIndex(null)}
                  />
                </div>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </Fragment>
  );
}

interface AddMenuItemContentProps {
  onAdd: (item: MenuItemConfig) => void;
}
function AddMenuItemContent({onAdd}: AddMenuItemContentProps) {
  const {data} = useQuery(loadMenuEditorConfigOptions());
  const routeItems = useAvailableRoutes();
  const categories = data?.categories ?? [];

  return (
    <Accordion.Root variant="separated">
      <Accordion.Item value="link">
        <Accordion.Trigger>
          <Trans message="Link" />
        </Accordion.Trigger>
        <Accordion.Content>
          <AddCustomLinkForm onAdd={onAdd} />
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="route">
        <Accordion.Trigger>
          <Trans message="Route" />
        </Accordion.Trigger>
        <Accordion.Content>
          <AddRouteItems items={routeItems} onAdd={onAdd} />
        </Accordion.Content>
      </Accordion.Item>
      {categories.map(category => (
        <Accordion.Item key={category.name} value={category.name}>
          <Accordion.Trigger>
            <Trans message={category.name} />
          </Accordion.Trigger>
          <Accordion.Content>
            <AddRouteItems items={category.items} onAdd={onAdd} />
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

interface AddCustomLinkFormProps {
  onAdd: (item: MenuItemConfig) => void;
}
function AddCustomLinkForm({onAdd}: AddCustomLinkFormProps) {
  const form = useHookForm<MenuItemConfig>({
    defaultValues: {
      id: nanoid(6),
      type: 'link',
      target: '_blank',
      order: 0,
    },
  });

  const selectItems = [
    {
      label: <Trans message="New window" />,
      value: '_blank',
    },
    {
      label: <Trans message="Same window" />,
      value: '_self',
    },
  ];

  return (
    <HookForm.Root form={form} onSubmit={onAdd}>
      <div className="flex flex-col gap-3">
        <HookForm.Field name="label">
          <Field.Label>
            <Trans message="Label" />
          </Field.Label>
          <Input required />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="action">
          <Field.Label>
            <Trans message="Url" />
          </Field.Label>
          <Input required type="url" placeholder="https://" />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="target">
          <Field.Label>
            <Trans message="Open link in" />
          </Field.Label>
          <Select.Root items={selectItems}>
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {selectItems.map(item => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Error />
        </HookForm.Field>
        <Button
          type="submit"
          color="primary"
          size="sm"
          className="mt-2 ml-auto w-full"
        >
          <PlusIcon />
          <Trans message="Add to menu" />
        </Button>
      </div>
    </HookForm.Root>
  );
}

interface AddRouteItemsProps {
  items: Partial<MenuItemConfig>[];
  onAdd: (item: MenuItemConfig) => void;
}
function AddRouteItems({items, onAdd}: AddRouteItemsProps) {
  const {trans} = useTrans();
  const [searchQuery, setSearchQuery] = useState('');
  const {contains} = useFilter({
    sensitivity: 'base',
  });
  const matchedItems = items.filter(item =>
    contains(item.action ?? item.label ?? '', searchQuery),
  );

  const addItem = (item: Partial<MenuItemConfig>) => {
    const label = item.label
      ? ucFirst(item.label.split('/').pop() || item.label)
      : '';

    onAdd({
      ...item,
      id: nanoid(6),
      type: item.type ?? 'route',
      label,
      action: item.action ?? '',
      target: item.target ?? '_self',
      order: item.order ?? 0,
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          bindToHookForm={false}
          placeholder={trans(message('Search...'))}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </InputGroup>
      {matchedItems.map(item => (
        <Button
          key={`${item.type}-${item.action}-${item.label}`}
          type="button"
          variant="outline"
          color="default"
          className="justify-start shadow-none"
          onClick={() => addItem(item)}
        >
          <PlusIcon />
          {item.label}
        </Button>
      ))}
      {!matchedItems.length ? (
        <Empty.Root className="p-2">
          <Empty.Header className="gap-1">
            <Empty.Title className="text-base">
              <Trans message="No matching items" />
            </Empty.Title>
            <Empty.Description>
              <Trans message="Try another search query." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      ) : null}
    </div>
  );
}

function DeleteMenuTrigger({menuId}: {menuId: string}) {
  const form = useFormContext<AdminSettings>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = `client.menus` as const;
  const menus = useWatch({
    control: form.control,
    name,
  });
  const menu = menus.find(m => m.id === menuId);

  if (!menu) {
    return null;
  }

  return (
    <AlertDialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialog.Trigger
        className="ml-auto"
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <TrashIcon />
        <Trans message="Delete menu" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete menu" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure? The menu and all of its items will be removed." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              onClick={() => {
                setDialogOpen(false);
                form.setValue(
                  name,
                  menus.filter(m => m.id !== menuId),
                  {
                    shouldDirty: true,
                  },
                );
              }}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

interface MenuListItemProps {
  item: MenuItemConfig;
  items: MenuItemConfig[];
  onSortEnd: UseSortableProps['onSortEnd'];
  onClick: () => void;
}
function MenuListItem({item, items, onSortEnd, onClick}: MenuListItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const {sortableProps, dragHandleRef} = useSortable({
    item,
    items,
    type: 'menuEditorSortable',
    ref,
    onSortEnd,
    strategy: 'liveSort',
  });

  const Icon = item.icon && createSvgIconFromTree(item.icon);
  const iconOnlyLabel = (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {Icon && <Icon size="sm" />}
      (<Trans message="No label..." />)
    </div>
  );

  return (
    <Button
      ref={ref}
      {...sortableProps}
      type="button"
      variant="outline"
      color="default"
      className="w-full justify-start shadow-none"
      onClick={onClick}
    >
      <GripHorizontalIcon
        ref={dragHandleRef}
        className="text-muted-foreground hover:cursor-move"
      />
      {item.label || iconOnlyLabel}
      <ChevronRightIcon
        className="ml-auto text-muted-foreground"
        data-icon="inline-end"
      />
    </Button>
  );
}

interface DeleteMenuItemTriggerProps {
  itemsPath: string;
  itemIndex: number;
  onDelete: () => void;
}
function DeleteMenuItemTrigger({
  itemsPath,
  itemIndex,
  onDelete,
}: DeleteMenuItemTriggerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {fields} = useFieldArray({
    name: itemsPath,
  });
  const {setValue, getValues} = useFormContext();

  const item = fields[+itemIndex] as MenuItemConfig;

  if (!item) return null;

  const handleDelete = () => {
    if (itemIndex > -1) {
      const currentItems = getValues(itemsPath) as MenuItemConfig[];
      setValue(
        itemsPath,
        currentItems.filter((_, i) => i !== +itemIndex),
        {shouldDirty: true},
      );
      setDialogOpen(false);
      onDelete();
    }
  };

  return (
    <AlertDialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialog.Trigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <TrashIcon />
        <Trans message="Delete this item" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete item" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to remove this item from the menu?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action color="danger" onClick={() => handleDelete()}>
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

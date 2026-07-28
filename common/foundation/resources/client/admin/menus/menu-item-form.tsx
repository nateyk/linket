import {
  listPermissionsOptions,
  listRolesOptions,
} from '@common/admin/roles/roles-queries';
import {
  buildPermissionList,
  PermissionGroup,
  prettyName,
} from '@common/auth/ui/permission-selector';
import {MenuItemConfig} from '@common/menus/menu-config';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
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
import {useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {createSvgIconFromTree} from '@ui/icons/create-svg-icon';
import {EditIcon} from '@ui/icons/material/Edit';
import {useSettings} from '@ui/settings/use-settings';
import {Nullable} from '@ui/utils/ts/nullable';
import {Fragment, ReactNode, useMemo, useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';
import {useValueLists} from '../../http/value-lists';
import {IconPickerDialogContent} from '../../ui/icon-picker/icon-picker-dialog-content';
import {useAvailableRoutes} from '../settings/pages/menu-settings/use-available-routes';

interface NameProps {
  prefixName: (name: string) => string;
}

interface MenuItemFormProps {
  formPathPrefix?: string;
  hideRoleAndPermissionFields?: boolean;
  children?: ReactNode;
}
export function MenuItemForm({
  formPathPrefix,
  hideRoleAndPermissionFields,
  children,
}: MenuItemFormProps) {
  const {trans} = useTrans();
  const prefixName = (name: string): string => {
    return formPathPrefix ? `${formPathPrefix}.${name}` : name;
  };

  return (
    <Field.Group>
      <HookForm.Field name={prefixName('label')}>
        <Field.Label>
          <Trans message="Label" />
        </Field.Label>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <IconDialogTrigger prefixName={prefixName} />
          </InputGroupAddon>
          <InputGroupInput placeholder={trans(message('No label...'))} />
        </InputGroup>
        <Field.Error />
      </HookForm.Field>
      {children}
      <DestinationSelector prefixName={prefixName} />
      <TargetSelect prefixName={prefixName} />
      {!hideRoleAndPermissionFields && (
        <Fragment>
          <RoleSelector prefixName={prefixName} />
          <PermissionSelector prefixName={prefixName} />
          <SubscriptionStatusSelector prefixName={prefixName} />
        </Fragment>
      )}
    </Field.Group>
  );
}

function IconDialogTrigger({prefixName}: NameProps) {
  const {setValue, control} = useFormContext<MenuItemConfig>();
  const fieldName = prefixName('icon') as 'icon';
  const watchedItemIcon = useWatch({control: control, name: fieldName});
  const Icon =
    watchedItemIcon && createSvgIconFromTree(watchedItemIcon, '', 'lucide');
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          />
        }
      >
        {Icon ? <Icon /> : <EditIcon />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <IconPickerDialogContent
          onIconSelected={iconTree => {
            setValue(fieldName, iconTree, {
              shouldDirty: true,
            });
            setOpen(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DestinationSelector({prefixName}: NameProps) {
  const form = useFormContext<Nullable<MenuItemConfig>>();
  const currentType = useWatch({
    control: form.control,
    name: prefixName('type') as 'type',
  });
  const {data} = useValueLists(['menuItemCategories']);
  const selectedCategory = (data?.menuItemCategories ?? []).find(
    c => c.type === currentType,
  );
  const {trans} = useTrans();
  const routeItems = useAvailableRoutes();

  const linkTypeItems = useMemo(
    () => [
      {
        value: 'link',
        label: <Trans message="External link" />,
      },
      {
        value: 'route',
        label: <Trans message="Site page" />,
      },
      ...(data?.menuItemCategories ?? []).map(category => ({
        value: category.type,
        label: category.name,
      })),
    ],
    [data],
  );

  const routeSelectItems = useMemo(
    () =>
      routeItems.map(item => ({
        value: item.action!,
        label: item.label!,
      })),
    [routeItems],
  );

  const categoryActionItems = useMemo(
    () =>
      selectedCategory?.items.map(item => ({
        value: item.action,
        label: <Trans message={item.label} />,
      })) ?? [],
    [selectedCategory],
  );

  return (
    <Fragment>
      <HookForm.Field name={prefixName('type')}>
        <Field.Label>
          <Trans message="Link type" />
        </Field.Label>
        <Select.Root
          items={linkTypeItems}
          onValueChange={() => {
            form.setValue(prefixName('action') as 'action', null, {
              shouldDirty: true,
            });
          }}
        >
          <Select.Trigger className="w-full">
            <Select.Value placeholder={<Trans message="Select link type" />} />
          </Select.Trigger>
          <Select.Content>
            {linkTypeItems.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      {currentType === 'link' && (
        <HookForm.Field name={prefixName('action')}>
          <Field.Label>
            <Trans message="Url" />
          </Field.Label>
          <Input
            required
            type="url"
            placeholder={trans({message: 'Enter a url...'})}
          />
          <Field.Error />
        </HookForm.Field>
      )}

      {currentType === 'route' && (
        <HookForm.Field name={prefixName('action')}>
          <Field.Label>
            <Trans message="Page" />
          </Field.Label>
          <Combobox.Root items={routeSelectItems}>
            <Combobox.Input
              placeholder={trans(message('Search pages'))}
              className="w-full"
            />
            <Combobox.Content>
              <Combobox.Empty>
                <Trans message="No pages found" />
              </Combobox.Empty>
              <Combobox.List>
                {item => (
                  <Combobox.Item key={item.value} value={item.value}>
                    {item.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Content>
          </Combobox.Root>
          <Field.Error />
        </HookForm.Field>
      )}

      {selectedCategory && (
        <HookForm.Field name={prefixName('action')}>
          <Field.Label>
            <Trans message={selectedCategory.name} />
          </Field.Label>
          <Combobox.Root items={categoryActionItems}>
            <Combobox.Input
              placeholder={trans(message('Search...'))}
              className="w-full"
            />
            <Combobox.Content>
              <Combobox.Empty>
                <Trans message="No items found" />
              </Combobox.Empty>
              <Combobox.List>
                {item => (
                  <Combobox.Item key={item.value} value={item.value}>
                    {item.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Content>
          </Combobox.Root>
          <Field.Error />
        </HookForm.Field>
      )}
    </Fragment>
  );
}

function RoleSelector({prefixName}: NameProps) {
  const {data} = useQuery(listRolesOptions());
  const {trans} = useTrans();
  const items = data?.data ?? [];

  return (
    <HookForm.Field name={prefixName('roles')}>
      <Field.Label>
        <Trans message="Only show if user has role" />
      </Field.Label>
      <Combobox.Root items={items} multiple>
        <Combobox.Chips>
          <Combobox.Value>
            {(values: number[]) =>
              values.map(roleId => (
                <Combobox.Chip key={roleId}>
                  {items.find(role => role.id === roleId)?.name}
                </Combobox.Chip>
              ))
            }
          </Combobox.Value>
          <Combobox.ChipsInput placeholder={trans({message: 'Add role...'})} />
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.Empty>
            <Trans message="No roles found" />
          </Combobox.Empty>
          <Combobox.List>
            {item => (
              <Combobox.Item key={item.value} value={item.id}>
                {item.name}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function PermissionSelector({prefixName}: NameProps) {
  const permissionQuery = useQuery(listPermissionsOptions('users'));
  const permissions = permissionQuery.data?.data;
  const {trans} = useTrans();

  const groupedPermissions = useMemo(() => {
    return buildPermissionList(permissions || [], []);
  }, [permissions]);

  return (
    <HookForm.Field name={prefixName('permissions')}>
      <Field.Label>
        <Trans message="Only show if user has permissions" />
      </Field.Label>
      <Combobox.Root items={groupedPermissions} multiple>
        <Combobox.Chips>
          <Combobox.Value>
            {(values: string[]) =>
              values.map(permissionName => (
                <Combobox.Chip key={permissionName}>
                  {permissions?.find(p => p.name === permissionName)
                    ?.display_name || permissionName}
                </Combobox.Chip>
              ))
            }
          </Combobox.Value>
          <Combobox.ChipsInput
            placeholder={trans({message: 'Add permission...'})}
          />
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.Empty>
            <Trans message="No permissions found" />
          </Combobox.Empty>
          <Combobox.List>
            {(group: PermissionGroup) => (
              <Combobox.Group key={group.groupName}>
                <Combobox.GroupLabel>
                  {prettyName(group.groupName)}
                </Combobox.GroupLabel>
                {group.items.map(permission => (
                  <Combobox.Item key={permission.name} value={permission.name}>
                    <Trans
                      message={permission.display_name || permission.name}
                    />
                  </Combobox.Item>
                ))}
              </Combobox.Group>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function SubscriptionStatusSelector({prefixName}: NameProps) {
  const {billing} = useSettings();
  if (!billing?.enable) return null;

  const subscriptionItems = [
    {
      value: 'subscribed' as const,
      label: <Trans message="Only show if user is subscribed" />,
    },
    {
      value: 'unsubscribed' as const,
      label: <Trans message="Only show if user is not subscribed" />,
    },
    {
      value: null,
      label: <Trans message="Always show" />,
    },
  ];

  return (
    <HookForm.Field name={prefixName('subscriptionStatus')}>
      <Field.Label>
        <Trans message="Subscription status" />
      </Field.Label>
      <Select.Root items={subscriptionItems}>
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {subscriptionItems.map(item => (
            <Select.Item key={String(item.value)} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function TargetSelect({prefixName}: NameProps) {
  const targetItems = [
    {
      value: '_self' as const,
      label: <Trans message="Same window" />,
    },
    {
      value: '_blank' as const,
      label: <Trans message="New window" />,
    },
  ];

  return (
    <HookForm.Field name={prefixName('target')}>
      <Field.Label>
        <Trans message="Open link in" />
      </Field.Label>
      <Select.Root items={targetItems}>
        <Select.Trigger className="w-full">
          <Select.Value placeholder={<Trans message="Select target" />} />
        </Select.Trigger>
        <Select.Content>
          {targetItems.map(item => (
            <Select.Item key={item.value} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

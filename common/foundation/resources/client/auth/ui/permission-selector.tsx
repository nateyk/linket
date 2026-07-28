import {PermissionConfigItem} from '@app/gen/schemas/permission-config-item';
import {listPermissionsOptions} from '@common/admin/roles/roles-queries';
import {mergeProps} from '@react-aria/utils';
import {useControlledState} from '@react-stately/utils';
import {Accordion} from '@shadcn/accordion/accordion';
import {Field} from '@shadcn/forms/field';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Switch} from '@shadcn/forms/switch/switch';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {DoneAllIcon} from '@ui/icons/material/DoneAll';
import {ucFirst} from '@ui/utils/string/uc-first';
import React, {Fragment} from 'react';
import {useController} from 'react-hook-form';

type PermissionSelectorValueItem = {
  id: number;
  restrictions: {
    name: string;
    value?: string | number | boolean | null;
  }[];
};

type PermissionSelectorItem = Omit<PermissionConfigItem, 'restrictions'> & {
  restrictions: (PermissionConfigItem['restrictions'][number] & {
    value?: string | number | boolean | null;
  })[];
};

interface PermissionSelectorProps {
  value?: PermissionSelectorValueItem[];
  onChange?: (value: PermissionSelectorValueItem[]) => void;
  roleType: string;
}
export const PermissionSelector = React.forwardRef<
  HTMLDivElement,
  PermissionSelectorProps
>(({roleType, ...props}, ref) => {
  const query = useQuery(listPermissionsOptions(roleType));
  const permissions = query.data?.data;

  const [value, setValue] = useControlledState(props.value, [], props.onChange);

  if (!permissions) return null;

  const groupedPermissions = buildPermissionList(permissions, value);

  const onRestrictionChange = (newPermission: PermissionSelectorItem) => {
    const newValue = [...value];
    const index = newValue.findIndex(p => p.id === newPermission.id);
    if (index > -1) {
      newValue.splice(index, 1, newPermission);
    }
    setValue(newValue);
  };

  return (
    <Fragment>
      <Accordion.Root variant="separated" ref={ref}>
        {groupedPermissions.map(({groupName, items, anyChecked}) => (
          <Accordion.Item key={groupName}>
            <Accordion.Trigger className="font-medium">
              {anyChecked ? <DoneAllIcon size="sm" /> : undefined}
              <Trans message={prettyName(groupName)} />
            </Accordion.Trigger>
            <Accordion.Content className="p-0">
              <Field.Root>
                <div className="flex flex-col gap-0">
                  {items.map(permission => {
                    const index = value.findIndex(v => v.id === permission.id);
                    const isChecked = index > -1;
                    return (
                      <div className="border-t p-4" key={permission.id}>
                        <Field.Root className="gap-1">
                          <Field.Label>
                            <Switch
                              value={permission.name}
                              checked={isChecked}
                              onCheckedChange={checked => {
                                if (!checked) {
                                  const newValue = [...value];
                                  newValue.splice(index, 1);
                                  setValue(newValue);
                                } else {
                                  setValue([...value, permission]);
                                }
                              }}
                            />
                            <Trans message={permission.display_name} />
                          </Field.Label>
                          <Field.Description>
                            <Trans message={permission.description} />
                          </Field.Description>
                        </Field.Root>
                        {isChecked && (
                          <Restrictions
                            permission={permission}
                            onChange={onRestrictionChange}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Field.Root>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Fragment>
  );
});

type RestrictionsProps = {
  permission: PermissionSelectorItem;
  onChange?: (newPermission: PermissionSelectorItem) => void;
};
function Restrictions({permission, onChange}: RestrictionsProps) {
  if (!permission?.restrictions?.length) return null;

  const setRestrictionValue = (
    name: string,
    value: PermissionSelectorItem['restrictions'][number]['value'],
  ) => {
    const nextState = {
      ...permission,
      restrictions: permission.restrictions.map(restriction =>
        restriction.name === name ? {...restriction, value} : restriction,
      ),
    };
    onChange?.(nextState);
  };

  return (
    <Field.Group className="p-4">
      {permission.restrictions.map(restriction => {
        const name = (
          <Trans
            message={
              restriction.display_name
                ? restriction.display_name
                : prettyName(restriction.name)
            }
          />
        );
        const description = restriction.description ? (
          <Trans message={restriction.description} />
        ) : undefined;

        if (restriction.type === 'bool') {
          return (
            <Field.Root key={restriction.name}>
              <Field.Label>
                <Switch
                  checked={Boolean(restriction.value)}
                  onCheckedChange={checked => {
                    setRestrictionValue(restriction.name, checked);
                  }}
                />
                {name}
              </Field.Label>
              <Field.Description>{description}</Field.Description>
            </Field.Root>
          );
        }

        return (
          <Field.Root key={restriction.name}>
            <Field.Label>{name}</Field.Label>
            <NumberField
              min={0}
              value={restriction.value ? Number(restriction.value) : null}
              onValueChange={value => {
                setRestrictionValue(restriction.name, value);
              }}
            >
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberField>
            <Field.Description>{description}</Field.Description>
          </Field.Root>
        );
      })}
    </Field.Group>
  );
}

export type FormChipFieldProps = PermissionSelectorProps & {
  name: string;
};
export function FormPermissionSelector(props: FormChipFieldProps) {
  const {
    field: {onChange, value = [], ref},
  } = useController({
    name: props.name,
  });

  const formProps: Partial<PermissionSelectorProps> = {
    onChange,
    value,
  };

  return <PermissionSelector ref={ref} {...mergeProps(formProps, props)} />;
}

export const prettyName = (name: string) => {
  return ucFirst(name.replace('_', ' '));
};

export interface PermissionGroup {
  groupName: string;
  anyChecked: boolean;
  items: PermissionSelectorItem[];
}

// merge "restrictions" from selected value into all permissions to make
// it easier to bind restriction values to form inputs
export function buildPermissionList(
  allPermissions: PermissionSelectorItem[],
  selectedPermissions: PermissionSelectorValueItem[],
) {
  const groupedPermissions: PermissionGroup[] = [];

  allPermissions.forEach(permission => {
    let group = groupedPermissions.find(g => g.groupName === permission.group);
    if (!group) {
      group = {groupName: permission.group, anyChecked: false, items: []};
      groupedPermissions.push(group);
    }

    const index = selectedPermissions.findIndex(p => p.id === permission.id);
    if (index > -1) {
      const mergedPermission = {
        ...permission,
        restrictions: mergeRestrictions(
          permission.restrictions,
          selectedPermissions[index]?.restrictions ?? [],
        ),
      };
      group.anyChecked = true;
      group.items.push(mergedPermission);
    } else {
      group.items.push(permission);
    }
  });

  return groupedPermissions;
}

function mergeRestrictions(
  allRestrictions: PermissionSelectorItem['restrictions'],
  selectedRestrictions: PermissionSelectorValueItem['restrictions'],
): PermissionSelectorItem['restrictions'] {
  return allRestrictions?.map(restriction => {
    const selected = selectedRestrictions?.find(
      r => r.name === restriction.name,
    );
    if (selected) {
      return {...restriction, value: selected.value};
    } else {
      return restriction;
    }
  });
}

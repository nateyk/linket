import {listRoles} from '@app/gen/roles';
import {Role} from '@app/gen/schemas/role';
import {rolesBaseKey} from '@common/admin/roles/roles-queries';
import {useAuth} from '@common/auth/use-auth';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';

export function UserRoleCombobox() {
  const [query, setQuery] = useState('');
  const {data} = useQuery({
    queryKey: [...rolesBaseKey, 'role-combobox', {query}],
    queryFn: () => listRoles({query: query || undefined, type: 'users'}),
  });
  const {hasPermission} = useAuth();
  const roles = data?.data ?? [];
  const canEditRoles = hasPermission('users.update');

  return (
    <HookForm.Field name="roles">
      <Field.Root>
        <Field.Label>
          <Trans message="Roles" />
        </Field.Label>
        <Combobox.Root
          items={roles}
          inputValue={query}
          onInputValueChange={setQuery}
          multiple
          disabled={!canEditRoles}
        >
          <Combobox.Chips>
            <Combobox.Value>
              {(selectedRoles: Role[]) => (
                <>
                  {selectedRoles.map(role => (
                    <Combobox.Chip key={role.id}>{role.name}</Combobox.Chip>
                  ))}
                  <Combobox.ChipsInput />
                </>
              )}
            </Combobox.Value>
          </Combobox.Chips>
          <Combobox.Content>
            <Combobox.Empty>
              <Trans message="No roles found." />
            </Combobox.Empty>
            <Combobox.List>
              {(role: Role) => (
                <Combobox.Item key={role.id} value={role}>
                  {role.name}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Content>
        </Combobox.Root>
        <Field.Description>
          <Trans message="User will inherit all permissions from the roles they are assigned." />
        </Field.Description>
        <Field.Error />
      </Field.Root>
    </HookForm.Field>
  );
}

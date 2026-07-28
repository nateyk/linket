import {User} from '@app/gen/schemas/user';
import {UpdateUserForm} from '@common/admin/users/update-user-page/update-user-form';
import {UserRoleCombobox} from '@common/admin/users/update-user-page/user-role-combobox';
import {UpdateUserFormValue} from '@common/admin/users/users-queries';
import {FormPermissionSelector} from '@common/auth/ui/permission-selector';
import {Field} from '@shadcn/forms/field';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {useOutletContext} from 'react-router';

type Props = {
  roleType?: string;
};
export function Component({roleType = 'users'}: Props) {
  const user = useOutletContext() as User;
  const form = useForm<UpdateUserFormValue>({
    defaultValues: {
      permissions: user.permissions,
      roles: user.roles,
    },
  });

  return (
    <UpdateUserForm form={form}>
      <Field.Group>
        <UserRoleCombobox />

        <div>
          <Field.Title className="mb-2">
            <Trans message="Permissions" />
          </Field.Title>
          <FormPermissionSelector name="permissions" roleType={roleType} />
        </div>
      </Field.Group>
    </UpdateUserForm>
  );
}

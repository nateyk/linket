import {User} from '@app/gen/schemas/user';
import {UpdateUserForm} from '@common/admin/users/update-user-page/update-user-form';
import {UpdateUserFormValue} from '@common/admin/users/users-queries';
import {CountryCombobox} from '@common/auth/ui/account-settings/country-combobox';
import {LanguageSelect} from '@common/auth/ui/account-settings/language-select';
import {TimezoneSelect} from '@common/auth/ui/account-settings/timezone-select';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {useOutletContext} from 'react-router';

export function Component() {
  const user = useOutletContext() as User;
  const form = useForm<UpdateUserFormValue>({
    defaultValues: {
      language: user.language || '',
      country: user.country || '',
      timezone: user.timezone || 'UTC',
    },
  });
  return (
    <UpdateUserForm form={form}>
      <Field.Group>
        <HookForm.Field name="language">
          <Field.Label>
            <Trans message="Language" />
          </Field.Label>
          <LanguageSelect />
          <Field.Error />
        </HookForm.Field>

        <HookForm.Field name="country">
          <Field.Label>
            <Trans message="Country" />
          </Field.Label>
          <CountryCombobox />
          <Field.Error />
        </HookForm.Field>

        <HookForm.Field name="timezone">
          <Field.Label>
            <Trans message="Timezone" />
          </Field.Label>
          <TimezoneSelect />
          <Field.Error />
        </HookForm.Field>
      </Field.Group>
    </UpdateUserForm>
  );
}

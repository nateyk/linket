import {UpdateUserBody} from '@app/gen/schemas/update-user-body';
import {User} from '@app/gen/schemas/user';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {updateDetailsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {CountryCombobox} from '@common/auth/ui/account-settings/country-combobox';
import {LanguageSelect} from '@common/auth/ui/account-settings/language-select';
import {TimezoneSelect} from '@common/auth/ui/account-settings/timezone-select';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useChangeLocale} from '@common/locale-switcher/change-locale';
import {HookForm} from '@common/shadcn/forms/form/hook-form';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useId} from 'react';
import {useForm} from 'react-hook-form';

export function LocalizationPanel({user}: {user: User}) {
  const formId = useId();
  const form = useForm<UpdateUserBody>({
    defaultValues: {
      language: user.language || '',
      country: user.country || '',
      timezone: user.timezone || 'UTC',
    },
  });
  const updateDetails = useMutation(updateDetailsOptions(user.id));
  const changeLocale = useChangeLocale();

  const handleUpdateDetails = (value: UpdateUserBody) => {
    updateDetails.mutate(value, {
      onSuccess: () => {
        toast.success(<Trans message="Updated account details" />);
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.LocationAndLanguage}
      title={<Trans message="Date, time and language" />}
      actions={
        <Button
          type="submit"
          variant="default"
          color="primary"
          form={formId}
          size="sm"
          disabled={updateDetails.isPending || !form.formState.isValid}
        >
          <Trans message="Save changes" />
        </Button>
      }
    >
      <HookForm.Root
        id={formId}
        form={form}
        onSubmit={newDetails => {
          handleUpdateDetails(newDetails);
          changeLocale.mutate({locale: newDetails.language ?? 'en'});
        }}
      >
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
      </HookForm.Root>
    </AccountSettingsPanel>
  );
}

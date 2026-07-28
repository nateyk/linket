import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {listLocalizationsOptions} from '@common/admin/translations/localizations-queries';
import {TimezoneSelect} from '@common/auth/ui/account-settings/timezone-select';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {useSuspenseQuery} from '@tanstack/react-query';
import {DateFormatPresets, FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';
import {useMemo} from 'react';
import {useForm} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();

  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        dates: {
          default_timezone: data.client.dates?.default_timezone ?? 'auto',
          format: data.client.dates?.format ?? 'auto',
        },
        locale: {
          default: data.client.locale?.default ?? 'auto',
        },
        i18n: {
          enable: data.client.i18n.enable ?? false,
        },
      },
    },
  });

  return (
    <AdminSettingsLayout
      title={<Trans message="Localization" />}
      form={form}
      docsLink={AdminDocsUrls.settings.localization}
    >
      <div className="flex flex-col gap-6">
        <TimezoneSection />
        <LanguageSection />
        <DateFormatSection />
        <TranslationsSection />
      </div>
    </AdminSettingsLayout>
  );
}

function TimezoneSection() {
  const autoItem = useMemo(
    () => ({
      value: 'auto',
      label: <Trans message="Based on browser settings" />,
    }),
    [],
  );

  return (
    <SettingsPanel
      title={<Trans message="Default Timezone" />}
      description={
        <Trans message="Which timezone should be selected by default for new users and guests." />
      }
    >
      <HookForm.Field name="client.dates.default_timezone">
        <Field.Label>
          <Trans message="Timezone" />
        </Field.Label>
        <TimezoneSelect extraItems={[autoItem]} />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function LanguageSection() {
  const optionQuery = useSuspenseQuery(listLocalizationsOptions());
  const localizations = optionQuery.data.data;

  const items = useMemo(
    () => [
      {
        value: 'auto',
        label: <Trans message="Based on browser settings" />,
      },
      ...localizations.map(locale => ({
        value: locale.language,
        label: locale.name,
      })),
    ],
    [localizations],
  );

  return (
    <SettingsPanel
      title={<Trans message="Default Language" />}
      description={
        <Trans message="Which localization should be selected by default for new users and guests." />
      }
    >
      <HookForm.Field name="client.locale.default">
        <Field.Label>
          <Trans message="Language" />
        </Field.Label>
        <Select.Root items={items}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {items.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function DateFormatSection() {
  const today = useCurrentDateTime();
  return (
    <SettingsPanel
      title={<Trans message="Date Format" />}
      description={
        <Trans message="Default verbosity for all dates displayed across the site. Month/day order and separators will be adjusted automatically, based on user's locale." />
      }
    >
      <HookForm.Field name="client.dates.format">
        <RadioGroup>
          <Field.Item>
            <Field.Label>
              <RadioGroupItem value="auto" />
              <Trans message="Auto" />
            </Field.Label>
          </Field.Item>
          {Object.entries(DateFormatPresets).map(([format, options]) => (
            <Field.Item key={format}>
              <Field.Label>
                <RadioGroupItem value={format} />
                <FormattedDate date={today} options={options} />
              </Field.Label>
            </Field.Item>
          ))}
        </RadioGroup>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function TranslationsSection() {
  return (
    <SettingsPanel
      title={<Trans message="Translations" />}
      description={
        <Trans message="If disabled, site will always be shown in default language and user will not be able to change their locale." />
      }
    >
      <HookForm.Field name="client.i18n.enable">
        <Field.Label>
          <Switch />
          <Trans message="Enable translations" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

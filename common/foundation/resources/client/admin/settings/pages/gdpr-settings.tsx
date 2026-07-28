import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsSectionHeader} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {PlusIcon, XIcon} from 'lucide-react';
import {Fragment} from 'react';
import {useFieldArray, useForm, useWatch} from 'react-hook-form';
import {MenuItemForm} from '../../menus/menu-item-form';
import {AdminSettings} from '../admin-settings';
import {AddMenuItemDialog} from './menu-settings/add-menu-item-dialog';

const cookiePositionOptions = [
  {value: 'top', label: <Trans message="Top" />},
  {value: 'bottom', label: <Trans message="Bottom" />},
] as const;

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        cookie_notice: {
          enable: data.client.cookie_notice?.enable ?? false,
          button: data.client.cookie_notice?.button ?? {},
          position: data.client.cookie_notice?.position ?? 'bottom',
        },
        registration: {
          policies: data.client.registration?.policies ?? [],
        },
      },
    },
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="GDPR" />}
      docsLink={AdminDocsUrls.settings.gdpr}
    >
      <CookieNoticeSection />
      <RegistrationPoliciesSection />
    </AdminSettingsLayout>
  );
}

function CookieNoticeSection() {
  const noticeEnabled = useWatch({name: 'client.cookie_notice.enable'});

  return (
    <div className="mb-11">
      <SettingsSectionHeader size="md">
        <Trans message="Cookie Notice" />
        <Trans message="Configure the cookie consent notice shown to visitors from the European Union." />
      </SettingsSectionHeader>

      <div className="flex flex-col gap-5">
        <HookForm.Field name="client.cookie_notice.enable">
          <Field.Label>
            <Switch />
            <Trans message="Enable cookie notice" />
          </Field.Label>
        </HookForm.Field>

        {noticeEnabled && (
          <>
            <HookForm.Field name="client.cookie_notice.position">
              <Field.Label>
                <Trans message="Cookie notice position" />
              </Field.Label>
              <Select.Root items={cookiePositionOptions}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {cookiePositionOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </HookForm.Field>

            <Card.Root>
              <Card.Header>
                <Card.Title>
                  <Trans message="Information button" />
                </Card.Title>
                <Card.Description>
                  <Trans message="Information button shown in the cookie notice." />
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <MenuItemForm
                  hideRoleAndPermissionFields
                  formPathPrefix="client.cookie_notice.button"
                />
              </Card.Content>
            </Card.Root>
          </>
        )}
      </div>
    </div>
  );
}

function RegistrationPoliciesSection() {
  const {fields, append, remove} = useFieldArray<
    AdminSettings,
    'client.registration.policies'
  >({
    name: 'client.registration.policies',
  });

  return (
    <Fragment>
      <SettingsSectionHeader className="my-6" size="md">
        <Trans message="Registration Policies" />
        <Trans message="Create policies that will be shown on the registration page. Users will be required to accept them by toggling a checkbox." />
      </SettingsSectionHeader>

      {!!fields.length && (
        <Accordion variant="separated" className="mb-3">
          {fields.map((field, index) => (
            <Accordion.Item key={field.id} value={field.id}>
              <div className="flex items-center">
                <Accordion.Trigger>{field.label}</Accordion.Trigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="me-2 shrink-0"
                  onClick={() => remove(index)}
                >
                  <XIcon />
                </Button>
              </div>
              <Accordion.Content>
                <MenuItemForm
                  hideRoleAndPermissionFields
                  formPathPrefix={`client.registration.policies.${index}`}
                />
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      <AddMenuItemDialog title={<Trans message="Add policy" />} onAdd={append}>
        <Dialog.Trigger
          render={<Button className="-ml-3" variant="ghost" size="sm" />}
        >
          <PlusIcon />
          <Trans message="Add another policy" />
        </Dialog.Trigger>
      </AddMenuItemDialog>
    </Fragment>
  );
}

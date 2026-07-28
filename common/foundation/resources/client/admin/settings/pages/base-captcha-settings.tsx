import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {CaptchaAction} from '@common/core/settings/base-backend-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

const captchaProviderOptions = [
  {value: 'recaptcha', label: <Trans message="Google reCAPTCHA" />},
  {value: 'turnstile', label: <Trans message="Cloudflare Turnstile" />},
] as const;

interface Props {
  children?: ReactNode;
  actions?: CaptchaAction[];
}
export function Component({children, actions}: Props) {
  const {data} = useAdminSettings();

  const defaultValues: {client: Partial<AdminSettings['client']>} = {
    client: {
      captcha: {
        provider: data.client.captcha?.provider ?? 'turnstile',
        enable: {
          contact: data.client.captcha?.enable?.contact ?? false,
          register: data.client.captcha?.enable?.register ?? false,
        },
        g_site_key: data.client.captcha?.g_site_key ?? '',
        g_secret_key: data.client.captcha?.g_secret_key ?? '',
        t_site_key: data.client.captcha?.t_site_key ?? '',
        t_secret_key: data.client.captcha?.t_secret_key ?? '',
      },
    },
  };

  actions?.forEach(action => {
    defaultValues.client.captcha!.enable![action] =
      data.client.captcha?.enable?.[action] ?? false;
  });

  const form = useForm<AdminSettings>({
    defaultValues,
  });

  return (
    <AdminSettingsLayout title={<Trans message="Captcha" />} form={form}>
      <div className="flex flex-col gap-6">
        <EnableCaptchaPanel>{children}</EnableCaptchaPanel>
        <CaptchaCredentialsPanel />
      </div>
    </AdminSettingsLayout>
  );
}

interface EnableCaptchaPanelProps {
  children?: ReactNode;
}
function EnableCaptchaPanel({children}: EnableCaptchaPanelProps) {
  return (
    <SettingsPanel
      title={<Trans message="Enable captcha" />}
      description={
        <Trans message="Select which pages should be protected by captcha." />
      }
      link={
        AdminDocsUrls.settings.captcha ? (
          <DocsLink link={AdminDocsUrls.settings.captcha}>
            <Trans message="What is captcha?" />
          </DocsLink>
        ) : null
      }
    >
      <Field.Group>
        {children}
        <HookForm.Field name="client.captcha.enable.contact">
          <Field.Label>
            <Switch />
            <Trans message="Contact page" />
          </Field.Label>
          <Field.Description>
            <Trans
              message={'Enable captcha integration for "contact us" page.'}
            />
          </Field.Description>
        </HookForm.Field>
        <HookForm.Field name="client.captcha.enable.register">
          <Field.Label>
            <Switch />
            <Trans message="Registration page" />
          </Field.Label>
          <Field.Description>
            <Trans message="Enable captcha integration for registration page." />
          </Field.Description>
        </HookForm.Field>
      </Field.Group>
    </SettingsPanel>
  );
}

function CaptchaCredentialsPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Provider & credentials" />}
      description={
        <Trans message="Select captcha provider and enter your API credentials." />
      }
    >
      <SettingsErrorGroup
        separatorTop={false}
        separatorBottom={false}
        name="captcha_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field invalid={isInvalid} name="client.captcha.provider">
              <Field.Label>
                <Trans message="Captcha provider" />
              </Field.Label>
              <Select.Root items={captchaProviderOptions}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {captchaProviderOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
            <CaptchaKeysFields isInvalid={isInvalid} />
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

interface CaptchaKeysFieldsProps {
  isInvalid: boolean;
}
function CaptchaKeysFields({isInvalid}: CaptchaKeysFieldsProps) {
  const {clearErrors} = useFormContext<AdminSettings>();
  const provider = useWatch<AdminSettings>({name: 'client.captcha.provider'});

  const clearErrorsOnChange = () => clearErrors();

  if (provider === 'turnstile') {
    return (
      <>
        <HookForm.Field invalid={isInvalid} name="client.captcha.t_site_key">
          <Field.Label>
            <Trans message="Turnstile site key" />
          </Field.Label>
          <Input onChange={clearErrorsOnChange} />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field invalid={isInvalid} name="client.captcha.t_secret_key">
          <Field.Label>
            <Trans message="Turnstile secret key" />
          </Field.Label>
          <Input onChange={clearErrorsOnChange} />
          <Field.Error />
        </HookForm.Field>
      </>
    );
  }

  return (
    <>
      <HookForm.Field invalid={isInvalid} name="client.captcha.g_site_key">
        <Field.Label>
          <Trans message="Google reCAPTCHA site key" />
        </Field.Label>
        <Input onChange={clearErrorsOnChange} />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="client.captcha.g_secret_key">
        <Field.Label>
          <Trans message="Google reCAPTCHA secret key" />
        </Field.Label>
        <Input onChange={clearErrorsOnChange} />
        <Field.Error />
      </HookForm.Field>
    </>
  );
}

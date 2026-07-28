import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {OutoingEmailNotSetupWarning} from '@common/admin/settings/layout/outoing-email-not-configured-warning';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useForm, useWatch} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        require_email_confirmation:
          data.client?.require_email_confirmation ?? false,
        registration: {
          disable: data.client.registration?.disable ?? false,
        },
        social: {
          requireAccount: data.client.social?.requireAccount ?? false,
          compact_buttons: data.client.social?.compact_buttons ?? false,
          envato: {
            enable: data.client.social?.envato?.enable ?? false,
          },
          google: {
            enable: data.client.social?.google?.enable ?? false,
          },
          facebook: {
            enable: data.client.social?.facebook?.enable ?? false,
          },
          twitter: {
            enable: data.client.social?.twitter?.enable ?? false,
          },
        },
        single_device_login: data.client.single_device_login ?? false,
        auth: {
          domain_blacklist: data.client.auth?.domain_blacklist ?? '',
        },
      },
      server: {
        envato_id: data.server?.envato_id ?? '',
        envato_secret: data.server?.envato_secret ?? '',
        envato_personal_token: data.server?.envato_personal_token ?? '',
        google_id: data.server?.google_id ?? '',
        google_secret: data.server?.google_secret ?? '',
        facebook_id: data.server?.facebook_id ?? '',
        facebook_secret: data.server?.facebook_secret ?? '',
        twitter_id: data.server?.twitter_id ?? '',
        twitter_secret: data.server?.twitter_secret ?? '',
        mail_setup: data.server?.mail_setup ?? false,
      },
    },
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="Authentication" />}
      docsLink={AdminDocsUrls.settings.authentication}
    >
      <div className="flex flex-col gap-6">
        <OutoingEmailNotSetupWarning />
        <RegistrationPanel />
        <SocialLoginSettingsPanel />
        <SingleDeviceLoginPanel />
        <DomainBlacklistPanel />
        <EnvatoSection />
        <GoogleSection />
        <FacebookSection />
        <TwitterSection />
      </div>
    </AdminSettingsLayout>
  );
}

function RegistrationPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Registration" />}
      description={<Trans message="Configure user registration settings." />}
    >
      <Field.Group>
        <HookForm.Field name="client.registration.disable">
          <Field.Label>
            <Switch />
            <Trans message="Disable registration" />
          </Field.Label>
          <Field.Description>
            <Trans message="All registration related functionality will be disabled and hidden from users." />
          </Field.Description>
        </HookForm.Field>
        <HookForm.Field name="client.require_email_confirmation">
          <Field.Label>
            <Switch />
            <Trans message="Require email confirmation" />
          </Field.Label>
          <Field.Description>
            <Trans message="Require newly registered users to validate their email address before being able to login." />
          </Field.Description>
        </HookForm.Field>
      </Field.Group>
    </SettingsPanel>
  );
}

function SocialLoginSettingsPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Social Login Settings" />}
      description={
        <Trans message="Configure general settings for social login." />
      }
    >
      <Field.Group>
        <HookForm.Field name="client.social.requireAccount">
          <Field.Label>
            <Switch />
            <Trans message="Social login requires existing account" />
          </Field.Label>
          <Field.Description>
            <Trans message="User will only be able to login via socials, if they have connected it from their account settings page." />
          </Field.Description>
        </HookForm.Field>
        <HookForm.Field name="client.social.compact_buttons">
          <Field.Label>
            <Switch />
            <Trans message="Use compact social login buttons" />
          </Field.Label>
        </HookForm.Field>
      </Field.Group>
    </SettingsPanel>
  );
}

function SingleDeviceLoginPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Single Device Login" />}
      description={
        <Trans message="Control how many devices can access an account simultaneously." />
      }
    >
      <HookForm.Field name="client.single_device_login">
        <Field.Label>
          <Switch />
          <Trans message="Single device login" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

function DomainBlacklistPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Domain Blacklist" />}
      description={
        <Trans message="Comma separated list of domains. Users will not be able to register or login using any email adress from specified domains." />
      }
    >
      <HookForm.Field name="client.auth.domain_blacklist">
        <Field.Label>
          <Trans message="Domains" />
        </Field.Label>
        <Textarea rows={1} />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function EnvatoSection() {
  const settings = useSettings();
  const envatoLoginEnabled = useWatch<AdminSettings>({
    name: 'client.social.envato.enable',
  });

  if (!(settings as any).envato?.enable) return null;

  return (
    <SettingsPanel
      title={<Trans message="Envato Login" />}
      description={
        <Trans message="Configure Envato authentication settings." />
      }
    >
      <SettingsErrorGroup
        separatorBottom={false}
        separatorTop={false}
        name="envato_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field
              invalid={isInvalid}
              name="client.social.envato.enable"
            >
              <Field.Label>
                <Switch />
                <Trans message="Envato login" />
              </Field.Label>
              <Field.Description>
                <Trans message="Enable logging into the site via envato." />
              </Field.Description>
            </HookForm.Field>
            {!!envatoLoginEnabled && (
              <>
                <HookForm.Field invalid={isInvalid} name="server.envato_id">
                  <Field.Label>
                    <Trans message="Envato ID" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field invalid={isInvalid} name="server.envato_secret">
                  <Field.Label>
                    <Trans message="Envato secret" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field
                  invalid={isInvalid}
                  name="server.envato_personal_token"
                >
                  <Field.Label>
                    <Trans message="Envato personal token" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
              </>
            )}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function GoogleSection() {
  const googleLoginEnabled = useWatch<AdminSettings>({
    name: 'client.social.google.enable',
  });

  return (
    <SettingsPanel
      title={<Trans message="Google Login" />}
      description={
        <Trans message="Configure Google authentication settings." />
      }
    >
      <SettingsErrorGroup
        separatorBottom={false}
        separatorTop={false}
        name="google_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field
              invalid={isInvalid}
              name="client.social.google.enable"
            >
              <Field.Label>
                <Switch />
                <Trans message="Google login" />
              </Field.Label>
              <Field.Description>
                <Trans message="Enable logging into the site via google." />
              </Field.Description>
            </HookForm.Field>
            {!!googleLoginEnabled && (
              <>
                <HookForm.Field invalid={isInvalid} name="server.google_id">
                  <Field.Label>
                    <Trans message="Google client ID" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field name="server.google_secret">
                  <Field.Label>
                    <Trans message="Google client secret" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
              </>
            )}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function FacebookSection() {
  const facebookLoginEnabled = useWatch<AdminSettings>({
    name: 'client.social.facebook.enable',
  });

  return (
    <SettingsPanel
      title={<Trans message="Facebook Login" />}
      description={
        <Trans message="Configure Facebook authentication settings." />
      }
    >
      <SettingsErrorGroup
        separatorBottom={false}
        separatorTop={false}
        name="facebook_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field
              invalid={isInvalid}
              name="client.social.facebook.enable"
            >
              <Field.Label>
                <Switch />
                <Trans message="Facebook login" />
              </Field.Label>
              <Field.Description>
                <Trans message="Enable logging into the site via facebook." />
              </Field.Description>
            </HookForm.Field>
            {!!facebookLoginEnabled && (
              <>
                <HookForm.Field invalid={isInvalid} name="server.facebook_id">
                  <Field.Label>
                    <Trans message="Facebook app ID" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field
                  invalid={isInvalid}
                  name="server.facebook_secret"
                >
                  <Field.Label>
                    <Trans message="Facebook app secret" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
              </>
            )}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function TwitterSection() {
  const twitterLoginEnabled = useWatch<AdminSettings>({
    name: 'client.social.twitter.enable',
  });

  return (
    <SettingsPanel
      title={<Trans message="Twitter Login" />}
      description={
        <Trans message="Configure Twitter authentication settings." />
      }
    >
      <SettingsErrorGroup
        name="twitter_group"
        separatorTop={false}
        separatorBottom={false}
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field
              invalid={isInvalid}
              name="client.social.twitter.enable"
            >
              <Field.Label>
                <Switch />
                <Trans message="Twitter login" />
              </Field.Label>
              <Field.Description>
                <Trans message="Enable logging into the site via twitter." />
              </Field.Description>
            </HookForm.Field>
            {!!twitterLoginEnabled && (
              <>
                <HookForm.Field invalid={isInvalid} name="server.twitter_id">
                  <Field.Label>
                    <Trans message="Twitter ID" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field
                  invalid={isInvalid}
                  name="server.twitter_secret"
                >
                  <Field.Label>
                    <Trans message="Twitter secret" />
                  </Field.Label>
                  <Input required />
                  <Field.Error />
                </HookForm.Field>
              </>
            )}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

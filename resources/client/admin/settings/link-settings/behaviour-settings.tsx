import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

interface Props {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
}

const linkTypeOptions = [
  {value: 'direct', label: <Trans message="Direct" />},
  {value: 'frame', label: <Trans message="Frame" />},
  {value: 'splash', label: <Trans message="Splash" />},
] as const;

const aliasContentOptions = [
  {
    value: 'alpha_dash',
    label: <Trans message="Numbers, letters, underscore and dash" />,
  },
  {value: 'alpha_num', label: <Trans message="Numbers or letters" />},
  {value: 'alpha', label: <Trans message="Letters only" />},
  {value: 'numeric', label: <Trans message="Numbers only" />},
] as const;

export function BehaviourSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        links: {
          enable_type: data.client.links?.enable_type ?? false,
          default_type: data.client.links?.default_type ?? 'direct',
          min_len: data.client.links?.min_len ?? 3,
          max_len: data.client.links?.max_len ?? 1000,
          back_half_min: data.client.links?.back_half_min ?? 5,
          back_half_max: data.client.links?.back_half_max ?? 10,
          back_half_content:
            data.client.links?.back_half_content ?? 'alpha_dash',
          retargeting: data.client.links?.retargeting ?? false,
          pixels: data.client.links?.pixels ?? false,
          redirect_time: data.client.links?.redirect_time ?? 10,
          dash_footer: data.client.links?.dash_footer,
        },
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <div className="flex flex-col gap-6">
        <LinkTypePanel />
        <LinkLengthPanel />
        <LinkAliasPanel />
        <LinkRetargetingPanel />
        <TrackingPixelsPanel />
        <SplashPageRedirectPanel />
        <DashboardSettingsPanel />
      </div>
    </AdminSettingsLayout>
  );
}

function LinkTypePanel() {
  return (
    <SettingsPanel
      title={<Trans message="Link type" />}
      description={
        <Trans message="Configure link type selection and default type settings." />
      }
    >
      <Field.Group>
        <HookForm.Field name="client.links.enable_type">
          <Field.Label>
            <Switch />
            <Trans message="Link type selection" />
          </Field.Label>
          <Field.Description>
            <Trans message="Whether user should be able to change type when creating or updating links." />
          </Field.Description>
        </HookForm.Field>

        <HookForm.Field name="client.links.default_type">
          <Field.Label>
            <Trans message="Default link type" />
          </Field.Label>
          <Select.Root items={linkTypeOptions}>
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {linkTypeOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Description>
            <Trans message="What type should newly created links have by default." />
          </Field.Description>
          <Field.Error />
        </HookForm.Field>
      </Field.Group>
    </SettingsPanel>
  );
}

function LinkLengthPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Link length" />}
      description={
        <Trans message="Minimum and maximum length for urls that users will be able to shorten" />
      }
    >
      <div className="flex items-center gap-6">
        <HookForm.Field className="flex-auto" name="client.links.min_len">
          <Field.Label>
            <Trans message="Link min length" />
          </Field.Label>
          <NumberField min={1} required>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberField>
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field className="flex-auto" name="client.links.max_len">
          <Field.Label>
            <Trans message="Link max length" />
          </Field.Label>
          <NumberField min={1} max={2000} required>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberField>
          <Field.Error />
        </HookForm.Field>
      </div>
    </SettingsPanel>
  );
}

function LinkAliasPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Link alias" />}
      description={
        <Trans message="Minimum and maximum length as well as what characters link alias are allowed to contain." />
      }
    >
      <Field.Group>
        <div className="flex items-center gap-6">
          <HookForm.Field
            className="flex-auto"
            name="client.links.back_half_min"
          >
            <Field.Label>
              <Trans message="Alias min length" />
            </Field.Label>
            <NumberField min={1} required>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberField>
            <Field.Error />
          </HookForm.Field>
          <HookForm.Field
            className="flex-auto"
            name="client.links.back_half_max"
          >
            <Field.Label>
              <Trans message="Alias max length" />
            </Field.Label>
            <NumberField min={1} max={50} required>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberField>
            <Field.Error />
          </HookForm.Field>
        </div>
        <HookForm.Field name="client.links.back_half_content">
          <Field.Label>
            <Trans message="Alias content" />
          </Field.Label>
          <Select.Root items={aliasContentOptions}>
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {aliasContentOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Error />
        </HookForm.Field>
      </Field.Group>
    </SettingsPanel>
  );
}

function LinkRetargetingPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Link retargeting" />}
      description={
        <Trans message="Whether redirection based on location, device or platform is enabled." />
      }
    >
      <HookForm.Field name="client.links.retargeting">
        <Field.Label>
          <Switch />
          <Trans message="Enable link retargeting" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

function TrackingPixelsPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Tracking pixels" />}
      description={
        <Trans message="Whether user should be able to apply tracking pixels to links." />
      }
    >
      <HookForm.Field name="client.links.pixels">
        <Field.Label>
          <Switch />
          <Trans message="Enable tracking pixels" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

function SplashPageRedirectPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Splash page redirect" />}
      description={
        <Trans message="After how many seconds should user be redirected to their destination on splash page. 0 will disable automatic redirection." />
      }
    >
      <HookForm.Field name="client.links.redirect_time">
        <Field.Label>
          <Trans message="Redirect time (seconds)" />
        </Field.Label>
        <NumberField min={0} max={60} required>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberField>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function DashboardSettingsPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Dashboard settings" />}
      description={
        <Trans message="Configure dashboard interface appearance." />
      }
    >
      <HookForm.Field name="client.links.dash_footer">
        <Field.Label>
          <Switch />
          <Trans message="Show footer in dashboard" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

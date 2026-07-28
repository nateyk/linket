import {Component as BaseCaptchaSettings} from '@common/admin/settings/pages/base-captcha-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';

export function Component() {
  return (
    <BaseCaptchaSettings actions={['landing_new_link']}>
      <HookForm.Field name="client.captcha.enable.landing_new_link">
        <Field.Label>
          <Switch />
          <Trans message="Link creation" />
        </Field.Label>
        <Field.Description>
          <Trans message="Enable captcha integration when creating links on the landing page." />
        </Field.Description>
      </HookForm.Field>
    </BaseCaptchaSettings>
  );
}

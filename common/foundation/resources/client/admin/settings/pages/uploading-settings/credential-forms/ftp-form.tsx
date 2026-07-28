import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';

type Props = {
  isInvalid?: boolean;
  formPrefix: string;
};
export function FtpForm({isInvalid, formPrefix}: Props) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.host`}>
        <Field.Label>
          <Trans message="FTP hostname" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.username`}
      >
        <Field.Label>
          <Trans message="FTP username" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.password`}
      >
        <Field.Label>
          <Trans message="FTP password" />
        </Field.Label>
        <Input type="password" required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.port`}>
        <Field.Label>
          <Trans message="FTP port" />
        </Field.Label>
        <Input type="number" min={0} placeholder="21" />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.passive`}>
        <Field.Label>
          <Switch />
          <Trans message="Passive" />
        </Field.Label>
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.ssl`}>
        <Field.Label>
          <Switch />
          <Trans message="SSL" />
        </Field.Label>
      </HookForm.Field>
    </Field.Group>
  );
}

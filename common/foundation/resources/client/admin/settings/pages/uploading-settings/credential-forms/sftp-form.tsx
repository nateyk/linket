import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';

type Props = {
  isInvalid?: boolean;
  formPrefix: string;
};
export function SftpForm({isInvalid, formPrefix}: Props) {
  const {trans} = useTrans();
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.host`}>
        <Field.Label>
          <Trans message="SFTP hostname" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.username`}
      >
        <Field.Label>
          <Trans message="SFTP username" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.password`}
      >
        <Field.Label>
          <Trans message="SFTP password" />
        </Field.Label>
        <Input
          type="password"
          placeholder={trans(
            message('Optional, if using key-based authentication'),
          )}
        />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.port`}>
        <Field.Label>
          <Trans message="SFTP port" />
        </Field.Label>
        <Input type="number" min={0} placeholder="22" />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.root`}>
        <Field.Label>
          <Trans message="Root path" />
        </Field.Label>
        <Input placeholder="/" />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.privateKey`}
      >
        <Field.Label>
          <Trans message="Private key path" />
        </Field.Label>
        <Input placeholder={trans(message('Optional'))} />
        <Field.Description>
          <Trans message="Absolute path to private key file for key-based authentication" />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.passphrase`}
      >
        <Field.Label>
          <Trans message="Passphrase" />
        </Field.Label>
        <Input type="password" placeholder={trans(message('Optional'))} />
        <Field.Description>
          <Trans message="Passphrase for encrypted private key" />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

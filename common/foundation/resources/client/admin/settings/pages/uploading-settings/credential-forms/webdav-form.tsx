import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';

type Props = {
  isInvalid?: boolean;
  formPrefix: string;
};
export function WebdavForm({isInvalid, formPrefix}: Props) {
  return (
    <Field.Group>
      <HookForm.Field
        invalid={isInvalid}
        name={`credentials.${formPrefix}.baseUri`}
      >
        <Field.Label>
          <Trans message="WebDAV URL" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`credentials.${formPrefix}.username`}
      >
        <Field.Label>
          <Trans message="WebDAV username" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`credentials.${formPrefix}.password`}
      >
        <Field.Label>
          <Trans message="WebDAV password" />
        </Field.Label>
        <Input type="password" required />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

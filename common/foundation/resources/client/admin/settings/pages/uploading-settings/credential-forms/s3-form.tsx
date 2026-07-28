import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';

type S3FormProps = {
  isInvalid?: boolean;
  formPrefix: string;
  showEndpointField?: boolean;
};
export function S3Form({
  isInvalid,
  formPrefix,
  showEndpointField,
}: S3FormProps) {
  return (
    <Field.Group>
      {showEndpointField && (
        <HookForm.Field
          invalid={isInvalid}
          name={`config.${formPrefix}.endpoint`}
        >
          <Field.Label>
            <Trans message="Endpoint" />
          </Field.Label>
          <Input />
          <Field.Error />
        </HookForm.Field>
      )}
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.key`}>
        <Field.Label>
          <Trans message="Access key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.secret`}>
        <Field.Label>
          <Trans message="Secret key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.region`}>
        <Field.Label>
          <Trans message="Region" />
        </Field.Label>
        <Input required placeholder="us-east-1" />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name={`config.${formPrefix}.bucket`}>
        <Field.Label>
          <Trans message="Bucket" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field
        invalid={isInvalid}
        name={`config.${formPrefix}.direct_upload`}
      >
        <Field.Label>
          <Switch />
          <Trans message="Enable direct upload" />
        </Field.Label>
        <Field.Description>
          <Trans message="Upload files directly from user's browser to cloud storage, bypassing your server. This improves upload speeds and reduces server bandwidth usage." />
        </Field.Description>
      </HookForm.Field>

      {showEndpointField && (
        <HookForm.Field
          invalid={isInvalid}
          name={`config.${formPrefix}.use_path_style_endpoint`}
        >
          <Field.Label>
            <Switch />
            <Trans message="Use path style endpoint" />
          </Field.Label>
          <Field.Description>
            <Trans message="Use 'domain.com/bucket/file.jpg' url style instead of 'bucket.domain.com/file.jpg'" />
          </Field.Description>
        </HookForm.Field>
      )}
    </Field.Group>
  );
}

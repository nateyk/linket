import {UploadType} from '@app/site-config';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {Field} from '@shadcn/forms/field';
import {ReactNode} from 'react';
import {useController} from 'react-hook-form';

type Props = {
  name: string;
  label?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionPosition?: 'top' | 'bottom';
  showRemoveButton?: boolean;
  diskPrefix?: string;
  uploadType?: keyof typeof UploadType;
  required?: boolean;
};

/**
 * BeDesk-compatible FormImageSelector shim for Linket's ImageSelector.Input.
 */
export function FormImageSelector({
  name,
  label,
  className,
  description,
  descriptionPosition = 'bottom',
  uploadType = 'brandingImages',
  required,
}: Props) {
  const {
    field: {onChange, value = null},
    fieldState: {error},
  } = useController({name});

  return (
    <Field.Root name={name} className={className}>
      {label ? <Field.Label>{label}</Field.Label> : null}
      {description && descriptionPosition === 'top' ? (
        <Field.Description>{description}</Field.Description>
      ) : null}
      <ImageSelector.Input
        uploadType={uploadType}
        value={value}
        onChange={onChange}
        required={required}
      />
      {description && descriptionPosition === 'bottom' ? (
        <Field.Description>{description}</Field.Description>
      ) : null}
      {error ? <Field.Error /> : null}
    </Field.Root>
  );
}

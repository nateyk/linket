// resources/client/dashboard/digital-products/product-form-field.tsx
import {Field} from '@shadcn/forms/field';
import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';

interface ProductFormFieldProps {
  label: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  onBlur?: () => void;
  onChange?: () => void;
}

export function ProductFormField({
  label,
  description,
  error,
  htmlFor,
  required = false,
  children,
  onBlur,
  onChange,
}: ProductFormFieldProps) {
  return (
    <Field.Root invalid={!!error} onBlur={onBlur} onChange={onChange}>
      <Field.Label htmlFor={htmlFor}>
        <Trans message={label} />
        {required && <span aria-hidden="true"> *</span>}
      </Field.Label>
      {children}
      {description && (
        <Field.Description>
          <Trans message={description} />
        </Field.Description>
      )}
      {error && <Field.Error>{error}</Field.Error>}
    </Field.Root>
  );
}

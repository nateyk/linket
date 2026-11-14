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
    <Field.Root invalid={!!error} className="min-w-0 gap-2" onBlur={onBlur} onChange={onChange}>
      <Field.Label htmlFor={htmlFor} className="min-w-0 text-sm font-medium leading-5">
        <Trans message={label} />
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {' '}*
          </span>
        )}
      </Field.Label>
      {children}
      {description && (
        <Field.Description>
          <Trans message={description} />
        </Field.Description>
      )}
      {error && (
        <Field.Error id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </Field.Error>
      )}
    </Field.Root>
  );
}

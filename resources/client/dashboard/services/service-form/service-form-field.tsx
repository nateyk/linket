import {Field} from '@shadcn/forms/field';
import {cn} from '@ui/utils/cn';
import type {ReactNode} from 'react';

interface ServiceFormFieldProps {
  /** Ties the label to the control and gives error focus a stable target. */
  name: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  /** One character counter per field keeps long-copy limits visible. */
  counter?: {current: number; max: number};
  /** Sits at the end of the label row: counts, hints, inline state. */
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * Field primitive for the service form: label, control, one description line
 * and one error line, in the same order as the product editor so the two
 * creation flows read as one product.
 */
export function ServiceFormField({
  name,
  label,
  description,
  error,
  required = false,
  counter,
  trailing,
  children,
}: ServiceFormFieldProps) {
  return (
    <Field.Root
      name={name}
      invalid={!!error}
      className="min-w-0 gap-2 [&_input:focus-visible:not([aria-invalid=true])]:outline-primary [&_textarea:focus-visible:not([aria-invalid=true])]:outline-primary [&_[data-slot=input-group]:has([data-slot=input-group-control]:focus-visible:not([aria-invalid=true]))]:outline-primary"
    >
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <Field.Label htmlFor={name} className="min-w-0 flex-1 text-sm font-medium leading-5">
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              {' '}
              *
            </span>
          )}
        </Field.Label>
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {children}
      {(description || counter) && (
        <Field.Description
          className={cn(
            description &&
              counter &&
              'flex items-start justify-between gap-3 text-sm leading-5',
          )}
        >
          {description && <span className="min-w-0 flex-1">{description}</span>}
          {counter && (
            <span className="tabular-nums whitespace-nowrap text-muted-foreground">
              {counter.current}/{counter.max}
            </span>
          )}
        </Field.Description>
      )}
      {error && <Field.Error className="text-sm">{error}</Field.Error>}
    </Field.Root>
  );
}
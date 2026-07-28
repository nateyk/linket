import {mergeProps, useObjectRef} from '@react-aria/utils';
import clsx from 'clsx';
import React, {ComponentPropsWithoutRef, FocusEventHandler, Ref} from 'react';
import {Field, FieldProps} from '../../field';
import {getInputFieldClassNames} from '../../get-input-field-class-names';
import {Input} from '../../input';
import {useField} from '../../use-field';

export interface DatePickerFieldProps extends Omit<
  FieldProps,
  'fieldClassNames'
> {
  inputRef?: Ref<HTMLDivElement>;
  onBlur?: FocusEventHandler;
  showCalendarFooter?: boolean;
}
export const DatePickerField = React.forwardRef<
  HTMLDivElement,
  DatePickerFieldProps
>(({inputRef, wrapperProps, children, onBlur, ...other}, ref) => {
  const fieldClassNames = getInputFieldClassNames(other);
  const objRef = useObjectRef(ref);

  const {fieldProps, inputProps} = useField({
    ...other,
    focusRef: objRef,
    labelElementType: 'span',
  });

  fieldClassNames.wrapper = clsx(
    fieldClassNames.wrapper,
    other.disabled && 'pointer-events-none',
  );

  return (
    <Field
      wrapperProps={mergeProps<ComponentPropsWithoutRef<'div'>[]>(
        wrapperProps!,
        {
          onBlur: e => {
            if (!objRef.current?.contains(e.relatedTarget)) {
              onBlur?.(e);
            }
          },
          onClick: e => {
            // focus first segment when clicking on label or somewhere else in the field, but not directly on segment
            if (!(e.target as HTMLElement).closest('button')) {
              (
                objRef.current?.querySelector('[tabindex="0"]') as HTMLElement
              )?.focus();
            }
          },
        },
      )}
      fieldClassNames={fieldClassNames}
      ref={objRef}
      {...fieldProps}
    >
      <Input
        inputProps={inputProps}
        className={clsx(fieldClassNames.input, 'gap-2.5')}
        ref={inputRef}
      >
        {children}
      </Input>
    </Field>
  );
});

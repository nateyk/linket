import {mergeProps, useObjectRef} from '@react-aria/utils';
import clsx from 'clsx';
import React, {ChangeEventHandler} from 'react';
import {useController} from 'react-hook-form';
import {BaseFieldProps} from './base-field-props';
import {Field} from './field';
import {getInputFieldClassNames} from './get-input-field-class-names';
import {TextFieldProps} from './text-field/text-field';
import {useField} from './use-field';

export interface FileFieldProps extends Omit<BaseFieldProps, 'type'> {
  onChange?: ChangeEventHandler<'input'>;
  accept?: string;
}
export const FileField = React.forwardRef<HTMLInputElement, FileFieldProps>(
  (props, ref) => {
    const inputRef = useObjectRef(ref);

    const {fieldProps, inputProps} = useField({...props, focusRef: inputRef});

    const inputFieldClassNames = getInputFieldClassNames(props);

    return (
      <Field ref={ref} fieldClassNames={inputFieldClassNames} {...fieldProps}>
        <input
          type="file"
          ref={inputRef}
          {...(inputProps as any)}
          className={clsx(
            inputFieldClassNames.input,
            'py-2',
            'file:mr-2.5 file:h-6 file:rounded-sm file:border-none file:bg-primary file:px-2.5 file:text-sm file:font-semibold file:text-primary-foreground',
          )}
        />
      </Field>
    );
  },
);

export interface FormFileFieldProps extends FileFieldProps {
  name: string;
}
export function FormFileField({name, ...props}: FormFileFieldProps) {
  const {
    field: {onChange, onBlur, ref},
    fieldState: {invalid, error},
  } = useController({
    name,
  });

  const [value, setValue] = React.useState('');

  const formProps: TextFieldProps = {
    onChange: e => {
      onChange(e.target.files?.[0]);
      setValue(e.target.value);
    },
    onBlur,
    value,
    invalid,
    errorMessage: error?.message,
  };

  return <FileField ref={ref} {...mergeProps(formProps, props)} />;
}

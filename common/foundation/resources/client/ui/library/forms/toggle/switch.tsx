import {mergeProps, useObjectRef} from '@react-aria/utils';
import {AutoFocusProps, useAutoFocus} from '@ui/focus/use-auto-focus';
import clsx from 'clsx';
import React, {ComponentPropsWithoutRef, ReactNode, useId} from 'react';
import {useController} from 'react-hook-form';
import {getInputFieldClassNames} from '../input-field/get-input-field-class-names';
import {InputSize} from '../input-field/input-size';

interface SwitchProps
  extends AutoFocusProps, Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  size?: InputSize;
  className?: string;
  description?: ReactNode;
  invalid?: boolean;
  errorMessage?: string;
  iconRight?: ReactNode;
}
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (props, ref) => {
    const {
      children,
      size = 'sm',
      description,
      className,
      invalid,
      autoFocus,
      errorMessage,
      iconRight,
      ...domProps
    } = props;

    const inputRef = useObjectRef(ref);
    useAutoFocus({autoFocus}, inputRef);

    const style = getSizeClassName(size);
    const fieldClassNames = getInputFieldClassNames(props);

    const descriptionId = useId();

    return (
      <div className={clsx(className, 'isolate')}>
        <label className="flex items-center select-none">
          <input
            {...domProps}
            type="checkbox"
            role="switch"
            aria-invalid={invalid || undefined}
            aria-describedby={description ? descriptionId : undefined}
            ref={inputRef}
            aria-checked={domProps.checked}
            className={clsx(
              style,
              !invalid && 'checked:border-primary checked:bg-primary',
              invalid && 'checked:border-destructive checked:bg-destructive',
              'border-secondary bg-secondary checked:border-primary checked:bg-primary relative flex shrink-0 cursor-pointer appearance-none items-center overflow-hidden rounded-full border p-0 outline-hidden transition-colors',
              'before:z-10 before:block before:translate-x-0.5 before:rounded-full before:border before:bg-white before:transition-transform',
              'checked:before:border-white',
              'focus-visible:ring',
              props.disabled && 'cursor-not-allowed opacity-80',
            )}
          />
          {children && (
            <span
              className={clsx(
                fieldClassNames.size.font,
                'ml-3',
                invalid && 'text-destructive',
                props.disabled && 'text-foreground/30',
              )}
            >
              {children}
            </span>
          )}
          {iconRight}
        </label>
        {description && !errorMessage && (
          <div id={descriptionId} className={fieldClassNames.description}>
            {description}
          </div>
        )}
        {errorMessage && (
          <div id={descriptionId} className={fieldClassNames.error}>
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);

interface FormSwitchProps extends SwitchProps {
  name: string;
}
export function FormSwitch(props: FormSwitchProps) {
  const {
    field: {onChange, onBlur, value = false, ref},
    fieldState: {invalid, error},
  } = useController({
    name: props.name,
  });

  const formProps: Partial<SwitchProps> = {
    onChange: e => {
      if (e.target.value && e.target.value !== 'on') {
        onChange(e.target.checked ? e.target.value : false);
      } else {
        onChange(e);
      }
    },
    onBlur,
    checked: !!value,
    invalid,
    errorMessage: error?.message,
    name: props.name,
  };

  return <Switch ref={ref} {...mergeProps(props, formProps)} />;
}

function getSizeClassName(size: InputSize): string {
  switch (size) {
    case 'xl':
      return 'w-17 h-9 before:w-7 before:h-7 checked:before:translate-x-9';
    case 'lg':
      return 'w-14 h-7.5 before:w-5.5 before:h-5.5 checked:before:translate-x-7.5';
    case 'md':
      return 'w-11.5 h-6 before:w-4.5 before:h-4.5 checked:before:translate-x-6';
    case 'xs':
      return 'w-7.5 h-4.5 before:w-3 before:h-3 checked:before:translate-x-3.5';
    default:
      return 'w-9.5 h-5 before:w-3.5 before:h-3.5 checked:before:translate-x-5';
  }
}

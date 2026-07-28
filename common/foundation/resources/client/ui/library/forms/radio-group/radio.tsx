import {mergeProps, useObjectRef} from '@react-aria/utils';
import {AutoFocusProps, useAutoFocus} from '@ui/focus/use-auto-focus';
import {InputSize} from '@ui/forms/input-field/input-size';
import clsx from 'clsx';
import {ComponentPropsWithoutRef, forwardRef, ReactNode} from 'react';
import {useController} from 'react-hook-form';

export interface RadioProps
  extends AutoFocusProps, Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  display?: string;
  size?: InputSize;
  value: string;
  invalid?: boolean;
  isFirst?: boolean;
  description?: ReactNode;
}
export const Radio = forwardRef<HTMLInputElement, RadioProps>((props, ref) => {
  const {
    children,
    autoFocus,
    size,
    invalid,
    isFirst,
    display = 'flex',
    description,
    ...domProps
  } = props;

  const inputRef = useObjectRef(ref);
  useAutoFocus({autoFocus}, inputRef);

  const sizeClassNames = getSizeClassNames(size);

  return (
    <div>
      <label
        className={clsx(
          'items-center gap-2 align-middle whitespace-nowrap select-none',
          display,
          sizeClassNames.label,
          props.disabled && 'pointer-events-none text-foreground/30',
          props.invalid && 'text-destructive',
        )}
      >
        <input
          type="radio"
          className={clsx(
            'outline-hidden focus-visible:ring',
            'appearance-none rounded-full border-2 transition-button',
            'border-text-muted-foreground checked:border-primary disabled:border-border/80',
            'before:bg-primary disabled:before:bg-border/80',
            'before:block before:h-full before:w-full before:scale-10 before:rounded-full before:opacity-0 before:transition before:duration-200',
            'checked:before:scale-[.65] checked:before:opacity-100',
            sizeClassNames.circle,
          )}
          ref={inputRef}
          {...domProps}
        />
        {children && <span>{children}</span>}
      </label>
      {description && (
        <div
          className={clsx(
            'mt-0.5 text-xs text-muted-foreground',
            sizeClassNames.offset,
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
});

export function FormRadio(props: RadioProps) {
  const {
    field: {onChange, onBlur, value, ref},
    fieldState: {invalid},
  } = useController({
    name: props.name!,
  });

  const formProps: Partial<RadioProps> = {
    onChange,
    onBlur,
    checked: props.value === value,
    invalid: props.invalid || invalid,
  };

  return <Radio ref={ref} {...mergeProps(props, formProps)} />;
}

function getSizeClassNames(size?: InputSize): {
  circle: string;
  label: string;
  offset: string;
} {
  switch (size) {
    case 'xs':
      return {circle: 'h-3 w-3', label: 'text-xs', offset: 'pl-5'};
    case 'sm':
      return {circle: 'h-4 w-4', label: 'text-sm', offset: 'pl-6'};
    case 'lg':
      return {circle: 'h-6 w-6', label: 'text-lg', offset: 'pl-8'};
    default:
      return {circle: 'h-5 w-5', label: 'text-base', offset: 'pl-7'};
  }
}

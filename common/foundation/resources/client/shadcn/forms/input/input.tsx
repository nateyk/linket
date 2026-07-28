import {Input as InputPrimitive} from '@base-ui/react/input';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {cn} from '@ui/utils/cn';
import {use} from 'react';
import {mergeRefs} from 'react-merge-refs';

function Input({
  className,
  onChange,
  onBlur,
  value,
  disabled,
  ref,
  bindToHookForm = true,
  ...props
}: InputPrimitive.Props & {bindToHookForm?: boolean}) {
  const hookFieldCtx = bindToHookForm ? use(HookForm.FieldContext) : null;
  const mergedOnChange: InputPrimitive.Props['onChange'] = e => {
    onChange?.(e);
    hookFieldCtx?.onChange(e);
  };
  const mergedOnBlur: InputPrimitive.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  // if is bound to hook form, make sure it's always controlled by defaulting to empty string
  const mergedValue = hookFieldCtx ? (hookFieldCtx.value ?? '') : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  const mergedRef = hookFieldCtx ? mergeRefs([hookFieldCtx.ref, ref]) : ref;
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-input border border-input bg-transparent px-3 py-1 text-base transition-colors file:inline-flex file:h-7 file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-foreground/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-input/80',
        className,
      )}
      onChange={mergedOnChange}
      onBlur={mergedOnBlur}
      value={mergedValue}
      disabled={mergedDisabled}
      ref={mergedRef}
      {...props}
    />
  );
}

export {Input};

import {Radio as RadioPrimitive} from '@base-ui/react/radio';
import {RadioGroup as RadioGroupPrimitive} from '@base-ui/react/radio-group';

import {HookForm} from '@shadcn/forms/form/hook-form';
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

function RadioGroup({
  className,
  orientation = 'vertical',
  value,
  onValueChange,
  disabled,
  inputRef,
  ...props
}: RadioGroupPrimitive.Props & {orientation?: 'vertical' | 'horizontal'}) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnChange: RadioGroupPrimitive.Props['onValueChange'] = (
    next,
    eventDetails,
  ) => {
    onValueChange?.(next, eventDetails);
    hookFieldCtx?.onChange(next);
  };
  const mergedValue = hookFieldCtx ? hookFieldCtx.value : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  const mergedInputRef = mergeRefs([hookFieldCtx?.ref, inputRef]);
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn(
        'flex w-full',
        orientation === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-3',
        className,
      )}
      value={mergedValue}
      onValueChange={mergedOnChange}
      disabled={mergedDisabled}
      inputRef={mergedInputRef}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  children,
  onBlur,
  ...props
}: RadioPrimitive.Root.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnBlur: RadioPrimitive.Root.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      onBlur={mergedOnBlur}
      className={cn(
        'group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive focus-visible:aria-invalid:ring-destructive dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-checked:aria-invalid:bg-destructive dark:data-checked:bg-primary',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-full items-center justify-center"
      >
        <span className="absolute inset-s-1/2 top-1/2 size-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground rtl:translate-x-1/2" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export {RadioGroup, RadioGroupItem};

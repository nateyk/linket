import {Checkbox as CheckboxPrimitive} from '@base-ui/react/checkbox';
import {CheckboxGroup as CheckboxGroupPrimitive} from '@base-ui/react/checkbox-group';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {cn} from '@ui/utils/cn';
import {CheckIcon, MinusIcon} from 'lucide-react';
import {use, useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

function Checkbox({
  className,
  checked,
  onCheckedChange,
  onBlur,
  disabled,
  inputRef,
  bindToHookForm = true,
  ...props
}: CheckboxPrimitive.Root.Props & {bindToHookForm?: boolean}) {
  const hookFieldCtx = bindToHookForm ? use(HookForm.FieldContext) : null;
  const mergedOnBlur: CheckboxPrimitive.Root.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  const mergedOnCheckedChange: CheckboxPrimitive.Root.Props['onCheckedChange'] =
    (next, eventDetails) => {
      onCheckedChange?.(next, eventDetails);
      hookFieldCtx?.onChange(next);
    };
  // if is bound to hook form, make sure it's always controlled by defaulting to false
  const mergedChecked = hookFieldCtx ? (hookFieldCtx.value ?? false) : checked;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  const mergedInputRef = hookFieldCtx
    ? mergeRefs([hookFieldCtx.ref, inputRef])
    : inputRef;

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-input outline-offset-2 transition-colors group-has-disabled/field:opacity-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground aria-invalid:data-checked:bg-destructive',
        className,
      )}
      checked={mergedChecked}
      onCheckedChange={mergedOnCheckedChange}
      onBlur={mergedOnBlur}
      disabled={mergedDisabled}
      inputRef={mergedInputRef}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        {props.indeterminate ? <MinusIcon /> : <CheckIcon />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

function CheckboxGroup({
  className,
  orientation = 'vertical',
  value,
  onValueChange,
  disabled,
  ...props
}: CheckboxGroupPrimitive.Props & {orientation?: 'vertical' | 'horizontal'}) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnChange: CheckboxGroupPrimitive.Props['onValueChange'] = (
    next,
    eventDetails,
  ) => {
    onValueChange?.(next, eventDetails);
    hookFieldCtx?.onChange(next);
  };
  const mergedValue = hookFieldCtx ? hookFieldCtx.value : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'gap-4' : 'flex-col gap-2',
        className,
      )}
      value={mergedValue}
      onValueChange={mergedOnChange}
      disabled={mergedDisabled}
      {...props}
    />
  );
}

export {Checkbox, CheckboxGroup};

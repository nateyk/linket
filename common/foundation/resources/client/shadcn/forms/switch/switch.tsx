import {Switch as SwitchPrimitive} from '@base-ui/react/switch';

import {HookForm} from '@shadcn/forms/form/hook-form';
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

function Switch({
  className,
  size = 'default',
  checked,
  onCheckedChange,
  onBlur,
  disabled,
  inputRef,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnCheckedChange: SwitchPrimitive.Root.Props['onCheckedChange'] = (
    next,
    eventDetails,
  ) => {
    onCheckedChange?.(next, eventDetails);
    hookFieldCtx?.onChange(next);
  };
  const mergedOnBlur: SwitchPrimitive.Root.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  // if is bound to hook form, make sure it's always controlled by defaulting to false
  const mergedChecked = hookFieldCtx ? (hookFieldCtx.value ?? false) : checked;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  const mergedInputRef = mergeRefs([hookFieldCtx?.ref, inputRef]);
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border-2 outline-offset-4 transition-all after:absolute after:-inset-x-3 after:-inset-y-2 aria-invalid:border-destructive data-[size=default]:h-5 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 data-checked:border-primary data-checked:bg-primary data-unchecked:border-transparent data-unchecked:bg-input/90 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      checked={mergedChecked}
      onCheckedChange={mergedOnCheckedChange}
      onBlur={mergedOnBlur}
      disabled={mergedDisabled}
      inputRef={mergedInputRef}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform not-dark:bg-clip-padding group-data-[size=default]/switch:h-4 group-data-[size=default]/switch:w-6 group-data-[size=sm]/switch:h-3 group-data-[size=sm]/switch:w-4 data-checked:translate-x-[calc(100%-8px)] rtl:data-checked:-translate-x-[calc(100%-8px)] dark:data-checked:bg-primary-foreground data-unchecked:translate-x-0 rtl:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export {Switch};

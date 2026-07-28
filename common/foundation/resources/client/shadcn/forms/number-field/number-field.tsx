import {NumberField as NumberFieldPrimitive} from '@base-ui/react/number-field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {InputGroup} from '@shadcn/forms/input-group/input-group';
import {cn} from '@ui/utils/cn';
import {MinusIcon, PlusIcon} from 'lucide-react';
import {useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

function NumberField({
  className,
  children,
  value,
  onValueChange,
  disabled,
  ...props
}: NumberFieldPrimitive.Root.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnChange: NumberFieldPrimitive.Root.Props['onValueChange'] = (
    next,
    eventDetails,
  ) => {
    onValueChange?.(next, eventDetails);
    hookFieldCtx?.onChange(next);
  };
  const mergedValue = hookFieldCtx ? hookFieldCtx.value : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      className="contents"
      value={mergedValue}
      onValueChange={mergedOnChange}
      disabled={mergedDisabled}
      {...props}
    >
      <NumberFieldPrimitive.Group
        data-slot="number-field-group"
        render={<InputGroup />}
        className={cn(
          'group/number-field w-full grid-cols-[1r_auto_1fr] overflow-hidden',
          className,
        )}
      >
        {children}
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}

function NumberFieldInput({
  className,
  onBlur,
  ref,
  ...props
}: Omit<NumberFieldPrimitive.Input.Props, 'className'> & {className?: string}) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnBlur: NumberFieldPrimitive.Input.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  const mergedRef = mergeRefs([hookFieldCtx?.ref, ref]);
  return (
    <NumberFieldPrimitive.Input
      data-slot="input-group-control"
      className={cn(
        'h-auto flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none ring-0 focus-visible:outline-none aria-invalid:ring-0 md:text-sm',
        className,
      )}
      onBlur={mergedOnBlur}
      ref={mergedRef}
      {...props}
    />
  );
}

function NumberFieldDecrement({
  className,
  children,
  ...props
}: NumberFieldPrimitive.Decrement.Props) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot="number-field-decrement"
      className={cn(
        'h-full border-e pr-3 pl-3.5 transition-colors active:bg-accent disabled:bg-input/50 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <MinusIcon className="size-4" />
    </NumberFieldPrimitive.Decrement>
  );
}

function NumberFieldIncrement({
  className,
  children,
  ...props
}: NumberFieldPrimitive.Increment.Props) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot="number-field-increment"
      className={cn(
        'h-full border-s pr-3.5 pl-3 transition-colors active:bg-accent disabled:bg-input/50 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-4" />
    </NumberFieldPrimitive.Increment>
  );
}

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
};

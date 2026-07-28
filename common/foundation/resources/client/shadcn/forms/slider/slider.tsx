import {Slider as SliderPrimitive} from '@base-ui/react/slider';

import {HookForm} from '@shadcn/forms/form/hook-form';
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';
import {mergeRefs} from 'react-merge-refs';

function SliderRoot({
  className,
  defaultValue,
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  disabled,
  children,
  ...props
}: SliderPrimitive.Root.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnValueChange: SliderPrimitive.Root.Props['onValueChange'] = (
    next,
    eventDetails,
  ) => {
    onValueChange?.(next, eventDetails);
    hookFieldCtx?.onChange(next);
  };
  const mergedOnValueCommitted: SliderPrimitive.Root.Props['onValueCommitted'] =
    (next, eventDetails) => {
      onValueCommitted?.(next, eventDetails);
      hookFieldCtx?.onChange(next);
    };
  const mergedValue = hookFieldCtx ? hookFieldCtx.value : value;
  const mergedDisabled = disabled ?? hookFieldCtx?.disabled;
  return (
    <SliderPrimitive.Root
      className={cn(
        'grid grid-cols-2 gap-x-2 data-horizontal:w-full data-vertical:h-full',
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      value={mergedValue}
      onValueChange={mergedOnValueChange}
      onValueCommitted={mergedOnValueCommitted}
      min={min}
      max={max}
      disabled={mergedDisabled}
      thumbAlignment="edge"
      {...props}
    >
      {children}
    </SliderPrimitive.Root>
  );
}

function SliderControl({className, ...props}: SliderPrimitive.Control.Props) {
  return (
    <SliderPrimitive.Control
      className={cn(
        'relative col-span-2 flex w-full touch-none items-center py-3 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
        className,
      )}
      {...props}
    />
  );
}

function SliderTrack({className, ...props}: SliderPrimitive.Track.Props) {
  return (
    <SliderPrimitive.Track
      data-slot="slider-track"
      className={cn(
        'relative grow rounded-full bg-input/90 select-none data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2',
        className,
      )}
      {...props}
    />
  );
}

function SliderIndicator({
  className,
  ...props
}: SliderPrimitive.Indicator.Props) {
  return (
    <SliderPrimitive.Indicator
      data-slot="slider-indicator"
      className={cn(
        'rounded-full bg-primary select-none data-horizontal:h-full data-vertical:w-full',
        className,
      )}
      {...props}
    />
  );
}

function SliderThumb({
  className,
  onBlur,
  inputRef,
  index,
  ...props
}: SliderPrimitive.Thumb.Props) {
  const hookFieldCtx = useContext(HookForm.FieldContext);
  const mergedOnBlur: SliderPrimitive.Thumb.Props['onBlur'] = e => {
    onBlur?.(e);
    hookFieldCtx?.onBlur();
  };
  const shouldMergeFieldRef =
    hookFieldCtx && (index === undefined || index === 0);
  const mergedInputRef = shouldMergeFieldRef
    ? mergeRefs([hookFieldCtx.ref, inputRef])
    : inputRef;
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      className={cn(
        'block h-4 w-6 shrink-0 rounded-full bg-white shadow-md ring-1 ring-black/10 outline-offset-3 transition-[color,box-shadow,background-color] select-none not-dark:bg-clip-padding disabled:pointer-events-none disabled:opacity-50 has-focus-visible:outline-2 data-vertical:h-6 data-vertical:w-4',
        className,
      )}
      index={index}
      onBlur={mergedOnBlur}
      inputRef={mergedInputRef}
      {...props}
    />
  );
}

function SliderValue({className, ...props}: SliderPrimitive.Value.Props) {
  return (
    <SliderPrimitive.Value
      data-slot="slider-value"
      className={cn('col-start-2 text-end text-sm font-medium', className)}
      {...props}
    />
  );
}

function SliderLabel({className, ...props}: SliderPrimitive.Label.Props) {
  return (
    <SliderPrimitive.Label
      data-slot="slider-label"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

const Slider = Object.assign(SliderRoot, {
  Root: SliderRoot,
  Control: SliderControl,
  Indicator: SliderIndicator,
  Label: SliderLabel,
  Thumb: SliderThumb,
  Track: SliderTrack,
  Value: SliderValue,
});

export {Slider};

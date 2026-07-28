import {Meter as MeterPrimitive} from '@base-ui/react/meter';
import {cn} from '@ui/utils/cn';

export function Meter({className, ...props}: MeterPrimitive.Root.Props) {
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      className={cn(
        'box-border grid grid-cols-[1fr_auto] gap-1.5 text-sm font-medium',
        className,
      )}
      {...props}
    />
  );
}

export function MeterLabel({className, ...props}: MeterPrimitive.Label.Props) {
  return (
    <MeterPrimitive.Label
      data-slot="meter-label"
      className={cn(
        'flex w-fit items-center gap-1.5 [&>svg]:size-3 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function MeterValue({className, ...props}: MeterPrimitive.Value.Props) {
  return (
    <MeterPrimitive.Value
      data-slot="meter-value"
      className={cn('col-start-2', className)}
      {...props}
    />
  );
}

export function MeterTrack({className, ...props}: MeterPrimitive.Track.Props) {
  return (
    <MeterPrimitive.Track
      data-slot="meter-track"
      className={cn(
        'col-span-2 block h-2 overflow-hidden rounded-full bg-border',
        className,
      )}
      {...props}
    />
  );
}

export function MeterIndicator({
  className,
  ...props
}: MeterPrimitive.Indicator.Props) {
  return (
    <MeterPrimitive.Indicator
      data-slot="meter-indicator"
      className={cn('block rounded-full bg-primary transition-all', className)}
      {...props}
    />
  );
}

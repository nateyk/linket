import {Progress as ProgressPrimitive} from '@base-ui/react/progress';

import {cn} from '@ui/utils/cn';

function ProgressRoot({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn('box-border grid grid-cols-[1fr_auto] gap-1.5', className)}
      {...props}
    />
  );
}

function ProgressLabel({className, ...props}: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn(
        'flex w-fit items-center gap-1.5 [&>svg]:size-3 [&>svg]:shrink-0',
        className,
      )}
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressValue({className, ...props}: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn('col-start-2', className)}
      data-slot="progress-value"
      {...props}
    />
  );
}

function ProgressTrack({className, ...props}: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        'col-span-2 block h-2 overflow-hidden rounded-full bg-border',
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn('block rounded-full bg-primary transition-all', className)}
      {...props}
    />
  );
}

export const Progress = Object.assign(ProgressRoot, {
  Root: ProgressRoot,
  Track: ProgressTrack,
  Indicator: ProgressIndicator,
  Label: ProgressLabel,
  Value: ProgressValue,
});

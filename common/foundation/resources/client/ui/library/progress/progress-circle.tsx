import {useNumberFormatter} from '@ui/i18n/use-number-formatter';
import {cn} from '@ui/utils/cn';
import {clamp} from '@ui/utils/number/clamp';
import React, {ComponentPropsWithoutRef} from 'react';

export interface ProgressCircleProps extends ComponentPropsWithoutRef<'div'> {
  value?: number;
  minValue?: number;
  maxValue?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | string;
  isIndeterminate?: boolean;
  className?: string;
  trackWidth?: number;
}
export const ProgressCircle = React.forwardRef<
  HTMLDivElement,
  ProgressCircleProps
>((props, ref) => {
  let {
    value = 0,
    minValue = 0,
    maxValue = 100,
    size = 'md',
    isIndeterminate = false,
    className,
    trackWidth = 3,
    ...domProps
  } = props;

  value = clamp(value, minValue, maxValue);

  const strokeWidth = trackWidth;

  const radius = 16 - strokeWidth;
  const circumference = 2 * radius * Math.PI;

  const percentage = isIndeterminate
    ? 0.25
    : (value - minValue) / (maxValue - minValue);
  const formatter = useNumberFormatter({style: 'percent'});

  const offset = circumference - percentage * circumference;

  let valueLabel = '';
  if (!isIndeterminate && !valueLabel) {
    valueLabel = formatter.format(percentage);
  }

  return (
    <div
      {...domProps}
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuemin={minValue}
      aria-valuemax={maxValue}
      aria-valuetext={isIndeterminate ? undefined : valueLabel}
      role="progressbar"
      ref={ref}
      className={cn('relative', getCircleSizeStyle(size), className)}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        strokeWidth={strokeWidth}
        className={cn(
          'progress-circle size-full',
          isIndeterminate && 'indeterminate',
        )}
      >
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          role="presentation"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(-90 16 16)"
          className="progress-circle-track"
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          role="presentation"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform="rotate(-90 16 16)"
          className="progress-circle-fill"
        />
      </svg>
    </div>
  );
});

function getCircleSizeStyle(size: ProgressCircleProps['size']) {
  switch (size) {
    case 'xs':
      return 'size-4.5';
    case 'sm':
      return 'size-8';
    case 'md':
      return 'size-10';
    case 'lg':
      return 'size-12';
    default:
      return size;
  }
}

import clsx from 'clsx';
import {ReactNode} from 'react';
import {getInputFieldClassNames} from '../input-field/get-input-field-class-names';
import {UseSliderProps, UseSliderReturn} from './use-slider';

export interface BaseSliderProps extends UseSliderProps {
  slider: UseSliderReturn;
  children: ReactNode;
}

export function BaseSlider(props: BaseSliderProps) {
  const {
    size = 'md',
    inline,
    label,
    showValueLabel = !!label,
    className,
    width = 'w-full',
    slider,
    children,
    trackColor = 'primary',
    fillColor = 'primary',
  } = props;

  const {
    domProps,
    trackRef,
    getThumbPercent,
    getThumbValueLabel,
    labelId,
    groupId,
    thumbIds,
    isDisabled,
    numberFormatter,
    minValue,
    maxValue,
    step,
    values,
    getValueLabel,
  } = slider;

  let outputValue = '';
  let maxLabelLength = Math.max(
    [...numberFormatter.format(minValue)].length,
    [...numberFormatter.format(maxValue)].length,
    [...numberFormatter.format(step)].length,
  );

  if (getValueLabel) {
    outputValue = getValueLabel(values[0]);
  } else if (values.length === 1) {
    outputValue = getThumbValueLabel(0);
  } else if (values.length === 2) {
    // This should really use the NumberFormat#formatRange proposal...
    // https://github.com/tc39/ecma402/issues/393
    // https://github.com/tc39/proposal-intl-numberformat-v3#formatrange-ecma-402-393
    outputValue = `${getThumbValueLabel(0)} – ${getThumbValueLabel(1)}`;
    maxLabelLength =
      3 +
      2 *
        Math.max(
          maxLabelLength,
          [...numberFormatter.format(minValue)].length,
          [...numberFormatter.format(maxValue)].length,
        );
  }
  const style = getInputFieldClassNames({
    size,
    disabled: isDisabled,
    labelDisplay: 'flex',
  });

  const wrapperClassname = clsx('touch-none', className, width, {
    'flex items-center': inline,
  });

  return (
    <div className={wrapperClassname} role="group" id={groupId}>
      {(label || showValueLabel) && (
        <div className={clsx(style.label, 'select-none')}>
          {label && (
            <label
              onClick={() => {
                // Safari does not focus <input type="range"> elements when clicking on an associated <label>,
                // so do it manually. In addition, make sure we show the focus ring.
                document.getElementById(thumbIds[0])?.focus();
              }}
              id={labelId}
              htmlFor={groupId}
            >
              {label}
            </label>
          )}
          {showValueLabel && (
            <output
              htmlFor={thumbIds[0]}
              className="ml-auto text-right"
              aria-live="off"
              style={
                !maxLabelLength
                  ? undefined
                  : {
                      width: `${maxLabelLength}ch`,
                      minWidth: `${maxLabelLength}ch`,
                    }
              }
            >
              {outputValue}
            </output>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className={clsx(
          'relative',
          getWrapperHeight(props),
          isDisabled && 'opacity-50',
        )}
        {...domProps}
        role="presentation"
      >
        <div
          className={clsx(
            'absolute inset-0 m-auto rounded-sm',
            getTrackColor(trackColor),
            getTrackHeight(size),
          )}
        />
        <div
          className={clsx(
            'absolute inset-0 my-auto rounded-sm',
            getFillColor(fillColor),
            getTrackHeight(size),
          )}
          style={{width: `${Math.max(getThumbPercent(0) * 100, 0)}%`}}
        />
        {children}
      </div>
    </div>
  );
}

function getWrapperHeight({size, wrapperHeight}: UseSliderProps): string {
  if (wrapperHeight) return wrapperHeight;
  switch (size) {
    case 'xs':
      return 'h-3.5';
    case 'sm':
      return 'h-5';
    default:
      return 'h-7.5';
  }
}

function getTrackHeight(size: UseSliderProps['size']): string {
  switch (size) {
    case 'xs':
      return 'h-0.5';
    case 'sm':
      return 'h-0.5';
    default:
      return 'h-1';
  }
}

function getTrackColor(color: string): string {
  switch (color) {
    case 'disabled':
      return 'bg-border/40';
    case 'primary':
      return 'bg-primary/25';
    case 'neutral':
      return 'bg-border';
    default:
      return color;
  }
}

function getFillColor(color: string): string {
  switch (color) {
    case 'disabled':
      return 'bg-border/40';
    case 'primary':
      return 'bg-primary';
    default:
      return color;
  }
}

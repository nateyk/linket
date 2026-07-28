import {useObjectRef} from '@react-aria/utils';
import {useAutoFocus} from '@ui/focus/use-auto-focus';
import clsx from 'clsx';
import {forwardRef, Ref} from 'react';
import {InputSize} from '../input-field/input-size';
import {RadioProps} from '../radio-group/radio';

export interface SegmentedRadioProps extends RadioProps {
  labelRef?: Ref<HTMLLabelElement>;
  isSelected?: boolean;
  variant?: 'outline' | 'filled';
}
export const SegmentedRadio = forwardRef<HTMLInputElement, SegmentedRadioProps>(
  (props, ref) => {
    const {
      children,
      autoFocus,
      size,
      invalid,
      isFirst,
      labelRef,
      isSelected,
      variant = 'filled',
      ...domProps
    } = props;

    const inputRef = useObjectRef(ref);
    useAutoFocus({autoFocus}, inputRef);

    const sizeClassNames = getSizeClassNames(size);

    return (
      <label
        ref={labelRef}
        className={clsx(
          'hover:text-foreground relative z-20 inline-flex flex-auto cursor-pointer items-center justify-center gap-2 align-middle font-medium whitespace-nowrap transition-colors select-none',
          isSelected ? 'text-foreground' : 'text-muted-foreground',
          !isFirst && '',
          sizeClassNames,
          props.disabled && 'text-foreground/30 pointer-events-none',
          props.invalid && 'text-destructive',
        )}
      >
        <input
          type="radio"
          className="pointer-events-none absolute top-0 left-0 h-full w-full appearance-none rounded-sm focus-visible:outline-solid"
          ref={inputRef}
          {...domProps}
        />
        {children && <span>{children}</span>}
      </label>
    );
  },
);

function getSizeClassNames(size?: InputSize): string {
  switch (size) {
    case 'xs':
      return 'px-1.5 py-0.5 text-xs';
    case 'sm':
      return 'px-2.5 py-1 text-sm';
    case 'lg':
      return 'px-4 py-1.5 text-lg';
    default:
      return 'px-4 py-2 text-sm';
  }
}

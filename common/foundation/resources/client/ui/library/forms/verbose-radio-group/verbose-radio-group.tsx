import {mergeProps} from '@react-aria/utils';
import {useControlledState} from '@react-stately/utils';
import {RadioButtonCheckedIcon} from '@ui/icons/material/RadioButtonChecked';
import {RadioButtonUncheckedIcon} from '@ui/icons/material/RadioButtonUnchecked';
import clsx from 'clsx';
import {
  Children,
  cloneElement,
  forwardRef,
  ReactElement,
  ReactNode,
} from 'react';
import {useController} from 'react-hook-form';

interface VerboseRadioGroupProps {
  children: ReactElement<VerboseRadioItemProps>[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  iconHorizPlacement?: 'start' | 'end';
  iconVertPlacement?: 'top' | 'center' | 'bottom';
  invalid?: boolean;
  layout?: 'vertical' | 'horizontal' | 'horizontalDesktop';
}
export const VerboseRadioGroup = forwardRef<
  HTMLDivElement,
  VerboseRadioGroupProps
>((props, ref) => {
  const {
    value,
    defaultValue,
    onChange,
    children,
    className,
    iconHorizPlacement = 'start',
    iconVertPlacement = 'top',
    invalid,
    layout = 'vertical',
  } = props;

  const [controlledValue, setControlledValue] = useControlledState(
    value,
    defaultValue,
    onChange,
  );
  return (
    <div
      role="radiogroup"
      className={clsx(
        'flex gap-4',
        layout === 'horizontalDesktop'
          ? 'flex-col md:flex-row'
          : layout === 'vertical'
            ? 'flex-col'
            : 'flex-row',
        className,
      )}
      ref={ref}
    >
      {Children.map(children, child => {
        return cloneElement<ClonedVerboseRadioItemProps>(child as any, {
          value: child.props.value,
          onToggle: () => setControlledValue(child.props.value),
          checked: controlledValue === child.props.value,
          iconHorizPlacement,
          iconVertPlacement,
          invalid,
        });
      })}
    </div>
  );
});

interface VerboseRadioItemProps {
  label: ReactNode;
  description: ReactNode;
  value: string;
}
interface ClonedVerboseRadioItemProps extends VerboseRadioItemProps {
  checked: boolean;
  onToggle: () => void;
  iconHorizPlacement?: VerboseRadioGroupProps['iconHorizPlacement'];
  iconVertPlacement?: VerboseRadioGroupProps['iconVertPlacement'];
  invalid?: boolean;
}
export function VerboseRadioItem(props: VerboseRadioItemProps) {
  const {
    label,
    description,
    iconHorizPlacement,
    iconVertPlacement,
    onToggle,
    checked,
    invalid,
  } = props as ClonedVerboseRadioItemProps;
  return (
    <div
      className={clsx(
        'rounded-card transition-button hover:bg-accent flex cursor-pointer gap-3 border p-4',
        invalid
          ? 'border-destructive'
          : checked
            ? 'border-primary'
            : 'border-border',
        iconHorizPlacement === 'end' && 'flex-row-reverse',
        iconVertPlacement === 'center' && 'items-center',
        iconVertPlacement === 'bottom' && 'items-end',
      )}
      role="radio"
      tabIndex={0}
      aria-checked={checked}
      onClick={() => onToggle()}
    >
      {checked ? (
        <RadioButtonCheckedIcon
          className={clsx(invalid ? 'text-destructive' : 'text-primary')}
        />
      ) : (
        <RadioButtonUncheckedIcon
          className={clsx(invalid ? 'text-destructive' : 'text-border')}
        />
      )}
      <div>
        <div className="mb-1 text-sm font-semibold">{label}</div>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
    </div>
  );
}

interface FormVerboseRadioGroupProps extends VerboseRadioGroupProps {
  name: string;
}
export function FormVerboseRadioGroup({
  children,
  ...props
}: FormVerboseRadioGroupProps) {
  const {
    field: {onChange, value, ref},
    fieldState: {invalid},
  } = useController({
    name: props.name!,
  });

  const formProps: Partial<VerboseRadioGroupProps> = {
    onChange,
    value,
    invalid: props.invalid || invalid,
  };

  return (
    <VerboseRadioGroup ref={ref} {...mergeProps(formProps, props)}>
      {children}
    </VerboseRadioGroup>
  );
}

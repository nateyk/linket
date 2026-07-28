import {ButtonSize, getButtonSizeStyle} from '@ui/buttons/button-size';
import clsx from 'clsx';
import {BaseFieldProps} from './base-field-props';

export interface InputFieldStyle {
  label: string;
  input: string;
  wrapper: string;
  inputWrapper: string;
  adornment: string;
  append: {size: string; radius: string};
  size: {font: string; height: string};
  description: string;
  error: string;
}

type InputFieldStyleProps = Omit<
  BaseFieldProps,
  'value' | 'defaultValue' | 'onChange'
>;

export function getInputFieldClassNames(
  props: InputFieldStyleProps = {},
): InputFieldStyle {
  const {
    size = 'md',
    startAppend,
    endAppend,
    className,
    labelPosition,
    labelClassName,
    labelDisplay = 'block',
    inputDisplay = 'block',
    wrapLabel = false,
    inputClassName,
    inputWrapperClassName,
    unstyled,
    invalid,
    disabled,
    background = 'bg-transparent',
    flexibleHeight,
    inputShadow = 'shadow-xs',
    descriptionPosition = 'bottom',
    inputRing,
    inputFontSize,
    labelSuffix,
  } = {...props};

  if (unstyled) {
    return {
      label: labelClassName || '',
      input: inputClassName || '',
      wrapper: className || '',
      inputWrapper: inputWrapperClassName || '',
      adornment: '',
      append: {size: '', radius: ''},
      size: {font: '', height: ''},
      description: '',
      error: '',
    };
  }

  const sizeClass = inputSizeClass({
    size: props.size,
    flexibleHeight,
  });
  if (inputFontSize) {
    sizeClass.font = inputFontSize;
  }

  const isInputGroup = startAppend || endAppend;

  const ringColor = invalid
    ? 'focus:ring-destructive/90 focus:border-destructive/90'
    : 'focus:ring-primary/90 focus:border-primary/90';
  const ringClassName =
    inputRing || `focus:ring-1 focus:ring-inset ${ringColor}`;

  const radius = getRadius(props);

  return {
    label: clsx(
      labelDisplay,
      labelClassName,
      !wrapLabel && 'overflow-hidden text-ellipsis whitespace-nowrap',
      'text-left font-medium first-letter:capitalize',
      disabled && 'text-foreground/30',
      sizeClass.font,
      labelSuffix ? '' : labelPosition === 'side' ? 'mr-4' : 'mb-2',
    ),
    input: clsx(
      'text relative w-full appearance-none text-left transition-[border-color,box-shadow] hover:border-foreground/20',
      inputDisplay,
      background,

      // radius
      radius.input,

      getInputBorder(props),
      !disabled && `${ringClassName} focus:outline-hidden ${inputShadow}`,
      disabled && 'cursor-not-allowed text-foreground/30',
      inputClassName,
      sizeClass.font,
      sizeClass.height,
      getInputPadding(props),
    ),
    adornment: iconSizeClass(size),
    append: {
      size: getButtonSizeStyle(size),
      radius: radius.append,
    },
    wrapper: clsx(className, sizeClass.font, {
      'flex items-center': labelPosition === 'side',
    }),
    inputWrapper: clsx(
      'relative isolate',
      inputWrapperClassName,
      isInputGroup && 'flex items-stretch',
      labelPosition === 'side' && 'flex-auto',
    ),
    size: sizeClass,
    description: `text-muted-foreground ${
      descriptionPosition === 'bottom' ? 'pt-2.5' : 'pb-2.5'
    } text-xs`,
    error: 'text-destructive pt-2.5 text-xs',
  };
}

function getInputBorder({
  startAppend,
  endAppend,
  inputBorder,
  invalid,
}: InputFieldStyleProps) {
  if (inputBorder) return inputBorder;

  const isInputGroup = startAppend || endAppend;
  const borderColor = invalid ? 'border-destructive' : 'border-border';

  if (!isInputGroup) {
    return `${borderColor} border`;
  }
  if (startAppend) {
    return `${borderColor} border-y border-r`;
  }
  return `${borderColor} border-y border-l`;
}

function getInputPadding({startAdornment, endAdornment}: InputFieldStyleProps) {
  return clsx(
    startAdornment ? 'pl-11.5' : 'pl-3',
    endAdornment ? 'pr-11.5' : 'pr-3',
  );
}

function getRadius(props: InputFieldStyleProps): {
  input: string;
  append: string;
} {
  const {startAppend, endAppend, inputRadius} = props;
  const isInputGroup = startAppend || endAppend;

  if (inputRadius === 'rounded-full') {
    return {
      input: clsx(
        !isInputGroup && 'rounded-full',
        startAppend && 'rounded-l-none rounded-r-full',
        endAppend && 'rounded-l-full rounded-r-none',
      ),
      append: startAppend ? 'rounded-l-full' : 'rounded-r-full',
    };
  } else if (inputRadius === 'rounded-none') {
    return {
      input: '',
      append: '',
    };
  } else if (inputRadius) {
    return {
      input: inputRadius,
      append: inputRadius,
    };
  }
  return {
    input: clsx(
      !isInputGroup && 'rounded-input',
      startAppend && 'rounded-l-none rounded-r-input',
      endAppend && 'rounded-l-input rounded-r-none',
    ),
    append: startAppend ? 'rounded-l-input' : 'rounded-r-input',
  };
}

function inputSizeClass({size, flexibleHeight}: BaseFieldProps) {
  switch (size) {
    case '2xs':
      return {font: 'text-xs', height: flexibleHeight ? 'min-h-6' : 'h-6'};
    case 'xs':
      return {font: 'text-xs', height: flexibleHeight ? 'min-h-7.5' : 'h-7.5'};
    case 'sm':
      return {font: 'text-sm', height: flexibleHeight ? 'min-h-9' : 'h-9'};
    case 'lg':
      return {
        font: 'text-md',
        height: flexibleHeight ? 'min-h-12.5' : 'h-12.5',
      };
    case 'xl':
      return {font: 'text-xl', height: flexibleHeight ? 'min-h-15' : 'h-15'};
    default:
      return {
        font: 'text-sm',
        height: flexibleHeight ? 'min-h-10.5' : 'h-10.5',
      };
  }
}

function iconSizeClass(size?: ButtonSize): string {
  switch (size) {
    case '2xs':
      return 'icon-2xs';
    case 'xs':
      return 'icon-xs';
    case 'sm':
      return 'icon-sm';
    case 'md':
      return 'icon-sm';
    case 'lg':
      return 'icon-lg';
    case 'xl':
      return 'icon-xl';
    default:
      // can't return "size" variable here, append in field will not work with it
      return '';
  }
}

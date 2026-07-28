export type ButtonVariant =
  | 'text'
  | 'flat'
  | 'raised'
  | 'outline'
  | 'link'
  | null;
export type ButtonColor =
  | null
  | 'primary'
  | 'danger'
  | 'positive'
  | 'chip'
  | 'white';

interface SharedButtonStyleProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
  border?: string;
  borderColor?: string;
  shadow?: string;
  whitespace?: string;
  display?: string;
}
export function getSharedButtonStyle(
  props: SharedButtonStyleProps,
): (string | boolean | null | undefined)[] {
  const {
    variant,
    shadow,
    whitespace = 'whitespace-nowrap',
    display = 'inline-flex',
  } = props;
  const variantProps = {
    ...props,
    border: props.border || 'border',
    borderColor: props.borderColor,
  };
  let style: string[] = [];
  if (variant === 'outline') {
    style = outline(variantProps);
  } else if (variant === 'text') {
    style = text(variantProps);
  } else if (variant === 'flat' || variant === 'raised') {
    style = contained(variantProps);
  } else if (variant === 'link') {
    style = link(variantProps);
  }

  return [
    ...style,
    shadow || (variant === 'raised' && 'shadow-md'),
    whitespace,
    display,
    variant &&
      'align-middle flex-shrink-0 items-center transition-button duration-200',
    'select-none appearance-none no-underline outline-hidden disabled:pointer-events-none disabled:cursor-default',
  ];
}

function outline({color, border}: SharedButtonStyleProps) {
  const disabled =
    'disabled:text-foreground/30 disabled:bg-transparent disabled:border-border/80';
  switch (color) {
    case 'primary':
      return [
        `text-primary bg-transparent ${border} border-primary/50`,
        'hover:bg-primary/4 hover:border-primary',
        disabled,
      ];
    case 'danger':
      return [
        `text-destructive bg-transparent ${border} border-destructive/50`,
        'hover:bg-destructive/4 hover:border-destructive',
        disabled,
      ];
    case 'positive':
      return [
        `text-positive bg-transparent ${border} border-positive/50`,
        'hover:bg-positive/4 hover:border-positive',
        disabled,
      ];
    case 'white':
      return [
        'text-white bg-transparent border border-white',
        'hover:bg-white/20',
        'disabled:text-white/70 disabled:border-white/70 disabled:bg-transparent',
      ];
    default:
      return [`bg-transparent ${border}`, 'hover:bg-accent', disabled];
  }
}

function text({color}: SharedButtonStyleProps) {
  const disabled = 'disabled:text-foreground/30 disabled:bg-transparent';
  switch (color) {
    case 'primary':
      return [
        'text-primary bg-transparent border-transparent',
        'hover:bg-primary/4',
        disabled,
      ];
    case 'danger':
      return [
        'text-destructive bg-transparent border-transparent',
        'hover:bg-destructive/4',
        disabled,
      ];
    case 'positive':
      return [
        'text-positive bg-transparent border-transparent',
        'hover:bg-positive/4',
        disabled,
      ];
    case 'white':
      return [
        'text-white bg-transparent border-transparent',
        'hover:bg-white/20',
        'disabled:text-white/70 disabled:bg-transparent',
      ];
    default:
      return ['bg-transparent border-transparent', 'hover:bg-accent', disabled];
  }
}

function link({color}: SharedButtonStyleProps) {
  switch (color) {
    case 'primary':
      return ['text-primary', 'hover:underline', 'disabled:text-foreground/30'];
    case 'danger':
      return [
        'text-destructive',
        'hover:underline',
        'disabled:text-foreground/30',
      ];
    default:
      return [
        'text-foreground',
        'hover:underline',
        'disabled:text-foreground/30',
      ];
  }
}

function contained({color, border, borderColor}: SharedButtonStyleProps) {
  const disabled = 'disabled:opacity-50 disabled:shadow-none';
  switch (color) {
    case 'primary':
      return [
        `text-primary-foreground bg-primary ${border} border-primary`,
        'hover:bg-primary/80 hover:border-primary/80',
        disabled,
      ];
    case 'danger':
      return [
        `text-destructive bg-destructive/10 ${border} border-destructive/10`,
        'hover:bg-destructive/20 hover:border-destructive/20',
        disabled,
      ];
    case 'positive':
      return [
        `text-positive bg-positive/10 ${border} border-positive/10`,
        'hover:bg-positive/20 hover:border-positive/20',
        disabled,
      ];
    case 'chip':
      return [
        `text-foreground bg-secondary ${border} ${borderColor ?? 'border-secondary'}`,
        'hover:bg-secondary/90 hover:border-secondary/90',
        disabled,
      ];
    case 'white':
      return [
        `text-black bg-white ${border} border-white`,
        'hover:bg-white/90',
        disabled,
      ];
    default:
      return [`bg ${border} border-background`, 'hover:bg-accent', disabled];
  }
}

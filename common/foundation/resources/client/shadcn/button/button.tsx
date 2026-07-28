import {Button as ButtonPrimitive} from '@base-ui/react/button';
import {Separator} from '@shadcn/separator';
import {cn} from '@ui/utils/cn';
import {cva, type VariantProps} from 'class-variance-authority';
import {
  ComponentProps,
  createContext,
  use,
  type PropsWithChildren,
} from 'react';
import {Link} from 'react-router';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-button border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-button outline-none select-none focus-visible:outline-2 focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:outline-1 aria-invalid:outline-destructive aria-invalid:focus-visible:outline-solid [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&:has([data-slot=separator])]:relative",
  {
    variants: {
      variant: {
        default: 'outline-offset-2',
        outline: 'bg-transparent shadow-xs',
        ghost: 'border-transparent bg-transparent',
        link: 'bg-transparent underline-offset-4 hover:underline',
      },
      color: {
        default: '',
        primary: '',
        danger: '',
        positive: '',
        white: '',
      },
      size: {
        default:
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5',
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2',
        lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      color: 'primary',
      size: 'default',
    },
    compoundVariants: [
      {
        variant: 'default',
        color: 'default',
        className:
          'border-secondary bg-secondary text-foreground hover:bg-secondary/80 data-pressed:bg-secondary/80',
      },
      {
        variant: 'default',
        color: 'primary',
        className:
          'border-primary bg-primary text-primary-foreground hover:bg-primary/80 data-pressed:bg-primary/80',
      },
      {
        variant: 'default',
        color: 'danger',
        className:
          'border-destructive bg-destructive text-primary-foreground hover:bg-destructive/80 data-pressed:bg-destructive/80',
      },
      {
        variant: 'default',
        color: 'positive',
        className:
          'border-positive bg-positive text-primary-foreground hover:bg-positive/80 data-pressed:bg-positive/80',
      },
      {
        variant: 'default',
        color: 'white',
        className: 'border-transparent bg-white text-foreground',
      },
      {
        variant: 'outline',
        color: 'default',
        className:
          'border-border text-foreground hover:bg-accent data-pressed:bg-accent',
      },
      {
        variant: 'outline',
        color: 'primary',
        className:
          'border-primary/50 text-primary hover:border-primary hover:bg-primary/4 data-pressed:bg-primary/4',
      },
      {
        variant: 'outline',
        color: 'danger',
        className:
          'border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/4 data-pressed:bg-destructive/4',
      },
      {
        variant: 'outline',
        color: 'positive',
        className:
          'border-positive/50 text-positive hover:border-positive hover:bg-positive/4 data-pressed:bg-positive/4',
      },
      {
        variant: 'outline',
        color: 'white',
        className:
          'border-border bg-white text-foreground hover:bg-accent/50 data-pressed:bg-accent/50',
      },
      {
        variant: 'ghost',
        color: 'default',
        className: 'text-foreground hover:bg-accent data-pressed:bg-accent',
      },
      {
        variant: 'ghost',
        color: 'primary',
        className: 'text-primary hover:bg-primary/4 data-pressed:bg-primary/4',
      },
      {
        variant: 'ghost',
        color: 'danger',
        className:
          'text-destructive hover:bg-destructive/4 data-pressed:bg-destructive/4',
      },
      {
        variant: 'ghost',
        color: 'positive',
        className:
          'text-positive hover:bg-positive/4 data-pressed:bg-positive/4',
      },
      {
        variant: 'link',
        color: 'default',
        className: 'text-foreground',
      },
      {
        variant: 'link',
        color: 'primary',
        className: 'text-primary',
      },
      {
        variant: 'link',
        color: 'danger',
        className: 'text-destructive',
      },
      {
        variant: 'link',
        color: 'positive',
        className: 'text-positive',
      },
    ],
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

const ButtonVariantsContext = createContext<ButtonVariantProps | null>(null);

function ButtonVariantsProvider({
  value,
  children,
}: PropsWithChildren<{value: ButtonVariantProps}>) {
  return (
    <ButtonVariantsContext.Provider value={value}>
      {children}
    </ButtonVariantsContext.Provider>
  );
}

/**
 * A button component that can be rendered as another tag or focusable when disabled.
 */
function Button({
  className,
  ...props
}: Omit<ButtonPrimitive.Props, 'color'> & ButtonVariantProps) {
  const variantProps = useMergedVariantProps(props);
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants(variantProps), className)}
      {...props}
    />
  );
}

function LinkButton({
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonVariantProps) {
  const variantProps = useMergedVariantProps(props);

  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants(variantProps), className)}
      {...props}
    />
  );
}

function useMergedVariantProps({
  variant: variantProp,
  color,
  size: sizeProp,
}: ButtonVariantProps) {
  const context = use(ButtonVariantsContext);
  const variant = variantProp ?? context?.variant ?? 'default';
  const size = sizeProp ?? context?.size ?? 'default';

  // default to primary color on "flat" buttons and secondary color on outline and ghost buttons
  let resolvedColor = color ?? context?.color;
  if (!resolvedColor) {
    resolvedColor = variant === 'default' ? 'primary' : 'default';
  }

  return {variant, color: resolvedColor, size};
}

function SeparatorInsideButton({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="separator"
      orientation="vertical"
      className={cn('absolute top-1/4 -left-px h-1/2 opacity-40', className)}
      {...props}
    />
  );
}

type ButtonSize = ButtonVariantProps['size'];
type ButtonVariant = ButtonVariantProps['variant'];
type ButtonColor = ButtonVariantProps['color'];

export {
  Button,
  buttonVariants,
  ButtonVariantsContext,
  ButtonVariantsProvider,
  LinkButton,
  SeparatorInsideButton,
  type ButtonColor,
  type ButtonSize,
  type ButtonVariant,
  type ButtonVariantProps,
};

import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {
  ButtonVariantsProvider,
  type ButtonVariantProps,
} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
import {cn} from '@ui/utils/cn';
import {cva, type VariantProps} from 'class-variance-authority';
import {ComponentProps} from 'react';

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 [&>[data-slot=dropdown-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      buttonSize: {
        default: '',
        xs: '',
        sm: '',
        lg: '',
        icon: '',
        'icon-xs': '',
        'icon-sm': '',
        'icon-lg': '',
      },
      orientation: {
        horizontal: '',
        vertical: '',
      },
      variant: {
        default:
          'has-[select[aria-hidden=true]:last-child]:[&>[data-slot=dropdown-trigger]:last-of-type]:rounded-e-button',
        segmented:
          'rounded-button border p-0.5 **:data-[slot=button]:max-h-full **:data-[slot=button]:min-w-13',
      },
    },
    compoundVariants: [
      {
        orientation: 'horizontal',
        variant: 'default',
        className:
          '*:data-slot:rounded-e-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-e-button! [&>[data-slot]~[data-slot]]:rounded-s-none [&>[data-slot]~[data-slot]]:border-s-0',
      },
      {
        orientation: 'vertical',
        variant: 'default',
        className:
          'flex-col *:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-button! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
      },
      {
        variant: 'segmented',
        buttonSize: ['default', 'icon'],
        className: 'h-9',
      },
      {
        variant: 'segmented',
        buttonSize: ['xs', 'icon-xs'],
        className: 'h-6',
      },
      {
        variant: 'segmented',
        buttonSize: ['sm', 'icon-sm'],
        className: 'h-8',
      },
      {
        variant: 'segmented',
        buttonSize: ['lg', 'icon-lg'],
        className: 'h-10',
      },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
      buttonSize: 'default',
    },
  },
);

/**
 * A container that groups related buttons together with consistent styling.
 */
function ButtonGroupRoot({
  className,
  orientation,
  variant,
  buttonVariant,
  buttonColor,
  buttonSize,
  children,
  ...props
}: ComponentProps<'div'> &
  VariantProps<typeof buttonGroupVariants> & {
    buttonVariant?: ButtonVariantProps['variant'];
    buttonColor?: ButtonVariantProps['color'];
    buttonSize?: ButtonVariantProps['size'];
  }) {
  return (
    <ButtonVariantsProvider
      value={{variant: buttonVariant, color: buttonColor, size: buttonSize}}
    >
      <div
        role="group"
        data-slot="button-group"
        data-orientation={orientation}
        data-variant={variant}
        className={cn(
          buttonGroupVariants({orientation, variant, buttonSize}),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ButtonVariantsProvider>
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          "flex items-center gap-2 rounded-button border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'button-group-text',
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'relative self-stretch bg-border data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px',
        className,
      )}
      {...props}
    />
  );
}

export const ButtonGroup = Object.assign(ButtonGroupRoot, {
  Root: ButtonGroupRoot,
  Text: ButtonGroupText,
  Separator: ButtonGroupSeparator,
});

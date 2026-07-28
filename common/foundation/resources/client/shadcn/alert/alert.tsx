import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@ui/utils/cn';

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-card border px-4 py-3 text-start text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pe-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: '',
        positive: '',
        warning: '',
      },
      fillStyle: {
        border: '',
        subtleFill: '',
        boldFill: '',
      },
    },
    compoundVariants: [
      {
        variant: 'destructive',
        fillStyle: 'border',
        className:
          'border-2 border-destructive bg-card *:[svg]:text-destructive',
      },
      {
        variant: 'positive',
        fillStyle: 'border',
        className: 'border-2 border-positive bg-card *:[svg]:text-positive',
      },
      {
        variant: 'warning',
        fillStyle: 'border',
        className: 'border-2 border-warning bg-card *:[svg]:text-warning',
      },
      {
        variant: 'destructive',
        fillStyle: 'subtleFill',
        className:
          'border-destructive/20 bg-lighten-destructive/10 *:data-[slot=alert-description]:text-foreground dark:bg-destructive/20 *:[svg]:text-destructive',
      },
      {
        variant: 'positive',
        fillStyle: 'subtleFill',
        className:
          'border-positive/20 bg-lighten-positive/10 *:data-[slot=alert-description]:text-foreground dark:bg-positive/20 *:[svg]:text-positive',
      },
      {
        variant: 'warning',
        fillStyle: 'subtleFill',
        className:
          'border-warning/20 bg-lighten-warning/10 *:data-[slot=alert-description]:text-foreground dark:bg-warning/20 *:[svg]:text-warning',
      },
      {
        variant: 'destructive',
        fillStyle: 'boldFill',
        className:
          'border-destructive bg-lighten-destructive/95 text-white *:data-[slot=alert-description]:text-white',
      },
      {
        variant: 'positive',
        fillStyle: 'boldFill',
        className:
          'border-positive bg-lighten-positive/95 text-white *:data-[slot=alert-description]:text-white',
      },
      {
        variant: 'warning',
        fillStyle: 'boldFill',
        className:
          'border-warning bg-lighten-warning/95 text-white *:data-[slot=alert-description]:text-white',
      },
    ],
    defaultVariants: {
      variant: 'default',
      fillStyle: 'border',
    },
  },
);

function AlertRoot({
  className,
  variant,
  fillStyle,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({variant, fillStyle}), className)}
      {...props}
    />
  );
}

function AlertTitle({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute inset-e-3 top-2.5', className)}
      {...props}
    />
  );
}

const Alert = Object.assign(AlertRoot, {
  Root: AlertRoot,
  Title: AlertTitle,
  Description: AlertDescription,
  Action: AlertAction,
});

export {Alert};

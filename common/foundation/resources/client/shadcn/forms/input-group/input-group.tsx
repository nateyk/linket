'use client';

import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {cva, type VariantProps} from 'class-variance-authority';
import {ComponentProps} from 'react';

function InputGroup({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps<'div'>(
      {
        role: 'group',
        className: cn(
          'group/input-group relative flex h-9 w-full min-w-0 items-stretch rounded-input border border-input transition-colors outline-none hover:border-foreground/20 in-data-[slot=command]:focus-within:outline-none! in-data-[slot=dropdown-content]:focus-within:border-inherit has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-solid has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:outline-1 has-[[data-slot][aria-invalid=true]]:outline-destructive has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5',
          className,
        ),
      },
      props,
    ),
    state: {
      slot: 'input-group',
    },
  });
}

// py-2
const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-input **:data-[slot=kbd]:bg-muted-foreground/10 **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start':
          'order-first ps-3 has-[>button]:-ms-1 has-[>kbd]:ms-[-0.15rem]',
        'inline-end':
          'order-last pe-3 has-[>button]:pe-2 has-[>kbd]:me-[-0.15rem]',
        'block-start':
          'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-3 [.border-b]:pb-3',
        'block-end':
          'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-3 [.border-t]:pt-3',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({align}), className)}
      onClick={ignoreEventsFromPortal(e => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      })}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(
  'flex items-center gap-2 rounded-button text-sm shadow-none',
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-input px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: '',
        'icon-xs': 'size-6 rounded-input p-0 has-[>svg]:p-0',
        'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
      },
    },
    defaultVariants: {
      size: 'xs',
    },
  },
);

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<ComponentProps<typeof Button>, 'size' | 'type'> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: 'button' | 'submit' | 'reset';
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({size}), className)}
      {...props}
    />
  );
}

function InputGroupText({className, ...props}: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({className, ...props}: ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'h-auto flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:outline-none aria-invalid:ring-0 dark:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  rows,
  ...props
}: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none focus-visible:outline-hidden aria-invalid:outline-hidden',
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
};

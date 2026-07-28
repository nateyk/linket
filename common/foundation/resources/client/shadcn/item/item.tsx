import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {Separator} from '@shadcn/separator';
import {cn} from '@ui/utils/cn';

function ItemGroup({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn(
        'group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        className,
      )}
      {...props}
    />
  );
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn('my-2', className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  'group/item flex w-full flex-wrap items-center rounded-card border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 in-data-[slot=dropdown-content]:p-0 [a]:transition-colors [a]:hover:bg-muted',
  {
    variants: {
      variant: {
        default: 'border-transparent',
        outline: 'border-border',
        muted: 'border-transparent bg-muted/50',
      },
      size: {
        default: 'gap-3.5 px-4 py-3.5',
        sm: 'gap-3.5 px-3.5 py-3',
        xs: 'gap-2.5 px-3 py-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function ItemRoot({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'div'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(itemVariants({variant, size, className})),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  });
}

const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          'size-10 overflow-hidden rounded-card-xs group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
      align: {
        start:
          'group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        center: '',
        end: 'group-has-data-[slot=item-description]/item:self-end',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ItemMedia({
  className,
  align = 'start',
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      data-align={align}
      className={cn(itemMediaVariants({variant, align, className}))}
      {...props}
    />
  );
}

function ItemContent({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0.5 [&+[data-slot=item-content]]:flex-none',
        className,
      )}
      {...props}
    />
  );
}

function ItemRow({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-row"
      className={cn(
        'flex items-center gap-2 overflow-hidden **:data-[slot=item-title]:shrink-0 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

function ItemTitle({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        'w-fit max-w-full truncate text-sm leading-snug font-medium underline-offset-4 in-data-[slot=dropdown-content]:font-normal',
        className,
      )}
      {...props}
    />
  );
}

function ItemDescription({className, ...props}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        'line-clamp-2 text-start text-sm font-normal text-muted-foreground in-data-[slot=dropdown-content]:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function ItemActions({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex items-center gap-2 md:ml-6', className)}
      {...props}
    />
  );
}

function ItemHeader({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        'flex basis-full items-center justify-between gap-2',
        className,
      )}
      {...props}
    />
  );
}

function ItemFooter({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        'flex basis-full items-center justify-between gap-2',
        className,
      )}
      {...props}
    />
  );
}

export const Item = Object.assign(ItemRoot, {
  Root: ItemRoot,
  Actions: ItemActions,
  Content: ItemContent,
  Description: ItemDescription,
  Footer: ItemFooter,
  Group: ItemGroup,
  Header: ItemHeader,
  Media: ItemMedia,
  Row: ItemRow,
  Separator: ItemSeparator,
  Title: ItemTitle,
});

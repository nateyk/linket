import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {cn} from '@ui/utils/cn';
import {ChevronDownIcon} from 'lucide-react';
import * as React from 'react';

function NavigationMenu({
  className,
  children,
  ...props
}: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="navigation-menu"
      className={cn(
        'relative flex max-w-max flex-1 items-center justify-center',
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cn(
        'flex flex-1 list-none items-center justify-center gap-1',
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  children,
  onKeyDown,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="navigation-menu-item"
      className={cn('group relative', className)}
      onKeyDown={e => {
        onKeyDown?.(e);
        if (e.key === 'Escape' && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }}
      {...props}
    >
      {children}
    </li>
  );
}

function NavigationMenuTrigger({
  className,
  children,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      data-slot="navigation-menu-trigger"
      className={cn(
        'inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-button bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50 group-focus-within:bg-accent group-focus-within:text-foreground group-hover:bg-accent group-hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180 motion-reduce:transition-none"
      />
    </button>
  );
}

function NavigationMenuContent({
  className,
  children,
  align = 'start',
  ...props
}: React.ComponentProps<'div'> & {align?: 'start' | 'center'}) {
  return (
    <div
      data-slot="navigation-menu-content"
      className={cn(
        "absolute top-full z-50 hidden w-auto pt-2 group-focus-within:block group-hover:block motion-reduce:animate-none animate-in fade-in slide-in-from-top-2 duration-150 before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']",
        align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
        className,
      )}
      {...props}
    >
      <div className="overflow-hidden rounded-card bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        {children}
      </div>
    </div>
  );
}

type NavigationMenuLinkProps = useRender.ComponentProps<'a'> & {
  asChild?: boolean;
};

function NavigationMenuLink({
  className,
  asChild,
  render,
  ...props
}: NavigationMenuLinkProps) {
  const baseClassName = cn(
    'inline-flex select-none items-center rounded-button px-3 py-2 text-sm font-medium leading-none text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground',
    className,
  );

  return useRender({
    defaultTagName: asChild ? 'span' : 'a',
    props: mergeProps<'a'>({className: baseClassName}, props),
    render,
    state: {
      slot: 'navigation-menu-link',
    },
  });
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
};

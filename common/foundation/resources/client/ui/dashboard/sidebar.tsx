'use client';

import {mergeProps} from '@base-ui/react/merge-props';
import {useRender} from '@base-ui/react/use-render';
import {MenuItemIcon} from '@common/menus/custom-menu';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {
  DashboardLayoutContext,
  DashboardSectionVariant,
} from '@common/ui/dashboard/dashboard-layout-context';
import {Drawer} from '@shadcn/drawer/drawer';
import {Separator} from '@shadcn/separator';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';
import {ComponentProps, createContext, ReactElement, use} from 'react';
import {NavLink} from 'react-router';

type Collapsible = 'offcanvas' | 'icon' | 'none';

const SidebarContext = createContext<{
  status: 'collapsed' | 'expanded';
  collapsible: Collapsible;
}>({
  status: 'expanded',
  collapsible: 'offcanvas',
});

function SidebarRoot({
  side = 'left',
  variant: propsVariant,
  collapsible = 'offcanvas',
  className,
  children,
  dir,
  width = 'w-3xs',
  widthIcon = 'w-15',
  forceOverlayMode = false,
  ...props
}: ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: DashboardSectionVariant;
  collapsible?: 'offcanvas' | 'icon' | 'none';
  width?: string;
  widthIcon?: string;
  forceOverlayMode?: boolean;
}) {
  const ctx = use(DashboardLayoutContext);
  let variant = propsVariant ?? ctx.defaultSectionVariant;
  const status =
    side === 'left' ? ctx.leftSidebar.status : ctx.rightSidebar.status;
  const setStatus =
    side === 'left' ? ctx.leftSidebar.setStatus : ctx.rightSidebar.setStatus;

  if (ctx.isMobileMode || forceOverlayMode) {
    return (
      <Drawer.Root
        open={status === 'expanded'}
        onOpenChange={open =>
          open ? setStatus('expanded') : setStatus('collapsed')
        }
        position="left"
      >
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Content popupClassName="p-0">
            <div
              className="flex h-full w-full flex-col"
              onClick={ignoreEventsFromPortal(e => {
                const target = e.target as HTMLElement;
                if (
                  (target.closest('button') || target.closest('a')) &&
                  !target.closest('button[data-slot="collapsible-trigger"]') &&
                  !target.closest('button[data-slot="sidebar-trigger"]') &&
                  !target.closest('button[aria-haspopup]')
                ) {
                  setStatus('collapsed');
                }
              })}
            >
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  const isIconMode = status === 'collapsed' && collapsible === 'icon';
  let activeWidth = width;

  if (isIconMode) {
    activeWidth = widthIcon;
  } else if (collapsible === 'offcanvas' && status === 'collapsed') {
    activeWidth = 'w-0';
  }

  if (isIconMode) {
    variant = 'inset';
  }

  return (
    <SidebarContext.Provider
      value={{
        status: status === 'expanded' ? 'expanded' : 'collapsed',
        collapsible,
      }}
    >
      <div
        data-slot="sidebar"
        data-sidebar-status={status}
        data-variant={variant}
        data-collapsible={status === 'collapsed' ? collapsible : ''}
        className={cn(
          'group flex h-full flex-col pt-1.5 text-foreground transition-width duration-100 ease-linear',
          variant === 'floating' && 'rounded-card bg-background shadow-sm',
          variant === 'default' && (side === 'left' ? 'border-e' : 'border-s'),
          activeWidth,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/**
 * Used to add matching spacing around content that is not part of a sidebar menu.
 */
function SidebarItem({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-item"
      data-sidebar="item"
      className={cn('px-3 py-2 group-data-[collapsible=icon]:p-2', className)}
      {...props}
    />
  );
}

function SidebarHeader({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('mx-2 bg-border data-horizontal:w-auto', className)}
      {...props}
    />
  );
}

function SidebarContent({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'compact-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'> & ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex h-8 shrink-0 items-center justify-start gap-0.5 rounded-button px-3 text-sm font-normal text-muted-foreground transition-[margin,opacity] duration-100 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-group-label',
      sidebar: 'group-label',
    },
  });
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<'button'> & ComponentProps<'button'>) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'absolute end-4.5 top-3.5 flex size-5 items-center justify-center rounded-button p-0 text-foreground transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-accent-foreground md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-group-action',
      sidebar: 'group-action',
    },
  });
}

function SidebarGroupContent({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  );
}

function SidebarMenu({className, ...props}: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  );
}

function SidebarMenuFromConfig({
  position,
  end,
  defaultIcons,
}: {
  position: string;
  end?: (item: MenuItemConfig) => boolean;
  defaultIcons?: Record<string, ReactElement<any>>;
}) {
  const menuConfig = useCustomMenu(position);
  return (
    <Sidebar.Menu>
      {menuConfig?.items.map(item => (
        <Sidebar.MenuItem key={item.id}>
          <Sidebar.MenuButton
            render={<NavLink to={item.action} end={end?.(item)} />}
            icon={<MenuItemIcon item={item} defaultIcons={defaultIcons} />}
          >
            <Trans message={item.label} />
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      ))}
    </Sidebar.Menu>
  );
}

function SidebarMenuItem({className, ...props}: ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full cursor-pointer items-center gap-2 truncate overflow-hidden rounded-button px-3 py-2 text-start text-sm transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pe-8 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 hover:bg-sidebar-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-accent-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--border))] hover:bg-sidebar-accent hover:text-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--accent))]',
      },
      size: {
        default: 'h-9 text-sm',
        sm: 'h-8 text-xs',
        lg: 'h-14 px-3 text-sm group-data-[collapsible=icon]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function SidebarMenuButton({
  icon,
  rightIcon,
  variant = 'default',
  size = 'default',
  className,
  children,
  render,
  ...props
}: useRender.ComponentProps<'button'> & {
  icon?: React.ReactElement<ComponentProps<'svg'>>;
  rightIcon?: React.ReactElement<ComponentProps<'svg'>>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const {status: state, collapsible} = use(SidebarContext);

  const comp = useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(sidebarMenuButtonVariants({variant, size}), className),
        children:
          state === 'collapsed' && collapsible === 'icon' ? (
            icon
          ) : (
            <>
              {icon}
              <span className="min-w-0 truncate">{children}</span>
              {rightIcon}
            </>
          ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-button',
      sidebar: 'menu-button',
      size,
    },
  });

  if (state === 'expanded') {
    return comp;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={comp} />
      <Tooltip.Content side="right" align="center">
        {children}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<'button'> &
  ComponentProps<'button'> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'absolute inset-y-0 end-2.5 my-auto flex size-5 items-center justify-center rounded-button p-0 text-foreground transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-accent-foreground peer-data-[size=default]/menu-button:top-2 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-accent-foreground md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0',
          showOnHover &&
            'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-accent-foreground aria-expanded:opacity-100 md:opacity-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-action',
      sidebar: 'menu-action',
    },
  });
}

function SidebarMenuBadge({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'pointer-events-none ml-auto flex h-5 min-w-5 items-center justify-center rounded-button text-xs font-medium text-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-accent-foreground peer-data-active/menu-button:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: ComponentProps<'div'> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const [width] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        'flex h-8 items-center gap-2 rounded-card-xs px-2',
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-card-xs"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({className, ...props}: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-s px-2.5 py-0.5 group-data-[collapsible=icon]:hidden rtl:-translate-x-px',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({className, ...props}: ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  render,
  size = 'md',
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<'a'> &
  ComponentProps<'a'> & {
    size?: 'sm' | 'md';
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn(
          'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-button px-3 text-foreground group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-accent-foreground active:bg-sidebar-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs rtl:translate-x-px data-active:bg-sidebar-accent data-active:text-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-accent-foreground',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-sub-button',
      sidebar: 'menu-sub-button',
      size,
      active: isActive,
    },
  });
}

export const Sidebar = Object.assign(SidebarRoot, {
  Root: SidebarRoot,
  Content: SidebarContent,
  Footer: SidebarFooter,
  Group: SidebarGroup,
  GroupAction: SidebarGroupAction,
  GroupContent: SidebarGroupContent,
  GroupLabel: SidebarGroupLabel,
  Header: SidebarHeader,
  Item: SidebarItem,
  Menu: SidebarMenu,
  MenuAction: SidebarMenuAction,
  MenuBadge: SidebarMenuBadge,
  MenuButton: SidebarMenuButton,
  MenuFromConfig: SidebarMenuFromConfig,
  MenuItem: SidebarMenuItem,
  MenuSkeleton: SidebarMenuSkeleton,
  MenuSub: SidebarMenuSub,
  MenuSubButton: SidebarMenuSubButton,
  MenuSubItem: SidebarMenuSubItem,
  Separator: SidebarSeparator,
});

import {CustomMenu, CustomMenuProps} from '@common/menus/custom-menu';
import {DashboardSidenavChildrenProps} from '@common/ui/dashboard-layout/dashboard-sidenav';
import {useToggleDashboardLeftSidebar} from '@common/ui/dashboard-layout/use-toggle-dashboard-left-sidebar';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {KeyboardArrowLeftIcon} from '@ui/icons/material/KeyboardArrowLeft';
import {KeyboardArrowRightIcon} from '@ui/icons/material/KeyboardArrowRight';
import {SvgIconProps} from '@ui/icons/svg-icon';
import clsx from 'clsx';
import {
  cloneElement,
  ComponentType,
  forwardRef,
  JSXElementConstructor,
  ReactElement,
  ReactNode,
} from 'react';
import type {To} from 'react-router';

type MatchDescendants = undefined | boolean | ((to: string) => boolean);

export type DashboardLeftSidebarVariant = 'withoutNavbar' | 'withNavbar';

export interface DashboardLeftSidebarProps
  extends DashboardSidenavChildrenProps {
  matchDescendants?: MatchDescendants;
  menuName: string;
  bottomContent?: ReactNode;
  afterMenu?: ReactNode;
  variant?: DashboardLeftSidebarVariant;
  customMenuRender?: CustomMenuProps['children'];
  showToggleSidebarButton?: boolean;
  defaultIcons?: Record<string, ComponentType<SvgIconProps>>;
}
export function DashboardLeftSidebar({
  className,
  isCompactMode = false,
  matchDescendants,
  menuName,
  bottomContent,
  afterMenu,
  isOverlayMode,
  showToggleSidebarButton = true,
  defaultIcons,
  customMenuRender,
}: DashboardLeftSidebarProps) {
  return (
    <div
      className={clsx(
        // Sidenav clones overflow-y-auto onto this shell. That scrolls the
        // footer with the menu and stacks it over the profile row. The menu
        // below is the only scroll region; the shell stays clipped.
        typeof className === 'string'
          ? className.replace(/\boverflow-y-auto\b/g, '').replace(/\s+/g, ' ').trim()
          : className,
        'relative flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden rounded-card bg-background/50 text-sm font-medium text-foreground shadow-sm dark:bg-card',
        isOverlayMode && 'bg-background shadow-2xl',
      )}
    >
      <div className={clsx(isCompactMode ? 'px-2 pt-2' : 'px-4 pt-4')}>
        <Logo
          color="auto"
          logoType={isCompactMode ? 'compact' : 'wide'}
          className={
            isCompactMode ? 'mx-auto h-8 w-8' : 'h-8 max-w-40'
          }
        />
        {showToggleSidebarButton && <SidebarToggleButton />}
      </div>
      <div className="compact-scrollbar min-h-0 flex-auto overflow-y-auto overflow-x-hidden px-2">
        <CustomMenu
          defaultIcons={defaultIcons}
          matchDescendants={matchDescendants}
          menu={menuName}
          orientation="vertical"
          onlyShowIcons={isCompactMode}
          iconClassName="size-4"
          gap="gap-0.5"
          className="w-full"
          itemClassName={({isActive}) =>
            dashboardLeftSidebarItemClassName({isActive, isCompactMode})
          }
        >
          {customMenuRender}
        </CustomMenu>
        {afterMenu}
      </div>
      <div
        className={clsx(
          'mt-auto flex shrink-0 flex-col gap-0.5 pb-2 pt-2',
          isCompactMode ? 'mx-auto px-2' : 'px-2',
        )}
      >
        {bottomContent}
      </div>
    </div>
  );
}

function SidebarToggleButton() {
  const {leftSidenavStatus, toggleLeftSidenav, isMobileMode} =
    useToggleDashboardLeftSidebar();

  if (isMobileMode) {
    return null;
  }

  return (
    <button
      className={clsx(
        'fixed top-1/2 z-10 flex -translate-y-1/2 select-none appearance-none items-center justify-center rounded-full border bg align-middle outline-none transition-[left,color,shadow] duration-200 hover:text-primary focus-visible:ring',
        leftSidenavStatus === 'open' ? 'left-[212px]' : 'left-12',
      )}
      onClick={() => toggleLeftSidenav()}
    >
      {leftSidenavStatus === 'open' ? (
        <KeyboardArrowLeftIcon size="sm" />
      ) : (
        <KeyboardArrowRightIcon size="sm" />
      )}
    </button>
  );
}

interface DashboardLeftSidebarItemProps {
  elementType?: 'button' | 'a' | JSXElementConstructor<any>;
  isCompact?: boolean;
  children: [ReactElement<SvgIconProps>, ReactNode, ...ReactNode[]];
  className?: string;
  to?: To;
  target?: '_blank';
}

export const DashboardLeftSidebarItem = forwardRef<
  unknown,
  DashboardLeftSidebarItemProps
>(
  (
    {
      elementType = 'button',
      isCompact = false,
      children: [icon, label, ...otherChildren],
      className,
      target,
      to,
      ...otherProps
    },
    ref,
  ) => {
    const Element = elementType;
    return (
      <Element
        ref={ref}
        {...otherProps}
        target={target}
        to={to}
        className={clsx(
          className,
          'flex',
          isCompact ? 'gap-2' : 'gap-2',
          dashboardLeftSidebarItemClassName({
            isActive: false,
            isCompactMode: isCompact,
          }),
        )}
      >
        {cloneElement(icon, {size: null, className: 'size-4'})}
        {!isCompact && label}
        {otherChildren}
      </Element>
    );
  },
);

export function dashboardLeftSidebarItemClassName({
  isActive,
  isCompactMode,
}: {
  isActive: boolean;
  isCompactMode: boolean;
}) {
  return clsx(
    'flex-shrink-0 rounded-button',
    isCompactMode
      ? 'size-8 items-center justify-center p-2'
      : 'h-9 w-full justify-start px-3 py-2 text-sm',
    isActive
      ? 'bg-sidebar-accent font-medium text-accent-foreground'
      : 'text-foreground hover:bg-sidebar-accent hover:text-accent-foreground',
  );
}

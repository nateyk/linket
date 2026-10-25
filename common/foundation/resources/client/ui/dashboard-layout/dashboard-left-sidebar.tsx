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
        'relative flex h-full min-h-0 w-full flex-col gap-5 overflow-hidden border-border bg-sidebar text-sm font-medium text-foreground',
        isOverlayMode ? 'border-r bg-background shadow-2xl' : 'border-r',
      )}
    >
      <div className={clsx(isCompactMode ? 'px-1.5 pt-1.5' : 'px-3 pt-6')}>
        <Logo
          color="auto"
          logoType={isCompactMode ? 'compact' : 'wide'}
          className={
            isCompactMode ? 'mx-auto mt-3 h-8.5 w-8.5' : 'mb-3 ml-2.5 h-9'
          }
        />
        {showToggleSidebarButton && <SidebarToggleButton />}
      </div>
      <CustomMenu
        defaultIcons={defaultIcons}
        matchDescendants={matchDescendants}
        menu={menuName}
        orientation="vertical"
        onlyShowIcons={isCompactMode}
        iconClassName="size-4"
        gap={isCompactMode ? 'gap-0.5' : 'gap-1'}
        className={clsx(
          'compact-scrollbar min-h-0 flex-auto overflow-y-auto overflow-x-hidden',
          isCompactMode ? 'px-1.5' : 'px-3',
        )}
        itemClassName={({isActive}) =>
          dashboardLeftSidebarItemClassName({isActive, isCompactMode})
        }
      >
        {customMenuRender}
      </CustomMenu>
      <div
        className={clsx(
          'mt-auto flex shrink-0 flex-col gap-0.5 border-t border-border pb-1.5 pt-4',
          isCompactMode ? 'mx-auto px-1.5' : 'px-3',
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
        {cloneElement(icon, {size: 'xs'})}
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
    'rounded-card flex-shrink-0',
    isCompactMode
      ? 'h-12 w-12 items-center justify-center'
      : 'block w-full justify-start px-4 py-3',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'text-foreground hover:bg-sidebar-accent hover:text-accent-foreground',
  );
}

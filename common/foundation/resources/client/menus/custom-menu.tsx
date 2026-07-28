import {MenuConfig, MenuItemConfig} from '@common/menus/menu-config';
import {Orientation} from '@ui/forms/orientation';
import {Trans} from '@ui/i18n/trans';
import {createSvgIconFromTree} from '@ui/icons/create-svg-icon';
import {SvgIconProps} from '@ui/icons/svg-icon';
import {Tooltip} from '@ui/tooltip/tooltip';
import {cn} from '@ui/utils/cn';
import React, {
  cloneElement,
  ComponentProps,
  forwardRef,
  Fragment,
  ReactElement,
  ReactNode,
} from 'react';
import {NavLink} from 'react-router';
import {useCustomMenu} from './use-custom-menu';

type MatchDescendants = undefined | boolean | ((to: string) => boolean);

// legacy, just use "useCustomMenu" directly with UnstyledCustomMenuItem
export interface CustomMenuProps {
  className?: string;
  matchDescendants?: MatchDescendants;
  iconClassName?: string;
  itemClassName?:
    | string
    | ((props: {
        isActive: boolean;
        item: MenuItemConfig;
      }) => string | undefined);
  gap?: string;
  menu?: string | MenuConfig;
  children?: (
    menuItem: MenuItemConfig,
    menuItemProps: MenuItemProps,
  ) => ReactElement | null;
  orientation?: Orientation;
  onlyShowIcons?: boolean;
  unstyled?: boolean;
  defaultIcons?: Record<string, ReactElement<SvgIconProps>>;
}
export function CustomMenu({
  className,
  iconClassName,
  itemClassName,
  gap = 'gap-7.5',
  menu: menuOrPosition,
  orientation = 'horizontal',
  children,
  matchDescendants,
  onlyShowIcons,
  unstyled = false,
  defaultIcons,
}: CustomMenuProps) {
  const menu = useCustomMenu(menuOrPosition);
  if (!menu) return null;

  return (
    <div
      className={cn(
        'flex',
        gap,
        orientation === 'vertical' ? 'flex-col items-start' : 'items-center',
        className,
      )}
      data-menu-id={menu.id}
    >
      {menu.items.map(item => {
        const menuItemProps: MenuItemProps = {
          item,
          unstyled,
          onlyShowIcon: onlyShowIcons,
          matchDescendants,
          iconClassName,
          defaultIcons,
          className: props => {
            return typeof itemClassName === 'function'
              ? itemClassName({...props, item})
              : itemClassName;
          },
        };

        if (children) {
          return children(item, menuItemProps);
        }
        return <CustomMenuItem key={item.id} {...menuItemProps} />;
      })}
    </div>
  );
}

// legacy, migrate to UnstyledCustomMenuItem
export interface MenuItemProps extends React.RefAttributes<HTMLAnchorElement> {
  item: MenuItemConfig;
  icon?: ReactElement<SvgIconProps> | null;
  defaultIcons?: Record<string, ReactElement<ComponentProps<'svg'>>>;
  iconClassName?: string;
  children?: ReactNode;
  className?: (props: {isActive: boolean}) => string | undefined;
  matchDescendants?: MatchDescendants;
  onlyShowIcon?: boolean;
  unstyled?: boolean;
  extraContent?: ReactNode;
  position?: string;
}
export const CustomMenuItem = forwardRef<HTMLAnchorElement, MenuItemProps>(
  (
    {
      item,
      className,
      matchDescendants,
      unstyled,
      onlyShowIcon,
      iconClassName,
      extraContent,
      position = 'relative',
      defaultIcons,
      icon: propsIcon,
      ...linkProps
    },
    ref,
  ) => {
    const label = <Trans message={item.label} />;
    let icon: ReactElement | null = null;

    if (propsIcon) {
      icon = propsIcon;
    } else if (item.icon) {
      const IconCmp = createSvgIconFromTree(item.icon, '', 'lucide');
      icon = IconCmp && <IconCmp className={iconClassName} />;
    } else if (defaultIcons) {
      const IconCmp = defaultIcons[item.action.split('?')[0]];
      icon =
        IconCmp &&
        cloneElement(IconCmp, {
          className: iconClassName,
        });
    }

    if (icon && onlyShowIcon && label) {
      icon = (
        <Tooltip label={label} placement="right">
          {icon}
        </Tooltip>
      );
    }
    const content = (
      <Fragment>
        {icon}
        {(!icon || !onlyShowIcon) && label}
      </Fragment>
    );

    const baseClassName =
      !unstyled && 'whitespace-nowrap flex items-center justify-start gap-2';
    const focusClassNames = !unstyled && 'outline-hidden focus-visible:ring-2';

    if (item.type === 'link') {
      return (
        <a
          className={cn(
            baseClassName,
            className?.({isActive: false}),
            focusClassNames,
            position,
          )}
          href={item.action}
          target={item.target}
          data-menu-item-id={item.id}
          ref={ref}
          {...linkProps}
        >
          {extraContent}
          {content}
        </a>
      );
    }
    return (
      <NavLink
        end={
          typeof matchDescendants === 'function'
            ? matchDescendants(item.action)
            : matchDescendants
        }
        className={props =>
          cn(baseClassName, className?.(props), focusClassNames, position)
        }
        to={item.action}
        target={item.target}
        data-menu-item-id={item.id}
        ref={ref}
        {...linkProps}
      >
        {extraContent}
        {content}
      </NavLink>
    );
  },
);

export function MenuItemIcon({
  item,
  defaultIcons,
}: {
  item: MenuItemConfig;
  defaultIcons?: Record<string, ReactElement<ComponentProps<'svg'>>>;
}) {
  if (item.icon) {
    const IconCmp = createSvgIconFromTree(item.icon, '', 'lucide');
    return IconCmp ? <IconCmp /> : null;
  } else if (defaultIcons) {
    return defaultIcons[item.action.split('?')[0]];
  }

  return null;
}

type UnstyledCustomMenuItemProps = {
  item: MenuItemProps['item'];
  icon?: MenuItemProps['icon'];
  defaultIcons?: MenuItemProps['defaultIcons'];
  className?: MenuItemProps['className'] | string;
  ref?: MenuItemProps['ref'];
  children?: MenuItemProps['children'];
  matchDescendants?: MenuItemProps['matchDescendants'];
};
export function UnstyledCustomMenuItem({
  item,
  icon,
  defaultIcons,
  className,
  ref,
  children,
  matchDescendants,
}: UnstyledCustomMenuItemProps) {
  if (!icon) {
    icon = <MenuItemIcon item={item} defaultIcons={defaultIcons} />;
  }

  const classNameFn =
    typeof className === 'function' ? className : () => className;

  if (item.type === 'link') {
    return (
      <a
        className={classNameFn({isActive: false})}
        href={item.action}
        target={item.target}
        ref={ref}
      >
        {children}
        {icon}
        <Trans message={item.label} />
      </a>
    );
  }
  return (
    <NavLink
      end={
        typeof matchDescendants === 'function'
          ? matchDescendants(item.action)
          : matchDescendants
      }
      className={props => classNameFn(props)}
      to={item.action}
      target={item.target}
      ref={ref}
    >
      {children}
      {icon}
      <Trans message={item.label} />
    </NavLink>
  );
}

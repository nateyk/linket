import {ChevronRightIcon} from '@ui/icons/material/ChevronRight';
import clsx from 'clsx';
import {HTMLAttributes, ReactElement, ReactNode} from 'react';
import {Link} from 'react-router';
import type {BreadcrumbSizeStyle} from './breadcrumb';

export interface BreadcrumbItemProps {
  sizeStyle?: BreadcrumbSizeStyle;
  isMenuTrigger?: boolean;
  isMenuItem?: boolean;
  children: ReactNode | ((state: {isMenuItem?: boolean}) => ReactNode);
  isCurrent?: boolean;
  onSelected?: () => void;
  isClickable?: boolean;
  isDisabled?: boolean;
  inactiveMuted?: boolean;
  className?: string;
  isLink?: boolean;
  to?: string;
  relative?: string;
}
export function BreadcrumbItem(props: BreadcrumbItemProps) {
  const {
    isCurrent,
    sizeStyle,
    isMenuTrigger,
    isClickable,
    isDisabled,
    inactiveMuted,
    onSelected,
    className,
    isMenuItem,
    isLink,
    to,
    relative,
  } = props;

  const children =
    typeof props.children === 'function'
      ? props.children({isMenuItem})
      : props.children;

  if (isMenuItem) {
    return children as ReactElement;
  }

  const domProps: HTMLAttributes<HTMLDivElement> & {
    to?: string;
    relative?: string;
  } = isMenuTrigger
    ? {}
    : {
        tabIndex: isLink && !isDisabled ? 0 : undefined,
        role: isLink ? 'link' : undefined,
        'aria-disabled': isLink ? isDisabled : undefined,
        'aria-current': isCurrent && isLink ? 'page' : undefined,
        onClick: () => onSelected?.(),
        to,
        relative,
      };

  const Component = (to ? Link : 'div') as any;

  return (
    <li
      className={clsx(
        `transition-button relative inline-flex min-w-0 flex-shrink-0 items-center justify-start ${sizeStyle?.font}`,
        (!isClickable || isDisabled) && 'pointer-events-none',
        !isCurrent && isDisabled && 'text-foreground/30',
        !isCurrent && !isDisabled && inactiveMuted && 'text-muted-foreground',
      )}
    >
      <Component
        {...domProps}
        className={clsx(
          className,
          'rounded-button cursor-pointer overflow-hidden px-1.5 whitespace-nowrap',
          !isMenuTrigger && 'hover:bg-accent py-0.5',
          !isMenuTrigger &&
            (isLink || to) &&
            'outline-hidden focus-visible:ring',
        )}
      >
        {children}
      </Component>
      {isCurrent === false && (
        <ChevronRightIcon
          size={sizeStyle?.icon}
          className={clsx(isDisabled && 'text-foreground/30')}
        />
      )}
    </li>
  );
}

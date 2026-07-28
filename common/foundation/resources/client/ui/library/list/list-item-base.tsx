import {CheckIcon} from '@ui/icons/material/Check';
import clsx from 'clsx';
import React, {
  ComponentPropsWithRef,
  JSXElementConstructor,
  ReactNode,
} from 'react';
import {Link, To} from 'react-router';

export interface ListItemBaseProps extends ComponentPropsWithRef<'div'> {
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  endSection?: ReactNode;
  description?: ReactNode;
  textLabel?: string;
  capitalizeFirst?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isActive?: boolean;
  className?: string;
  showCheckmark?: boolean;
  elementType?: 'a' | JSXElementConstructor<any> | 'div';
  target?: string;
  to?: To;
  href?: string;
  radius?: string;
  padding?: string;
}

export const ListItemBase = React.forwardRef<
  HTMLDivElement | null,
  ListItemBaseProps
>((props, ref) => {
  let {
    startIcon,
    capitalizeFirst,
    children,
    description,
    endIcon,
    endSection,
    isDisabled,
    isActive,
    isSelected,
    showCheckmark,
    elementType,
    radius,
    padding,
    to,
    ...domProps
  } = props;

  if (!startIcon && showCheckmark) {
    startIcon = (
      <CheckIcon
        size="xs"
        className={clsx('text-primary', !isSelected && 'invisible')}
      />
    );
  }

  // if (!endIcon && !endSection && showCheckmark) {
  //   endIcon = (
  //     <CheckIcon size="sm" className={clsx('text-primary', 'invisible')} />
  //   );
  // }

  const iconClassName = clsx('overflow-hidden flex-shrink-0');
  const endSectionClassName = clsx(!isDisabled && 'text-muted-foreground');

  const Element = elementType ? elementType : to ? Link : 'div';

  return (
    <Element
      {...domProps}
      to={to}
      aria-disabled={isDisabled}
      className={itemClassName(props)}
      ref={ref}
    >
      {startIcon && <div className={iconClassName}>{startIcon}</div>}
      <div
        className={clsx(
          'mr-auto w-full min-w-auto overflow-hidden text-ellipsis',
          capitalizeFirst && 'first-letter:capitalize',
        )}
      >
        {children}
        {description && (
          <div
            className={clsx(
              'mt-1 text-xs whitespace-normal',
              isDisabled ? 'text-foreground/30' : 'text-muted-foreground',
            )}
          >
            {description}
          </div>
        )}
      </div>
      {(endIcon || endSection) && (
        <div className={endIcon ? iconClassName : endSectionClassName}>
          {endIcon || endSection}
        </div>
      )}
    </Element>
  );
});

function itemClassName(props: ListItemBaseProps): string {
  const {
    className,
    showCheckmark,
    endIcon,
    endSection,
    radius,
    padding: userPadding,
  } = props;

  const padding = userPadding ?? 'px-3 py-2';

  return clsx(
    'w-full select-none outline-hidden cursor-pointer',
    'text-sm truncate flex items-center gap-2.5',
    padding,
    stateStyleClassName(props),
    className,
    radius,
  );
}
function stateStyleClassName({
  isSelected,
  isActive,
  isDisabled,
}: ListItemBaseProps): string {
  if (isDisabled) {
    return 'text-foreground/30 pointer-events-none';
  } else if (isSelected) {
    return 'bg-accent';
  } else if (isActive) {
    return 'bg-accent';
  } else {
    return 'hover:bg-accent';
  }
}

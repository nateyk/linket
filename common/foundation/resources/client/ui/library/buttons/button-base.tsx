import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {ComponentPropsWithRef, forwardRef, JSXElementConstructor} from 'react';
import type {RelativeRoutingType, To} from 'react-router';
import {
  ButtonColor,
  ButtonVariant,
  getSharedButtonStyle,
} from './get-shared-button-style';

export interface ButtonBaseProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'color'
> {
  color?: ButtonColor;
  variant?: ButtonVariant;
  value?: any;
  justify?: string;
  display?: string;
  radius?: string | null;
  shadow?: string;
  border?: string;
  borderColor?: string;
  whitespace?: string;
  form?: string;
  to?: To;
  state?: any;
  relative?: RelativeRoutingType;
  href?: string;
  target?: '_blank';
  rel?: string;
  replace?: boolean;
  end?: boolean;
  elementType?: 'button' | 'a' | 'div' | JSXElementConstructor<any>;
  download?: boolean | string;
}

export const ButtonBase = forwardRef<
  HTMLButtonElement | HTMLLinkElement,
  ButtonBaseProps
>((props, ref) => {
  const {
    children,
    color = null,
    variant,
    radius,
    shadow,
    whitespace,
    justify = 'justify-center',
    className,
    href,
    form,
    border,
    borderColor,
    elementType,
    to,
    state,
    relative,
    replace,
    end,
    display,
    type = 'button',
    onClick,
    onPointerDown,
    onPointerUp,
    onKeyDown,
    ...domProps
  } = props;
  const Element = elementType || (href ? 'a' : 'button');
  const isLink = Element === 'a';

  return (
    <Element
      ref={ref as any}
      form={isLink ? undefined : form}
      href={href}
      to={to}
      state={state}
      relative={relative}
      type={isLink ? undefined : type}
      replace={replace}
      end={end}
      onPointerDown={ignoreEventsFromPortal(onPointerDown)}
      onPointerUp={ignoreEventsFromPortal(onPointerUp)}
      onClick={ignoreEventsFromPortal(onClick)}
      onKeyDown={ignoreEventsFromPortal(onKeyDown)}
      className={cn(
        'focus-visible:ring-2 focus-visible:ring-inset',
        color === 'primary' ? 'focus-visible:ring' : 'focus-visible:ring',
        getSharedButtonStyle({
          variant,
          color,
          border,
          borderColor,
          whitespace,
          display,
          shadow,
        }),
        radius,
        justify,
        className,
      )}
      {...domProps}
    >
      {children}
    </Element>
  );
});

import {ButtonBase, ButtonBaseProps} from '@ui/buttons/button-base';
import clsx from 'clsx';
import {ChevronDownIcon} from 'lucide-react';
import {forwardRef, ReactNode} from 'react';

interface Props extends ButtonBaseProps {
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  description?: ReactNode;
  radius?: string;
  size?: 'md' | 'lg';
}
export const SettingsSectionButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      startIcon,
      children,
      className,
      description,
      endIcon,
      size = 'md',
      radius = 'rounded-input',
      ...other
    },
    ref,
  ) => {
    return (
      <ButtonBase
        ref={ref}
        display="flex"
        className={clsx(
          size === 'md' ? 'h-10.5' : 'h-14.5',
          radius,
          'relative mb-2.5 w-full items-center gap-2.5',
          'border bg-background px-3.5 hover:bg-accent',
          className,
          other.disabled && 'pointer-events-none opacity-50',
        )}
        variant={null}
        {...other}
      >
        {startIcon}
        <span className="block min-w-0">
          <span className="block text-sm">{children}</span>
          {description && (
            <span className="block overflow-hidden text-xs text-ellipsis whitespace-nowrap text-muted-foreground">
              {description}
            </span>
          )}
        </span>
        <div className="ml-auto">
          {endIcon ?? <ChevronDownIcon className="text-muted-foreground" />}
        </div>
      </ButtonBase>
    );
  },
);

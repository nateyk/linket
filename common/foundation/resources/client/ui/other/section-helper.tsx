import {IconButton} from '@ui/buttons/icon-button';
import {CloseIcon} from '@ui/icons/material/Close';
import clsx from 'clsx';
import {ReactNode} from 'react';

export interface SectionHelperProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  color?:
    | 'positive'
    | 'danger'
    | 'warning'
    | 'primary'
    | 'neutral'
    | 'bgWeaker'
    | 'bg';
  className?: string;
  size?: 'sm' | 'md';
  leadingIcon?: ReactNode;
  onClose?: () => void;
}
export function SectionHelper({
  title,
  description,
  actions,
  color = 'primary',
  className,
  size = 'md',
  leadingIcon,
  onClose,
}: SectionHelperProps) {
  return (
    <div
      className={clsx(
        className,
        'rounded-card border px-3',
        leadingIcon || onClose ? 'py-2' : 'py-3',
        size === 'sm' ? 'text-xs' : 'text-sm',
        color === 'positive' &&
          'border-positive/20 bg-positive/10 dark:bg-positive/20',
        color === 'warning' &&
          'border-warning/20 bg-warning/10 dark:bg-warning/20',
        color === 'danger' &&
          'border-destructive/20 bg-destructive/10 dark:bg-destructive/20',
        color === 'primary' &&
          'border-primary/20 bg-primary/10 dark:bg-primary/20',
        color === 'neutral' && 'bg',
        color === 'bgWeaker' && 'bg-muted',
        color === 'bg' && 'bg',
      )}
    >
      {title && (
        <div
          className={clsx(
            'flex items-center gap-1.5',
            (description || actions) && 'mb-1',
          )}
        >
          {leadingIcon}
          <div className="font-medium">{title}</div>
          {onClose ? (
            <IconButton size="xs" className="ml-auto" onClick={() => onClose()}>
              <CloseIcon />
            </IconButton>
          ) : null}
        </div>
      )}
      {description && <div>{description}</div>}
      {actions && <div className="mt-3.5">{actions}</div>}
    </div>
  );
}

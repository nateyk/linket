import {cn} from '@ui/utils/cn';
import {Children, ReactElement, ReactNode} from 'react';

interface SettingsSectionHeaderProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
export function SettingsSectionHeader({
  children,
  size = 'md',
  className,
}: SettingsSectionHeaderProps) {
  const [title, description] = Children.toArray(children);

  let textStyle = 'text-base font-medium';
  if (size === 'sm') {
    textStyle = 'text-sm font-semibold';
  } else if (size === 'lg') {
    textStyle = 'text-lg font-medium';
  }

  return (
    <div className={cn('mb-6', className)}>
      <div className={cn(textStyle, description && 'mb-0.5')}>{title}</div>
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
    </div>
  );
}

interface SettingsPanelProps {
  title: ReactNode;
  description?: ReactElement;
  link?: ReactElement | null;
  children: ReactNode;
  className?: string;
  id?: string;
  layout?: 'vertical' | 'horizontal';
}
export function SettingsPanel({
  title,
  description,
  link,
  children,
  className,
  id,
  layout = 'horizontal',
}: SettingsPanelProps) {
  return (
    <div
      id={id}
      className={cn(
        'items-center gap-6 rounded-card border px-6 pt-7.5 pb-9',
        className,
        layout === 'horizontal' && '@[900px]/settings-form:flex',
      )}
    >
      <div
        className={cn(
          'px-3',
          layout === 'horizontal'
            ? 'mb-8.5 @[900px]:mb-0 @[900px]/settings-form:w-1/2'
            : 'mb-6',
        )}
      >
        <SettingsSectionHeader className="mb-0">
          {title}
          <div className={cn(layout === 'horizontal' && '@[900px]:max-w-85')}>
            {description}
          </div>
        </SettingsSectionHeader>
        {link && <div className="mt-3 text-sm">{link}</div>}
      </div>
      <div className={cn('px-3', layout === 'horizontal' && '@[900px]:w-1/2')}>
        {children}
      </div>
    </div>
  );
}

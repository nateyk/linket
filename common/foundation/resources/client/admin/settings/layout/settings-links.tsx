import {ButtonVariantProps, LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {BookOpenIcon, SettingsIcon} from 'lucide-react';
import {ReactElement, ReactNode} from 'react';
import {Link} from 'react-router';

interface Props {
  link: string;
  className?: string;
  children?: ReactNode;
  target?: string;
  variant?: 'link' | 'button';
  buttonVariant?: 'text' | 'icon';
  icon?: ReactElement;
  size?: ButtonVariantProps['size'];
}
export function DocsLink({
  link,
  className,
  children,
  target = '_blank',
  variant = 'link',
  buttonVariant = 'text',
  icon,
  size,
}: Props) {
  const {site} = useSettings();
  if (site.hide_docs_buttons) {
    return null;
  }

  if (variant === 'button') {
    if (buttonVariant === 'icon') {
      return (
        <LinkButton
          variant="outline"
          size={size ?? 'icon-sm'}
          to={link}
          target={target as any}
        >
          <BookOpenIcon />
        </LinkButton>
      );
    }
    return (
      <LinkButton
        variant="outline"
        size={size ?? 'sm'}
        to={link}
        target={target as any}
      >
        <BookOpenIcon />
        {children ?? <Trans message="Learn more" />}
      </LinkButton>
    );
  }

  return (
    <div
      className={cn(
        'group inline-flex items-center gap-2 text-primary [&_svg]:size-4',
        className,
      )}
    >
      {icon ? icon : <BookOpenIcon />}
      <a href={link} target={target} className="group-hover:underline">
        {children ?? <Trans message="Learn more" />}
      </a>
    </div>
  );
}

export function ConfigureLink({link, className, children, target}: Props) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SettingsIcon className="size-4 text-primary" />
      <Link to={link} className="text-primary hover:underline" target={target}>
        {children ?? <Trans message="Configure" />}
      </Link>
    </div>
  );
}

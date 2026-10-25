import {useAuth} from '@common/auth/use-auth';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';
import {Link} from 'react-router';

type Props = {
  color?: 'dark' | 'light' | 'auto';
  className?: string;
  logoType?: 'wide' | 'compact' | 'auto';
  url?: string;
  size?: string;
};
export function Logo({
  color = 'auto',
  className,
  logoType = 'auto',
  url,
  size,
}: Props) {
  className = size ? `${size} ${className ?? ''}`.trim() : className;
  const isDarkMode = useIsDarkMode();

  if (color === 'auto') {
    color = isDarkMode ? 'light' : 'dark';
  }

  if (logoType === 'compact') {
    return <CompactLogo color={color} className={className} url={url} />;
  } else if (logoType === 'wide') {
    return <WideLogo color={color} className={className} url={url} />;
  }

  return <AutoLogo color={color} className={className} url={url} />;
}

function CompactLogo({color, className, url}: Omit<Props, 'logoType'>) {
  const {branding} = useSettings();
  const {trans} = useTrans();

  // fallback to light logo if dark logo is not available
  const src =
    color === 'dark' && branding.logo_dark_mobile
      ? branding.logo_dark_mobile
      : branding.logo_light_mobile;

  if (!src) return null;

  return (
    <WrapperLink url={url} ariaLabel={trans({message: 'Go to homepage'})}>
      <img src={src} className={cn('block w-auto', className)} alt="" />
    </WrapperLink>
  );
}

function AutoLogo({color, className, url}: Omit<Props, 'logoType'>) {
  const {branding} = useSettings();

  let wideLogo: string;
  let compactLogo: string;
  if (color === 'light') {
    wideLogo = branding.logo_light;
    compactLogo = branding.logo_light_mobile;
  } else {
    wideLogo = branding.logo_dark;
    compactLogo = branding.logo_dark_mobile;
  }

  if (!wideLogo && !compactLogo) {
    return null;
  }

  return (
    <WrapperLink url={url} ariaLabel={branding.site_name}>
      <picture>
        <source srcSet={compactLogo || wideLogo} media="(max-width: 768px)" />
        <source srcSet={wideLogo} media="(min-width: 768px)" />
        <img
          src={wideLogo || compactLogo}
          className={cn('block h-8 w-auto', className)}
          alt=""
        />
      </picture>
    </WrapperLink>
  );
}

function WideLogo({color, className, url}: Omit<Props, 'logoType'>) {
  const {branding} = useSettings();

  const src =
    color === 'dark' && branding.logo_dark
      ? branding.logo_dark
      : branding.logo_light;

  if (!src) return null;

  return (
    <WrapperLink url={url} ariaLabel={branding.site_name}>
      <img src={src} className={cn('block h-8 w-auto', className)} alt="" />
    </WrapperLink>
  );
}

type WrapperLinkProps = {
  className?: string;
  children: ReactNode;
  url?: string;
  /** The lockup is image-only (the wordmark svg carries the visible brand,
   * its alt is empty), so the link itself must be named or it has no
   * accessible name (WCAG 4.1.2). Using site_name also satisfies WCAG 2.5.3
   * "Label in Name" for voice control ("click Linket"). */
  ariaLabel?: string;
};
function WrapperLink({className, children, url, ariaLabel}: WrapperLinkProps) {
  const {getRedirectUri} = useAuth();

  return (
    <Link
      to={url || getRedirectUri()}
      className={cn('block shrink-0', className)}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

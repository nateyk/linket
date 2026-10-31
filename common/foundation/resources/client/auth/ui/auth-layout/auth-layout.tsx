import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {getAssetUrl} from '@ui/utils/urls/get-asset-url';
import {ReactNode} from 'react';
import {Link} from 'react-router';
import authBgSvg from './auth-bg.svg';
import {AuthLayoutFooter} from './auth-layout-footer';

interface AuthPageProps {
  heading?: ReactNode;
  message?: ReactNode;
  children: ReactNode;
}
export function AuthLayout({heading, children, message}: AuthPageProps) {
  const {branding} = useSettings();
  const isDarkMode = useIsDarkMode();

  return (
    <main
      className="md:px-10vw flex h-screen flex-col items-center overflow-y-auto bg-muted px-3.5 pt-17.5 dark:bg-background"
      style={{backgroundImage: isDarkMode ? undefined : `url("${authBgSvg}")`}}
    >
      <Link
        to="/"
        aria-label={branding.site_name}
        className="mb-10 flex shrink-0 items-center gap-2.5"
      >
        <img
          src={getAssetUrl(
            isDarkMode ? branding.logo_light : branding.logo_dark,
          )}
          className="block h-10 w-auto"
          alt=""
        />
      </Link>
      <div className="mx-auto w-full max-w-110 rounded-card bg-card px-10 pt-10 pb-8 shadow-sm md:shadow-xl">
        {heading && <h1 className="mb-5 text-xl">{heading}</h1>}
        {children}
      </div>
      {message && <div className="mt-9 text-sm">{message}</div>}
      <AuthLayoutFooter />
    </main>
  );
}

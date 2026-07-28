import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
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
  const {trans} = useTrans();

  return (
    <main
      className="md:px-10vw flex h-screen flex-col items-center overflow-y-auto bg-muted px-3.5 pt-17.5 dark:bg-background"
      style={{backgroundImage: isDarkMode ? undefined : `url("${authBgSvg}")`}}
    >
      <Link
        to="/"
        className="mb-10 block shrink-0"
        aria-label={trans({message: 'Go to homepage'})}
      >
        <img
          src={isDarkMode ? branding.logo_light : branding?.logo_dark}
          className="m-auto block h-10.5 w-auto"
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

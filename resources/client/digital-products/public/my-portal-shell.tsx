import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ReactNode} from 'react';
import {Link} from 'react-router';

export function MyPortalShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const {branding} = useSettings();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {branding.logo_dark ? (
          <Link to="/" aria-label={branding.site_name} className="flex items-center">
            <img src={branding.logo_dark} alt="" className="h-7 w-auto" />
          </Link>
        ) : (
          <Link
            to="/"
            className="text-base font-semibold text-foreground"
          >
            {branding.site_name}
          </Link>
        )}
        <span className="hidden text-sm text-muted-foreground sm:block">
          <Trans message="Need help? Contact support." />
        </span>
      </header>

      <div
        className={cn(
          'mx-auto w-full flex-1 px-4 pb-8 sm:px-6 lg:px-8',
          wide ? 'max-w-7xl' : 'max-w-2xl',
        )}
      >
        {children}
      </div>

      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <span>
          © {new Date().getFullYear()}, {branding.site_name}.
        </span>
        <span className="hidden sm:inline">
          <Trans message="Purchases stay tied to your verified email." />
        </span>
      </footer>
    </div>
  );
}

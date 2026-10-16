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
    <div className="min-h-screen bg-background px-2 py-2 sm:px-4 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full flex-col rounded-card bg-muted ring-1 ring-border">
        <header className="flex items-center justify-between px-6 py-4 lg:px-8">
          {branding.logo_dark ? (
            <Link
              to="/"
              aria-label={branding.site_name}
              className="flex items-center gap-2"
            >
              <img src={branding.logo_dark} alt="" className="h-7 w-auto" />
            </Link>
          ) : null}
          <span className="hidden text-sm text-muted-foreground sm:block">
            <Trans message="Need help? Contact support." />
          </span>
        </header>

        <main
          className={cn(
            'mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8',
            wide ? 'max-w-7xl' : 'max-w-2xl',
          )}
        >
          {children}
        </main>

        <footer className="flex items-center justify-between px-6 py-4 text-xs text-muted-foreground lg:px-8">
          <span>
            © {new Date().getFullYear()}, {branding.site_name}.
          </span>
          <span className="hidden sm:inline">
            <Trans message="Purchases stay tied to your verified email." />
          </span>
        </footer>
      </div>
    </div>
  );
}

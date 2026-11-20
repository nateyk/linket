import {LocaleSwitcher} from '@common/locale-switcher/locale-switcher';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {getAssetUrl} from '@ui/utils/urls/get-asset-url';
import {BookOpenIcon, StoreIcon} from 'lucide-react';
import {type ReactNode} from 'react';
import {Link} from 'react-router';

interface AuthLayoutV2Props {
  children: ReactNode;
  topAction?: ReactNode;
  /** Buyer access uses the same layout without creator-facing marketing copy. */
  audience?: 'creator' | 'portal';
}

/**
 * Theme-native auth-4 layout for login, registration and purchase recovery.
 * No duplicated brand colors, fake stats or demo-only authentication actions.
 */
export function AuthLayoutV2({
  children,
  topAction,
  audience = 'creator',
}: AuthLayoutV2Props) {
  const {branding} = useSettings();
  const isDarkMode = useIsDarkMode();
  const logo = isDarkMode ? branding.logo_light : branding.logo_dark;
  const isPortal = audience === 'portal';

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-svh min-w-0 flex-col">
          <header className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 px-6 pt-8 sm:px-10 sm:pt-10">
            <Link
              to="/"
              aria-label={branding.site_name}
              className="inline-flex min-h-11 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {logo ? (
                <img
                  src={getAssetUrl(logo)}
                  alt=""
                  className="block h-9 max-w-40 object-contain object-left"
                />
              ) : (
                <span className="text-xl font-semibold tracking-tight">
                  {branding.site_name}
                </span>
              )}
            </Link>
            {topAction ? (
              <div className="text-sm text-muted-foreground">{topAction}</div>
            ) : null}
          </header>

          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-12">
            <div className="w-full max-w-sm">{children}</div>
          </div>

          <footer className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-6 pb-6 text-xs text-muted-foreground sm:px-10 sm:pb-8">
            <span>© {new Date().getFullYear()} {branding.site_name}</span>
            <LocaleSwitcher />
          </footer>
        </section>

        <aside
          aria-label={isPortal ? 'Purchase access' : 'About Linket'}
          className="relative hidden min-h-svh overflow-hidden border-l border-border bg-muted/35 text-foreground lg:flex"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:40px_40px]"
          />
          <div className="relative mx-auto flex w-full max-w-xl flex-col justify-between px-12 py-12 xl:px-16 xl:py-16">
            <div className="inline-flex items-center gap-3 text-sm font-medium">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                {isPortal ? (
                  <BookOpenIcon className="size-5" aria-hidden="true" />
                ) : (
                  <StoreIcon className="size-5" aria-hidden="true" />
                )}
              </div>
              <span>{branding.site_name}</span>
            </div>

            <div className="max-w-lg">
              <div className="mb-5 h-1 w-10 rounded-full bg-primary" aria-hidden="true" />
              <h2 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
                {isPortal ? (
                  <Trans message="Your purchases, all in one place." />
                ) : (
                  <Trans message="A simpler way to sell what you create." />
                )}
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                {isPortal ? (
                  <Trans message="Access your courses, downloads and receipts using the email you used at checkout." />
                ) : (
                  <Trans message="Create your storefront, share your links and manage your digital products in one place." />
                )}
              </p>
            </div>

            <div className="border-t border-border pt-5 text-sm text-muted-foreground">
              {isPortal ? (
                <Trans message="Your purchases are protected by email verification." />
              ) : (
                <Trans message="Your brand. Your storefront. Your business." />
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

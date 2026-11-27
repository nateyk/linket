import {LocaleSwitcher} from '@common/locale-switcher/locale-switcher';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {type ReactNode} from 'react';
import {Starfield} from './auth-starfield';

// Keep the Linket brand blue as the anchor; let cyan and teal gently
// emerge toward the far side of the hero instead of introducing rainbow hues.
const AUTH_STARFIELD_HAZE = [
  'var(--primary)',
  '#006BE4',
  '#0097CC',
  '#00B585',
] as const;

const AUTH_STARFIELD_STARS = [
  'var(--primary)',
  '#0092F6',
  '#00CBE9',
  '#00A7AA',
] as const;

interface AuthLayoutV2Props {
  children: ReactNode;
  topAction?: ReactNode;
  /** Buyer recovery uses the same layout with purchase-specific messaging. */
  audience?: 'creator' | 'portal';
}

/**
 * Theme-native auth layout shared by login, registration, and buyer recovery.
 * Brand identity comes from app colors and copy, not duplicate logos.
 */
export function AuthLayoutV2({
  children,
  topAction,
  audience = 'creator',
}: AuthLayoutV2Props) {
  const {branding} = useSettings();
  const isPortal = audience === 'portal';

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-svh min-w-0 flex-col">
          {topAction ? (
            <div className="mx-auto flex w-full max-w-lg justify-end px-6 pt-6 text-sm text-muted-foreground sm:px-10">
              {topAction}
            </div>
          ) : null}
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
            <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
          </div>
          <footer className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-6 pb-6 text-xs text-muted-foreground sm:px-10 sm:pb-8">
            <span>© {new Date().getFullYear()} {branding.site_name}</span>
            <LocaleSwitcher />
          </footer>
        </section>

        <aside
          aria-label={isPortal ? 'Purchase access' : 'About Linket'}
          className="relative hidden min-h-svh min-w-0 overflow-hidden border-l border-border bg-muted/35 text-foreground lg:flex"
        >
          <Starfield
            className="pointer-events-none absolute inset-0"
            color="var(--foreground)"
            hazeColors={AUTH_STARFIELD_HAZE}
            starColors={AUTH_STARFIELD_STARS}
            density={1.35}
            depth={0.9}
            glow={0.8}
            haze={0.42}
            intensity={1.05}
            twinkle={0.52}
            warmth={0.68}
            warp={0.25}
            quality={0.8}
            interactive
          />
          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col px-12 py-12 xl:px-16 xl:py-16">
            <div className="flex flex-1 items-center">
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

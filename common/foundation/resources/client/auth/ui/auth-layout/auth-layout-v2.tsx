import {Separator} from '@shadcn/separator';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {ReactNode} from 'react';
import {Link} from 'react-router';
import {Command, Globe} from 'lucide-react';

interface AuthLayoutV2Props {
  children: ReactNode;
  topAction?: ReactNode;
}

export function AuthLayoutV2({children, topAction}: AuthLayoutV2Props) {
  const {branding} = useSettings();
  const isDarkMode = useIsDarkMode();

  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        {/* Right branding panel - hidden on mobile, strong UI with bg-primary respecting theme */}
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <Command className="size-10" />
            <h1 className="font-medium text-2xl">{branding.site_name}</h1>
            <p className="text-sm text-primary-foreground/80">
              <Trans message="Design. Build. Launch. Repeat." />
            </p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">
                <Trans message="Ready to launch?" />
              </h2>
              <p className="text-sm text-primary-foreground/80">
                <Trans message="Clone the repo, install dependencies, and your dashboard is live in minutes." />
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto bg-primary-foreground/20" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">
                <Trans message="Need help?" />
              </h2>
              <p className="text-sm text-primary-foreground/80">
                <Trans message="Check out the docs or open an issue on GitHub, community support is just a click away." />
              </p>
            </div>
          </div>
        </div>

        {/* Left form area */}
        <div className="relative order-1 flex h-full flex-col">
          {/* Top action link - hidden to avoid duplication, bottom keeps it */}
          {topAction ? (
            <div className="absolute top-5 flex w-full justify-end px-4 lg:px-10">
              <div className="text-sm text-muted-foreground">{topAction}</div>
            </div>
          ) : null}

          {/* Centered form */}
          <div className="flex flex-1 items-center justify-center p-4 lg:p-8">
            <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center space-y-8">
              {(isDarkMode ? branding.logo_light : branding.logo_dark) && (
                <Link
                  to="/"
                  aria-label={branding.site_name}
                  className="flex w-fit shrink-0 items-center"
                >
                  <img
                    src={isDarkMode ? branding.logo_light : branding.logo_dark}
                    alt=""
                    className="block h-10 w-auto"
                  />
                </Link>
              )}
              {children}
            </div>
          </div>

          {/* Bottom footer */}
          <div className="absolute bottom-5 flex w-full justify-between px-4 lg:px-10">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()}, {branding.site_name}.
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="size-4" />
              ENG
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

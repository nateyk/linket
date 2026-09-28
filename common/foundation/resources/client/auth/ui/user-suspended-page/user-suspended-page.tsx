import {useLogout} from '@common/auth/requests/use-logout';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {KeyboardArrowLeftIcon} from '@ui/icons/material/KeyboardArrowLeft';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';

export function Component() {
  const {
    branding: {logo_light, logo_dark, site_name},
  } = useSettings();
  const isDarkMode = useIsDarkMode();
  const logoSrc = isDarkMode ? logo_light : logo_dark;
  const logout = useLogout();

  return (
    <div className="flex min-h-screen w-screen bg-muted p-6">
      <div className="mx-auto mt-10 max-w-110">
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          startIcon={<KeyboardArrowLeftIcon />}
          size="xs"
          className="mr-auto mb-13.5"
        >
          <Trans message="Logout" />
        </Button>
        <div className="mx-auto mb-11 flex w-fit items-center gap-2.5">
          {logoSrc && (
            <img src={logoSrc} alt="" className="block h-10 w-auto" />
          )}
          {/* The brand name is real text, not part of the logo image —
              DESIGN.md's page title role (600, 24px, 32px). */}
          <span className="text-2xl font-semibold tracking-tight">
            {site_name}
          </span>
        </div>
        <div className="text-center">
          <h1 className="mb-6 text-3xl">
            <Trans message="Your account is suspended" />
          </h1>
          <p className="text-base">
            <Trans
              message="You can't open :name because your account is suspended. Contact the Admin to re-activate your account."
              values={{name: site_name}}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

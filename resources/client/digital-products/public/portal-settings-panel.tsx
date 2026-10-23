import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';

export function PortalSettingsPanel({
  mode,
  name,
  email,
  registerHref,
}: {
  mode: 'auth' | 'guest';
  name?: string;
  email?: string;
  registerHref: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <Trans message="Manage your profile and how we reach you." />
      </p>
      <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-5">
        {mode === 'auth' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  <Trans message="Full name" />
                </p>
                <p className="text-sm text-muted-foreground">
                  {name?.trim() || <Trans message="Not set" />}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  <Trans message="Purchase email" />
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {email || <Trans message="Not set" />}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">
                <Trans message="Password, security, and payouts live in your full account settings." />
              </p>
              <Button render={<Link to="/account-settings" />}>
                <Trans message="Open account settings" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <Trans message="Create an account with your purchase email to manage profile settings, or switch the email used for this library." />
            </p>
            <div className="flex flex-wrap gap-2">
              <Button render={<Link to={registerHref} />}>
                <Trans message="Create account" />
              </Button>
              <Button
                variant="outline"
                render={
                  <Link to="/my-portal" state={{forceRecovery: true}} />
                }
              >
                <Trans message="Switch email" />
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

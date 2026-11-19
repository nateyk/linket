import {useAuth} from '@common/auth/use-auth';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Gem} from 'lucide-react';
import {ComponentProps} from 'react';

export function UpgradeButton({
  children,
  className,
  color = 'primary',
  variant = 'outline',
  ...props
}: Partial<ComponentProps<typeof LinkButton>>) {
  const {isSubscribed} = useAuth();
  const destination = isSubscribed
    ? '/account-settings/billing/change-plan'
    : '/pricing';
  const label = children ?? (
    isSubscribed ? <Trans message="Manage plan" /> : <Trans message="Get Pro" />
  );

  // Preserve the solid CTA in usage dialogs; animate only outline buttons.
  if (variant !== 'outline') {
    return (
      <LinkButton
        to={destination}
        variant={variant}
        color={color}
        className={className}
        {...props}
      >
        {label}
      </LinkButton>
    );
  }

  return (
    <span
      className={cn(
        'relative inline-flex max-w-full rounded-button bg-border/60 p-px',
        'focus-within:ring-2 focus-within:ring-foreground focus-within:ring-offset-2 focus-within:ring-offset-background',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-button"
      >
        <span className="absolute -inset-full animate-spin [animation-duration:4s] motion-reduce:animate-none bg-[conic-gradient(from_0deg,transparent_0deg,transparent_290deg,var(--color-primary)_335deg,transparent_360deg)]" />
      </span>
      <LinkButton
        to={destination}
        variant="outline"
        color={color}
        className="relative z-10 w-full rounded-[inherit] border-0 bg-background text-foreground shadow-none hover:bg-accent focus-visible:outline-none dark:bg-background dark:hover:bg-accent"
        {...props}
      >
        <Gem aria-hidden="true" className="size-4 text-primary" />
        {label}
      </LinkButton>
    </span>
  );
}

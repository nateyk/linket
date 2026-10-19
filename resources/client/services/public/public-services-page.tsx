import {
  resolveBiolinkThemeVariables,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {Avatar} from '@shadcn/avatar/avatar';
import {PasswordPage} from '@app/short-links/password-page';
import {Trans} from '@ui/i18n/trans';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {ArrowLeftIcon, BriefcaseBusinessIcon} from 'lucide-react';
import {useEffect, useState, type CSSProperties} from 'react';
import {ServiceCard} from './service-card';
import type {PublicServicesPageData} from './service-types';

export function PublicServicesPage({data}: {data: PublicServicesPageData}) {
  const {store, appearance, services, back_url} = data;
  const profile = store.profile_config ?? {};
  const displayName = profile.display_name || store.name;
  const avatarUrl = profile.avatar_url || store.user?.image;
  const [passwordValid, setPasswordValid] = useState(!store.password);

  useEffect(() => {
    if (!appearance?.fontConfig) return;
    loadFonts([appearance.fontConfig], {
      id: 'creator-services-fonts',
      weights: [400, 500, 600, 700],
    });
  }, [appearance?.fontConfig]);

  if (store.password && !passwordValid) {
    return (
      <PasswordPage
        linkeable={store}
        onPasswordValid={() => setPasswordValid(true)}
      />
    );
  }

  return (
    <div
      className="relative isolate min-h-screen px-4 py-5 text-[var(--biolink-text)] sm:px-6 sm:py-10"
      style={
        {
          ...resolveBiolinkThemeVariables(appearance),
          fontFamily: appearance?.fontConfig?.family,
        } as CSSProperties
      }
    >
      <div className="fixed inset-0 z-0">
        <Background appearance={appearance} />
      </div>

      <main className="relative z-1 mx-auto flex w-full max-w-5xl flex-col gap-6">
        <a
          href={back_url}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--biolink-muted-text)] underline-offset-4 hover:text-[var(--biolink-text)] hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          <Trans message="Back to profile" />
        </a>

        <header className="flex items-center gap-4">
          <Avatar.Root className="size-16 shrink-0 overflow-hidden">
            <Avatar.Image src={avatarUrl} alt={displayName} />
            <Avatar.ColorFallback>{displayName}</Avatar.ColorFallback>
          </Avatar.Root>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl leading-8 font-semibold tracking-tight">
              {displayName}
            </h1>
            {profile.profile_title && (
              <p className="truncate text-sm text-[var(--biolink-muted-text)]">
                {profile.profile_title}
              </p>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">
            <Trans message="Services" />
          </h2>
          <p className="text-sm text-[var(--biolink-muted-text)]">
            <Trans message="Pick a service and request a quote. Payment and contracts are handled directly with the creator." />
          </p>
        </div>

        {services.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-[var(--biolink-border)] px-6 py-16 text-center">
            <BriefcaseBusinessIcon className="size-8 text-[var(--biolink-muted-text)]" />
            <p className="text-sm font-medium">
              <Trans message="No services yet" />
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

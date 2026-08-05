import {
  CreatorProfileConfig,
  getCreatorProfileConfig,
} from '@app/dashboard/biolink/biolink-editor/creator-profile-types';
import {Biolink} from '@app/gen/schemas/biolink';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-list';
import {ShopWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/shop-widget/shop-widget-renderer';
import {
  resolveBiolinkButtonAppearance,
  shouldUseLightBiolinkLogo,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {LinkButton} from '@shadcn/button/button';
import {Separator} from '@shadcn/separator';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {cn} from '@ui/utils/cn';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import {
  BadgeCheckIcon,
  BriefcaseBusinessIcon,
  MailIcon,
  PlusIcon,
} from 'lucide-react';
import {Link} from 'react-router';

interface CreatorProfileLayoutProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  content: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  showAds?: boolean;
}

export function CreatorProfileLayout({
  biolink,
  appearance,
  content,
  profileConfig,
  showAds,
}: CreatorProfileLayoutProps) {
  const profile = profileConfig || getCreatorProfileConfig(biolink);
  const activeContent = content.filter(item => item.active);
  const shopWidget = activeContent
    .filter(item => item.model_type === 'biolinkWidget' && item.type === 'shop')
    .at(-1) as BiolinkWidget | undefined;

  return (
    <main className="relative z-4 min-h-screen px-4 py-5 sm:px-6 sm:py-8 @4xl:px-8 @4xl:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 @4xl:grid-cols-[360px_minmax(0,1fr)] @4xl:items-start @4xl:gap-8">
        <CreatorCard
          biolink={biolink}
          appearance={appearance}
          profile={profile}
        />

        <div className="flex min-w-0 flex-col gap-8">
          {showAds && <AdHost slot="biolink_top" />}
          {shopWidget && <ShopSection widget={shopWidget} biolink={biolink} />}
        </div>
      </div>
    </main>
  );
}

interface CreatorProfilePreviewProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profileConfig?: CreatorProfileConfig;
}

export function CreatorProfilePreview({
  biolink,
  appearance,
  profileConfig,
}: CreatorProfilePreviewProps) {
  return (
    <main className="relative z-4 px-2.5 pt-2.5 pb-4">
      <CreatorCard
        biolink={biolink}
        appearance={appearance}
        profile={profileConfig || getCreatorProfileConfig(biolink)}
        compact
      />
    </main>
  );
}

function CreatorCard({
  biolink,
  appearance,
  profile,
  compact = false,
}: {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profile: CreatorProfileConfig;
  compact?: boolean;
}) {
  const {trans} = useTrans();
  const socialLinks = Object.entries(profile.social_links).filter(
    ([, value]) => value,
  );
  const visibleSkills = profile.skills.slice(0, compact ? 4 : 8);
  const visibleSocialLinks = compact ? socialLinks.slice(0, 6) : socialLinks;
  const showFollowAction =
    !!profile.follow_url && (!compact || !profile.contact_url);
  const showContactAction = !!profile.contact_url;
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  return (
    <aside
      className={cn(
        'overflow-hidden rounded-card bg-[var(--biolink-surface)] text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)] backdrop-blur-md',
        compact
          ? 'bg-[var(--biolink-surface-strong)] backdrop-blur-xl'
          : 'shadow-sm',
        !compact && '@4xl:sticky @4xl:top-8',
      )}
    >
      <div
        className={cn(
          'relative h-28 bg-[var(--biolink-surface-muted)]',
          !compact && 'sm:h-30',
        )}
      >
        {profile.cover_url && (
          <img
            className="size-full object-cover"
            src={profile.cover_url}
            alt=""
          />
        )}
        {profile.available_for_work && (
          <Badge
            variant="secondary"
            className={cn(
              'absolute right-4 bottom-4 border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] shadow-sm backdrop-blur-sm',
              buttonAppearance.radius,
            )}
          >
            <BriefcaseBusinessIcon />
            <Trans message="Available for work" />
          </Badge>
        )}
      </div>

      <div className={cn('px-4 pb-4', !compact && 'sm:px-5 sm:pb-5')}>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3">
          <Avatar.Root className="-mt-10 aspect-square size-20 overflow-hidden rounded-card-sm bg-[var(--biolink-surface-strong)] p-1 ring-1 ring-[var(--biolink-border)] after:hidden">
            <Avatar.Image
              className="rounded-card-xs"
              src={profile.avatar_url}
              alt={profile.display_name}
            />
            <Avatar.ColorFallback className="rounded-card-xs">
              {profile.display_name}
            </Avatar.ColorFallback>
          </Avatar.Root>

          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="min-w-0 truncate text-lg leading-tight font-semibold sm:text-xl">
                {profile.display_name}
              </h1>
              {biolink.is_verified && (
                <>
                  <BadgeCheckIcon
                    className="size-5 shrink-0 fill-current text-[var(--biolink-text)]"
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    <Trans message="Verified creator" />
                  </span>
                </>
              )}
            </div>
            {(profile.profile_title || profile.headline) && (
              <p className="mt-0.5 truncate text-sm text-[var(--biolink-muted-text)]">
                {profile.profile_title || profile.headline}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn('mt-4 flex flex-col gap-4', compact && 'mt-3 gap-3')}
        >
          {(showFollowAction || showContactAction) && (
            <div
              className={cn('grid grid-cols-2 gap-2', compact && 'grid-cols-1')}
            >
              {showFollowAction && (
                <LinkButton
                  to={profile.follow_url}
                  target="_blank"
                  rel="noreferrer"
                  variant="ghost"
                  className={cn(
                    buttonAppearance.className,
                    !profile.contact_url && 'col-span-2',
                  )}
                  style={buttonAppearance.style}
                >
                  <PlusIcon data-icon="inline-start" />
                  <Trans message="Follow" />
                </LinkButton>
              )}
              {showContactAction && (
                <LinkButton
                  to={normalizeContactUrl(profile.contact_url)}
                  target="_blank"
                  rel="noreferrer"
                  variant="ghost"
                  className={cn(
                    buttonAppearance.className,
                    !profile.follow_url && 'col-span-2',
                  )}
                  style={buttonAppearance.style}
                >
                  <MailIcon data-icon="inline-start" />
                  <Trans message="Message" />
                </LinkButton>
              )}
            </div>
          )}

          {profile.bio && (
            <p
              className={cn(
                'text-sm leading-relaxed break-words text-[var(--biolink-muted-text)]',
                compact && 'line-clamp-2',
              )}
            >
              {profile.bio}
            </p>
          )}

          {visibleSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleSkills.map(skill => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={cn(
                    'max-w-full border-[var(--biolink-border)] bg-[var(--biolink-surface-muted)] break-all whitespace-normal text-[var(--biolink-text)]',
                    buttonAppearance.radius,
                  )}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          {visibleSocialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleSocialLinks.map(([type, value]) => {
                const social = SocialsList[type as SocialsType];
                if (!social || !value) return null;
                return (
                  <LinkButton
                    key={type}
                    to={buildSocialUrl(type as SocialsType, value)}
                    target="_blank"
                    rel="noreferrer"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={trans(social.name)}
                    className={buttonAppearance.className}
                    style={buttonAppearance.style}
                  >
                    {social.icon}
                  </LinkButton>
                );
              })}
            </div>
          )}

          <Separator className="bg-[var(--biolink-border)]" />

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xl font-semibold tabular-nums">
                {biolink.public_item_count ?? 0}
              </div>
              <div className="text-xs text-[var(--biolink-muted-text)]">
                <Trans message="Items" />
              </div>
            </div>
            <CreatorBranding appearance={appearance} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function ShopSection({
  widget,
  biolink,
}: {
  widget: BiolinkWidget;
  biolink: Biolink;
}) {
  return (
    <ShopWidgetRenderer
      widget={widget}
      variant="biolinkPage"
      biolink={biolink}
      titleOverride={<Trans message="Work" />}
    />
  );
}

function CreatorBranding({
  appearance,
}: {
  appearance: BiolinkAppearanceConfig | null;
}) {
  const {branding, biolink} = useSettings();
  const {trans} = useTrans();
  const isDarkMode = useIsDarkMode();
  const useLightLogo = shouldUseLightBiolinkLogo(appearance, isDarkMode);
  const src =
    biolink?.branding_img ||
    (useLightLogo ? branding.logo_light : branding.logo_dark);

  if (!src || appearance?.hideBranding) return null;

  return (
    <Link to="/" aria-label={branding.site_name}>
      <img
        className="h-5 w-auto"
        src={src}
        alt={trans(message(':site logo', {values: {site: branding.site_name}}))}
      />
    </Link>
  );
}

function buildSocialUrl(type: SocialsType, value: string): string {
  if (!value || isAbsoluteUrl(value)) return value;
  if (type === SocialsType.Twitter) {
    return `https://x.com/${value.replace('@', '')}`;
  }
  if (type === SocialsType.Instagram) {
    return `https://instagram.com/${value.replace('@', '')}`;
  }
  if (type === SocialsType.Tiktok) {
    return `https://tiktok.com/${value.startsWith('@') ? value : `@${value}`}`;
  }
  if (type === SocialsType.Mail) return `mailto:${value}`;
  if (type === SocialsType.Whatsapp) {
    return `https://api.whatsapp.com/send?phone=${value}`;
  }
  return value;
}

function normalizeContactUrl(value: string): string {
  if (value.includes('@') && !value.includes(':')) {
    return `mailto:${value}`;
  }
  return value;
}

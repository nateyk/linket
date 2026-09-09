import {
  CreatorProfileConfig,
  getCreatorProfileConfig,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {Biolink} from '@app/gen/schemas/biolink';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/stores/store-editor/content/widgets/socials-widget/socials-list';
import {ShopWidgetRenderer} from '@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer';
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
import {Tabs} from '@shadcn/tabs/tabs';
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
  InfoIcon,
  MailIcon,
  PackageIcon,
  UserIcon,
} from 'lucide-react';
import {Link} from 'react-router';
import {useState} from 'react';
import {BottomNavBar} from '@shadcn/bottom-nav-bar';

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
    <main className="relative z-4 min-h-screen px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 @4xl:px-8 @4xl:py-10">
      <div className="mx-auto w-full max-w-7xl @4xl:hidden">
        <MobileCreatorProfile
          biolink={biolink}
          appearance={appearance}
          profile={profile}
          shopWidget={shopWidget}
          showAds={showAds}
        />
      </div>

      <div className="mx-auto hidden w-full max-w-7xl gap-6 @4xl:grid @4xl:grid-cols-[360px_minmax(0,1fr)] @4xl:items-start @4xl:gap-8">
        <CreatorCard
          biolink={biolink}
          appearance={appearance}
          profile={profile}
        />

        <div className="flex min-w-0 flex-col gap-6">
          {showAds && <AdHost slot="biolink_top" />}
          <CreatorProfileContent
            profile={profile}
            shopWidget={shopWidget}
            biolink={biolink}
            appearance={appearance}
          />
        </div>
      </div>
    </main>
  );
}

interface CreatorProfilePreviewProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profileConfig?: CreatorProfileConfig;
  content: NonNullable<Biolink['content']>;
}

export function CreatorProfilePreview({
  biolink,
  appearance,
  profileConfig,
  content,
}: CreatorProfilePreviewProps) {
  const profile = profileConfig || getCreatorProfileConfig(biolink);
  const shopWidget = content
    .filter(
      item =>
        item.active &&
        item.model_type === 'biolinkWidget' &&
        item.type === 'shop',
    )
    .at(-1) as BiolinkWidget | undefined;

  return (
    <main className="relative z-4 flex min-h-full flex-col px-2 pt-2 pb-2">
      <MobileCreatorProfile
        biolink={biolink}
        appearance={appearance}
        profile={profile}
        shopWidget={shopWidget}
        compact
      />
    </main>
  );
}

function MobileCreatorProfile({
  biolink,
  appearance,
  profile,
  shopWidget,
  compact = false,
  showAds = false,
}: {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profile: CreatorProfileConfig;
  shopWidget?: BiolinkWidget;
  compact?: boolean;
  showAds?: boolean;
}) {
  const configuredProductIds = Array.isArray(shopWidget?.config?.product_ids)
    ? shopWidget.config.product_ids
    : [];
  const hasProducts =
    !!shopWidget &&
    (typeof biolink.public_item_count === 'number'
      ? biolink.public_item_count > 0
      : configuredProductIds.length > 0);
  const hasAbout = hasVisibleAbout(profile.about_html);
  const showNavigation = hasProducts || hasAbout;
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const navigationAppearanceStyle = {
    ...buttonAppearance.style,
    boxShadow: undefined,
  };

  const [activeTab, setActiveTab] = useState("profile");
  const biolinkNavItems = [
    {label: "Profile", icon: UserIcon, value: "profile"},
    ...(hasProducts ? [{label: "Products", icon: PackageIcon, value: "products"}] : []),
    ...(hasAbout ? [{label: "About", icon: InfoIcon, value: "about"}] : []),
  ];
  const activeIndex = biolinkNavItems.findIndex(item => item.value === activeTab);

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className={cn(
        'relative min-w-0 gap-0',
        compact && 'flex min-h-full flex-col justify-start',
      )}
    >
      <Tabs.Panel
        value="profile"
        className={cn('min-w-0', compact ? 'pb-0' : 'pb-20')}
      >
        <CreatorCard
          biolink={biolink}
          appearance={appearance}
          profile={profile}
          compact={compact}
        />
        {showAds && (
          <div className="mt-4">
            <AdHost slot="biolink_top" />
          </div>
        )}
      </Tabs.Panel>

      {hasProducts && (
        <Tabs.Panel
          value="products"
          className={cn('min-w-0', compact ? 'pb-0' : 'pb-20')}
        >
          <ShopSection widget={shopWidget} biolink={biolink} />
        </Tabs.Panel>
      )}

      {hasAbout && (
        <Tabs.Panel
          value="about"
          className={cn('min-w-0', compact ? 'pb-0' : 'pb-20')}
        >
          <AboutSection
            profile={profile}
            appearance={appearance}
            compact={compact}
          />
        </Tabs.Panel>
      )}

      {showNavigation && (
        <div
          className={cn(
            'pointer-events-none z-10 flex justify-center',
            compact
              ? 'relative mt-3 px-3 pb-1'
              : 'fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] px-4 @4xl:hidden',
          )}
        >
          <div className="mx-auto w-fit max-w-[calc(100vw-2rem)]">
            <BottomNavBar
              items={biolinkNavItems.map(item => ({label: item.label, icon: item.icon}))}
              activeIndex={activeIndex >= 0 ? activeIndex : 0}
              onIndexChange={(idx: number) => {
                const item = biolinkNavItems[idx];
                if (item) setActiveTab(item.value);
              }}
              className={cn(
                'pointer-events-auto border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] shadow-md shadow-black/10 backdrop-blur-xl',
                buttonAppearance.radius,
              )}
              style={navigationAppearanceStyle}
            />
          </div>
        </div>
      )}
    </Tabs.Root>
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
  const showContactAction = !!profile.contact_url;
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  return (
    <aside
      className={cn(
        'overflow-hidden rounded-card bg-[var(--biolink-surface)] text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)] backdrop-blur-md',
        compact
          ? 'bg-[var(--biolink-surface-strong)] shadow-sm backdrop-blur-xl'
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

      <div
        className={cn(
          'px-4 pb-4',
          compact && 'flex flex-col',
          !compact && 'sm:px-5 sm:pb-5',
        )}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3">
          <Avatar.Root className="-mt-10 aspect-square size-20 overflow-hidden rounded-card-sm bg-[var(--biolink-surface-strong)] shadow-sm ring-1 ring-[var(--biolink-surface-strong)] after:hidden">
            <Avatar.Image
              className="size-full rounded-card-sm object-cover"
              src={profile.avatar_url}
              alt={profile.display_name}
            />
            <Avatar.ColorFallback className="rounded-card-sm">
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
          className={cn(
            'mt-4 flex flex-col gap-4',
            compact && 'mt-3 gap-3',
          )}
        >
          {showContactAction && (
            <div className="flex justify-start">
              <LinkButton
                to={normalizeContactUrl(profile.contact_url)}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className={cn(
                  buttonAppearance.className,
                  'w-[52%] min-w-40 max-w-56',
                )}
                style={buttonAppearance.style}
              >
                <MailIcon data-icon="inline-start" />
                <Trans message="Message" />
              </LinkButton>
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
                    'max-w-full border-[var(--biolink-border)] bg-[var(--biolink-surface-muted)] break-words whitespace-normal text-[var(--biolink-text)]',
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

          <div className="flex justify-center pt-1">
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
  showHeading = true,
}: {
  widget: BiolinkWidget;
  biolink: Biolink;
  showHeading?: boolean;
}) {
  return (
    <ShopWidgetRenderer
      widget={widget}
      variant="biolinkPage"
      biolink={biolink}
      titleOverride={<Trans message="Products" />}
      showHeading={showHeading}
    />
  );
}

function CreatorProfileContent({
  profile,
  shopWidget,
  biolink,
  appearance,
  compact = false,
}: {
  profile: CreatorProfileConfig;
  shopWidget?: BiolinkWidget;
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  compact?: boolean;
}) {
  const configuredProductIds = Array.isArray(shopWidget?.config?.product_ids)
    ? shopWidget.config.product_ids
    : [];
  const hasProducts =
    !!shopWidget &&
    (typeof biolink.public_item_count === 'number'
      ? biolink.public_item_count > 0
      : configuredProductIds.length > 0);
  const hasAbout = hasVisibleAbout(profile.about_html);

  if (!hasProducts && !hasAbout) return null;

  if (hasProducts && hasAbout) {
    return (
      <Tabs.Root defaultValue="products" className="min-w-0 gap-4">
        <div className="border-b border-[var(--biolink-border)]">
          <Tabs.List
            variant="line"
            aria-label="Creator profile sections"
            className="w-fit gap-1 bg-transparent p-1 text-[var(--biolink-muted-text)] [&>span:last-child]:bg-[var(--biolink-text)]"
          >
            <Tabs.Tab
              value="products"
              className="h-[calc(100%-1px)] flex-none rounded-full px-3 py-1 text-[var(--biolink-muted-text)] data-active:text-[var(--biolink-text)]"
            >
              <Trans message="Products" />
            </Tabs.Tab>
            <Tabs.Tab
              value="about"
              className="h-[calc(100%-1px)] flex-none rounded-full px-3 py-1 text-[var(--biolink-muted-text)] data-active:text-[var(--biolink-text)]"
            >
              <Trans message="About" />
            </Tabs.Tab>
          </Tabs.List>
        </div>
        <Tabs.Panel value="products">
          <ShopSection
            widget={shopWidget}
            biolink={biolink}
            showHeading={false}
          />
        </Tabs.Panel>
        <Tabs.Panel value="about">
          <AboutSection
            profile={profile}
            appearance={appearance}
            compact={compact}
          />
        </Tabs.Panel>
      </Tabs.Root>
    );
  }

  if (shopWidget) {
    return <ShopSection widget={shopWidget} biolink={biolink} />;
  }

  return (
    <AboutSection profile={profile} appearance={appearance} compact={compact} />
  );
}

function AboutSection({
  profile,
  appearance,
  compact = false,
}: {
  profile: CreatorProfileConfig;
  appearance: BiolinkAppearanceConfig | null;
  compact?: boolean;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  return (
    <section
      className={cn(
        'bg-[var(--biolink-surface)] text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)] backdrop-blur-md',
        buttonAppearance.radius,
        compact ? 'p-3.5' : 'p-5 sm:p-6',
      )}
    >
      <div className={cn('mb-4', compact && 'mb-3')}>
        <h2 className={cn('font-semibold', compact ? 'text-lg' : 'text-xl')}>
          <Trans message="About" />
        </h2>
        {profile.profile_title && (
          <p className="mt-1 text-sm font-medium text-[var(--biolink-text)]">
            {profile.profile_title}
          </p>
        )}
      </div>
      <div
        className={cn(
          'space-y-3 text-sm leading-7 break-words text-[var(--biolink-muted-text)] [&_a]:font-medium [&_a]:text-[var(--biolink-text)] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--biolink-border)] [&_blockquote]:pl-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--biolink-text)] [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--biolink-text)] [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc',
          compact &&
            'line-clamp-6 text-xs leading-5 [&_h2]:text-base [&_h3]:text-sm',
        )}
        dangerouslySetInnerHTML={{__html: profile.about_html}}
      />
    </section>
  );
}

function hasVisibleAbout(aboutHtml: string): boolean {
  return (
    aboutHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
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
    <Link
      to="/"
      aria-label={branding.site_name}
      className="inline-flex items-center justify-center opacity-70 transition-opacity duration-150 hover:opacity-100"
    >
      <img
        className="h-4.5 w-auto"
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

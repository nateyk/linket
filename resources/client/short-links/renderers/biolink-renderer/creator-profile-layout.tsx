import {
  CreatorProfileConfig,
  getCreatorProfileConfig,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {formatSkillLabel} from '@app/dashboard/stores/store-editor/skills-chips-field';
import {StorePreviewSection} from '@app/dashboard/stores/store-editor/store-preview-protocol';
import {Biolink} from '@app/gen/schemas/biolink';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/stores/store-editor/content/widgets/socials-widget/socials-list';
import {ShopWidgetRenderer} from '@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer';
import {ServicesSection} from '@app/services/public/services-section';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
  resolveBiolinkContainerRadius,
  shouldUseLightBiolinkLogo,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {LinkButton} from '@shadcn/button/button';
import BottomNavBar from '@shadcn/bottom-nav-bar';
import {Card} from '@shadcn/card/card';
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
  UserIcon,
  PackageIcon,
  InfoIcon,
} from 'lucide-react';
import {renderAboutHtml} from './about-markdown';
import {StoreFront} from './store-front';
import {Link} from 'react-router';
import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';

interface CreatorProfileLayoutProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  content: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  showAds?: boolean;
  /** Section the editor's current tab maps to; only set in preview mode. */
  previewSection?: StorePreviewSection;
}

export function CreatorProfileLayout({
  biolink,
  appearance,
  content,
  profileConfig,
  showAds,
  previewSection,
}: CreatorProfileLayoutProps) {
  const profile = profileConfig || getCreatorProfileConfig(biolink);
  const activeContent = content.filter(item => item.active);
  const shopWidget = activeContent
    .filter(item => item.model_type === 'biolinkWidget' && item.type === 'shop')
    .at(-1) as BiolinkWidget | undefined;

  return (
    <main className="relative z-4 min-h-screen px-4 pt-[max(1.25rem,var(--safe-top,env(safe-area-inset-top,0px)))] pb-[calc(6rem_+_var(--safe-bottom,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-8 @4xl:px-8 @4xl:py-10">
      <div className="mx-auto w-full max-w-7xl @4xl:hidden">
        <MobileCreatorProfile
          biolink={biolink}
          appearance={appearance}
          profile={profile}
          shopWidget={shopWidget}
          showAds={showAds}
          previewSection={previewSection}
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

/**
 * A storefront section can be addressed directly, so a link can return a
 * visitor to the section they were browsing instead of the default tab.
 * Read-only on purpose: nothing writes the query string, so dashboard editor
 * previews (which render this layout too) are never touched.
 */
function requestedSection(): string | null {
  if (typeof window === 'undefined') return null;

  const value = new URLSearchParams(window.location.search).get('section');

  return value && ['profile', 'products', 'services', 'about'].includes(value)
    ? value
    : null;
}

function MobileCreatorProfile({
  biolink,
  appearance,
  profile,
  shopWidget,
  showAds = false,
  previewSection,
}: {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profile: CreatorProfileConfig;
  shopWidget?: BiolinkWidget;
  showAds?: boolean;
  previewSection?: StorePreviewSection;
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
  const hasServices = serviceCount(biolink) > 0;
  const showNavigation = hasProducts || hasServices || hasAbout;
  // Bio page IS the store: open on Products when the shop has items, matching
  // desktop StoreFront defaultTab="products". Profile-only pages stay on Profile.
  const [activeTab, setActiveTab] = useState(() => {
    const requested = requestedSection();

    if (requested === 'services' && hasServices) return 'services';
    if (requested === 'products' && hasProducts) return 'products';
    if (requested === 'about' && hasAbout) return 'about';
    if (requested === 'profile') return 'profile';

    return hasProducts ? 'products' : hasServices ? 'services' : 'profile';
  });
  const {trans} = useTrans();
  const biolinkNavItems = [
    {label: trans(message('Profile')), icon: UserIcon, value: 'profile'},
    ...(hasProducts
      ? [{label: trans(message('Products')), icon: PackageIcon, value: 'products'}]
      : []),
    ...(hasServices
      ? [
          {
            label: trans(message('Services')),
            icon: BriefcaseBusinessIcon,
            value: 'services',
          },
        ]
      : []),
    ...(hasAbout
      ? [{label: trans(message('About')), icon: InfoIcon, value: 'about'}]
      : []),
  ];
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  // Nav buttons and the editor's tab sync share this exact path: switch
  // section, jump back to the top (instant — no smooth animation, so
  // prefers-reduced-motion is honored by construction).
  const selectSection = useCallback((value: string) => {
    setActiveTab(value);
    window.scrollTo({top: 0});
  }, []);

  // The editor posts its mapped section on tab changes only (A-06): the
  // preview follows when the editor moves, and never fights a section the
  // visitor tapped by hand — that only changes when this prop changes.
  // Missing sections fall back to Products when the shop exists, else Profile.
  const navItemsRef = useRef(biolinkNavItems);
  navItemsRef.current = biolinkNavItems;
  useEffect(() => {
    if (previewSection === undefined) return;
    const items = navItemsRef.current;
    const target = items.some(item => item.value === previewSection)
      ? previewSection
      : items.some(item => item.value === 'products')
        ? 'products'
        : items.some(item => item.value === 'services')
          ? 'services'
          : 'profile';
    selectSection(target);
  }, [previewSection, selectSection]);

  // Mobile is navigation, not tabs: the bottom bar is a real nav (buttons
  // with aria-pressed) switching plain sections — never a tablist without
  // tabs, which announced toggles as tabpanels with no associated tab.
  // Each section carries its own translated label for AT.
  const sectionLabel =
    activeTab === 'products'
      ? trans(message('Products'))
      : activeTab === 'services'
        ? trans(message('Services'))
        : activeTab === 'about'
          ? trans(message('About'))
          : trans(message('Profile'));

  return (
    <div className="relative min-w-0 gap-0">
      {activeTab === 'profile' && (
        <section
          aria-label={trans(message('Profile'))}
          className="min-w-0 pb-20 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <CreatorCard biolink={biolink} appearance={appearance} profile={profile} />
          {showAds && (
            <div className="mt-4">
              <AdHost slot="biolink_top" />
            </div>
          )}
          {/* Profile is identity only on mobile. Products/About switch via
              bottom nav so content is not duplicated under a second control. */}
        </section>
      )}

      {hasProducts && activeTab === 'products' && (
        <section
          aria-label={trans(message('Products'))}
          className="min-w-0 pb-20 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ShopSection
            widget={shopWidget}
            biolink={biolink}
            appearance={appearance}
          />
        </section>
      )}

      {hasServices && activeTab === 'services' && (
        <section
          aria-label={trans(message('Services'))}
          className="min-w-0 pb-20 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ServicesSection biolink={biolink} appearance={appearance} />
        </section>
      )}

      {hasAbout && activeTab === 'about' && (
        <section
          aria-label={trans(message('About'))}
          className="min-w-0 pb-20 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <AboutSection profile={profile} appearance={appearance} />
        </section>
      )}
      <span className="sr-only" role="status">
        {sectionLabel}
      </span>

      {showNavigation && (
        <div className="flex justify-center py-6 @4xl:hidden">
          <BottomNavBar
            items={biolinkNavItems.map(item => ({label: item.label, icon: item.icon}))}
            activeIndex={biolinkNavItems.findIndex(item => item.value === activeTab)}
            onIndexChange={(idx: number) => {
              const item = biolinkNavItems[idx];
              if (item) {
                selectSection(item.value);
              }
            }}
            radius="rounded-button"
            // Shell + idle items use --biolink-* so the bar stays in the buyer
            // world (dashboard bg-card/muted leaked a dark pill on light pages).
            className={cn(
              biolinkSurfaceEdgeClassName,
              'bg-[var(--biolink-surface)]/95 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--biolink-surface)]/80',
            )}
            inactiveButtonClassName="text-[var(--biolink-muted-text)] hover:bg-[var(--biolink-surface-muted)] hover:text-[var(--biolink-text)]"
            activeButtonClassName={buttonAppearance.className}
            activeButtonStyle={buttonAppearance.style}
            stickyBottom
          />
        </div>
      )}
    </div>
  );
}

function CreatorCard({
  biolink,
  appearance,
  profile,
}: {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  profile: CreatorProfileConfig;
}) {
  const {trans} = useTrans();
  const socialLinks = Object.entries(profile.social_links).filter(
    ([, value]) => value,
  );
  const visibleSkills = profile.skills.slice(0, 8);
  const visibleSocialLinks = socialLinks;
  const showContactAction = !!profile.contact_url;
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  // Appearance → Buttons → Shadow soft-pops the profile shell the same way
  // it lifts Message / social / View actions. Empty string = flat (None).
  const buttonShadow = buttonAppearance.style.boxShadow;
  const containerRadius = resolveBiolinkContainerRadius(appearance);

  return (
    <Card.Root
      className={cn(
        'gap-0 py-0 bg-[var(--biolink-surface)] text-[var(--biolink-text)] backdrop-blur-md',
        biolinkSurfaceEdgeClassName,
        '@4xl:sticky @4xl:top-8',
        containerRadius.className,
      )}
      style={{boxShadow: buttonShadow}}
    >
      <div className="relative aspect-[3/1] w-full shrink-0 bg-[var(--biolink-surface-muted)] bg-linear-to-br from-[var(--biolink-surface-muted)] to-[var(--biolink-surface-strong)]">
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
              'absolute end-4 bottom-4 border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] backdrop-blur-sm',
            )}
            style={{boxShadow: buttonShadow}}
          >
            <BriefcaseBusinessIcon />
            <Trans message="Available for work" />
          </Badge>
        )}
      </div>

      <Card.Content className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 sm:gap-4">
          {/* Edge-to-edge photo: no p-1 surface pad (that read as a heavy white
              frame). Lift with a surface ring + thin biolink border so radius
              follows appearance without nesting a second radius calc. */}
          <Avatar.Root
            className={cn(
              '-mt-10 aspect-square size-22 overflow-hidden bg-[var(--biolink-surface-muted)] ring-2 ring-[var(--biolink-surface)] after:rounded-[inherit] after:border-[var(--biolink-border)]',
              containerRadius.avatarClassName,
            )}
          >
            <Avatar.Image
              className={cn(
                'size-full object-cover',
                containerRadius.avatarClassName,
              )}
              src={profile.avatar_url}
              alt={profile.display_name}
            />
            <Avatar.ColorFallback className={containerRadius.avatarClassName}>
              {profile.display_name}
            </Avatar.ColorFallback>
          </Avatar.Root>

          {/* Name + title baseline with the avatar foot; wrap instead of
              truncating mid-word so titles like "Architect" stay readable. */}
          <div className="flex min-w-0 flex-col justify-end gap-1 pb-0.5">
            <div className="flex min-w-0 items-start gap-1.5">
              <h1 className="min-w-0 text-xl leading-snug font-semibold tracking-tight text-pretty text-[var(--biolink-text)] sm:text-2xl">
                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                  {profile.display_name}
                </span>
              </h1>
              {biolink.is_verified && (
                <>
                  <BadgeCheckIcon
                    className="mt-0.5 size-5 shrink-0 fill-current text-[var(--biolink-text)]"
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    <Trans message="Verified creator" />
                  </span>
                </>
              )}
            </div>
            {(profile.profile_title || profile.headline) && (
              <p className="line-clamp-2 text-sm leading-snug text-pretty text-[var(--biolink-muted-text)]">
                {profile.profile_title || profile.headline}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {showContactAction && (
            <div className="flex justify-start">
              <LinkButton
                to={normalizeContactUrl(profile.contact_url)}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                className={cn(
                  buttonAppearance.className,
                  'w-full min-h-11 @4xl:w-auto @4xl:min-w-40 @4xl:max-w-56',
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
              className="text-base leading-relaxed break-words text-[var(--biolink-muted-text)]"
            >
              {profile.bio}
            </p>
          )}

          {visibleSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleSkills.map(skill => {
                const label = formatSkillLabel(skill);
                if (!label) return null;
                return (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className={cn(
                      // Tinted fill + thin ring so chips read on the white
                      // card face (surface-muted alone washed out to white).
                      // Radius follows Appearance → Corner roundness.
                      'h-auto max-w-full min-w-0 rounded-button border-transparent bg-[color-mix(in_srgb,var(--biolink-text)_8%,var(--biolink-surface))]! px-2.5 py-1 text-xs font-medium leading-snug break-words whitespace-normal text-[var(--biolink-text)]! ring-1 ring-(color:--biolink-border)',
                    )}
                  >
                    {label}
                  </Badge>
                );
              })}
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
                    aria-label={trans(social.name) || type}
                    className={cn(
                      buttonAppearance.className,
                      'pointer-coarse:min-h-11 pointer-coarse:min-w-11',
                    )}
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
      </Card.Content>
    </Card.Root>
  );
}

function ShopSection({
  widget,
  biolink,
  appearance,
  showHeading = true,
}: {
  widget: BiolinkWidget;
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  showHeading?: boolean;
}) {
  return (
    <ShopWidgetRenderer
      widget={widget}
      variant="biolinkPage"
      biolink={biolink}
      appearance={appearance}
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
}: {
  profile: CreatorProfileConfig;
  shopWidget?: BiolinkWidget;
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
}) {
  const configuredProductIds = Array.isArray(shopWidget?.config?.product_ids)
    ? shopWidget.config.product_ids
    : [];
  const hasProducts =
    !!shopWidget &&
    (typeof biolink.public_item_count === 'number'
      ? biolink.public_item_count > 0
      : configuredProductIds.length > 0);
  const hasServices = serviceCount(biolink) > 0;
  const hasAbout = hasVisibleAbout(profile.about_html);

  if (!hasProducts && !hasServices && !hasAbout) return null;

  const sections: {id: string; label: ReactNode; content: ReactNode}[] = [];

  if (hasProducts && shopWidget) {
    sections.push({
      id: 'products',
      label: <Trans message="Products" />,
      content: (
        <ShopSection
          widget={shopWidget}
          biolink={biolink}
          appearance={appearance}
          showHeading={false}
        />
      ),
    });
  }

  if (hasServices) {
    sections.push({
      id: 'services',
      label: <Trans message="Services" />,
      content: (
        <ServicesSection
          biolink={biolink}
          appearance={appearance}
          showHeading={false}
        />
      ),
    });
  }

  if (hasAbout) {
    sections.push({
      id: 'about',
      label: <Trans message="About" />,
      content: (
        <AboutSection
          profile={profile}
          appearance={appearance}
          showHeading={false}
        />
      ),
    });
  }

  if (sections.length > 1) {
    const requested = requestedSection();
    const defaultTab = sections.some(section => section.id === requested)
      ? requested!
      : sections[0].id;

    return (
      // The strip, panels and card frame live in StoreFront: the strip
      // sticks to the top of the viewport (opaque, repainting the page
      // background), the card scrolls behind it and hides exactly at the
      // tab line, and the page keeps the one scrollbar (StoreFront resets
      // scroll to top on tab switches).
      <StoreFront
        appearance={appearance}
        defaultTab={defaultTab}
        tabs={sections}
      />
    );
  }

  if (hasProducts && shopWidget) {
    return (
      <ShopSection
        widget={shopWidget}
        biolink={biolink}
        appearance={appearance}
      />
    );
  }

  if (hasServices) {
    return <ServicesSection biolink={biolink} appearance={appearance} />;
  }

  return <AboutSection profile={profile} appearance={appearance} />;
}

function AboutSection({
  profile,
  appearance,
  showHeading = true,
}: {
  profile: CreatorProfileConfig;
  appearance: BiolinkAppearanceConfig | null;
  /** False inside the tab panel: the active tab already names the section. */
  showHeading?: boolean;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const buttonShadow = buttonAppearance.style.boxShadow;
  const containerRadius = resolveBiolinkContainerRadius(appearance);

  return (
    <Card.Root
      className={cn(
        'min-w-0 gap-0 bg-[var(--biolink-surface)] text-[var(--biolink-text)] backdrop-blur-md',
        biolinkSurfaceEdgeClassName,
        containerRadius.className,
        'p-5 pb-6',
      )}
      style={{boxShadow: buttonShadow}}
    >
      {(showHeading || profile.profile_title) && (
        <div className="mb-4">
          {showHeading && (
            <h2 className="font-semibold text-xl">
              <Trans message="About" />
            </h2>
          )}
          {profile.profile_title && (
            <p
              className={cn(
                'text-sm font-medium text-[var(--biolink-text)]',
                showHeading && 'mt-1',
              )}
            >
              {profile.profile_title}
            </p>
          )}
        </div>
      )}
      <div
        // Spacing and type scale live in store-front.css (.about-prose);
        // colors and decoration stay token utilities here.
        className="about-prose text-start break-words text-[var(--biolink-muted-text)] [&_a]:font-medium [&_a]:text-[var(--biolink-text)] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-s-2 [&_blockquote]:border-[var(--biolink-border)] [&_blockquote]:ps-4 [&_h2]:font-semibold [&_h2]:text-balance [&_h2]:text-[var(--biolink-text)] [&_h3]:font-semibold [&_h3]:text-balance [&_h3]:text-[var(--biolink-text)] [&_h4]:font-semibold [&_h4]:text-[var(--biolink-text)] [&_hr]:border-[var(--biolink-border)] [&_li::marker]:text-[var(--biolink-muted-text)] [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-[var(--biolink-text)] [&_ul]:list-disc"
        dangerouslySetInnerHTML={{
          __html: renderAboutHtml(profile.about_html),
        }}
      />
    </Card.Root>
  );
}

/**
 * The public storefront resource exposes this count, but the generated
 * Biolink schema is refreshed separately from backend-only fields.
 */
function serviceCount(biolink: Biolink): number {
  return (
    (biolink as Biolink & {public_service_count?: number})
      .public_service_count ?? 0
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
  // Small cut files: this lockup renders at h-4.5 (18px, <=24px rule).
  const src =
    biolink?.branding_img ||
    (useLightLogo
      ? branding.logo_light_mobile || branding.logo_light
      : branding.logo_dark_mobile || branding.logo_dark);

  if (!src || appearance?.hideBranding) return null;

  return (
    <Link
      to="/"
      aria-label={branding.site_name}
      className="inline-flex items-center justify-center gap-1.5"
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

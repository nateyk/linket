import {WidgetRenderers} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderers';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {BiolinkAppearanceConfigBtnConfigShadow} from '@app/gen/schemas/biolink-appearance-config-btn-config-shadow';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
import {
  getImageBackgroundEffectStyle,
  ImageBackgroundEffectOverlay,
} from '@common/background-selector/image-background-effect';
import {NoiseFilter} from '@common/background-selector/images/noise-filter';
import {
  cssPropsFromBgConfig,
  getBgTintStyle,
} from '@common/background-selector/utils/css-props-from-bg-config';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {Avatar} from '@shadcn/avatar/avatar';
import {cn} from '@ui/utils/cn';
import Color from 'colorjs.io';
import {ReactElement, useEffect, useMemo} from 'react';
import {Link} from 'react-router';
import {UserIcon} from 'lucide-react';

interface BiolinkLayoutProps {
  biolink: Biolink;
  appearance?: BiolinkAppearanceConfig | null;
  content?: Biolink['content'];
  className?: string;
  enableLinkAnimations?: boolean;
  showAds?: boolean;
}
export function BiolinkLayout({
  biolink,
  className,
  appearance,
  content,
  enableLinkAnimations,
  showAds,
}: BiolinkLayoutProps) {
  if (!appearance) {
    appearance = biolink.appearance?.config ?? null;
  }
  if (!content) {
    content = biolink.content || [];
  }

  useEffect(() => {
    const id = 'biolink-fonts';
    if (appearance?.fontConfig) {
      loadFonts([appearance?.fontConfig], {id});
    }
  }, [appearance?.fontConfig]);

  useEffect(() => {
    const hasAnimations = content.some(
      item => item.model_type === 'link' && item.animation,
    );
    if (enableLinkAnimations && hasAnimations) {
      import('@app/dashboard/biolink/biolink-editor/content/link-content-item/animate.min.css');
    }
  }, [enableLinkAnimations, content]);

  const isSidebar = appearance?.layout === 'profile-sidebar';

  return (
    <div className="@container">
      <div
        className={cn('isolate', !isSidebar && '@2xl:pt-10', className)}
        style={{
          fontFamily: appearance?.fontConfig?.family,
        }}
      >
        <div
          className={cn(
            'fixed inset-0 z-1 after:absolute after:inset-0 after:bg-black/20 after:backdrop-blur-sm',
            !isSidebar && 'hidden @2xl:block',
          )}
        >
          <Background appearance={appearance} />
        </div>

        <div
          className={cn(
            isSidebar
              ? 'relative z-2 min-h-screen overflow-hidden'
              : 'relative z-2 mx-auto min-h-screen max-w-2xl overflow-hidden @2xl:min-h-[calc(100vh-2.5rem)] @2xl:rounded-t-card @2xl:shadow-2xl',
          )}
          style={{
            color: appearance?.bgConfig?.color,
          }}
        >
          {!isSidebar && <Background className="z-3" appearance={appearance} />}

          {isSidebar ? (
            <SidebarLayout
              biolink={biolink}
              appearance={appearance}
              content={content}
              showAds={showAds}
            />
          ) : (
            <DefaultLayout
              biolink={biolink}
              appearance={appearance}
              content={content}
              showAds={showAds}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface SidebarLayoutProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  content: NonNullable<Biolink['content']>;
  showAds: boolean | undefined;
}

function SidebarLayout({
  biolink,
  appearance,
  content,
  showAds,
}: SidebarLayoutProps) {
  const activeContent = content.filter(item => {
    if (!item.active) return false;
    return true;
  });

  const socialsWidget = activeContent.find(
    item => item.model_type === 'biolinkWidget' && item.type === 'socials',
  ) as BiolinkWidget | undefined;

  const nonShopContent = activeContent.filter(item => {
    if (item.model_type === 'biolinkWidget' && item.type === 'socials')
      return false;
    if (item.model_type === 'biolinkWidget' && item.type === 'shop')
      return false;
    return true;
  });

  const shopWidgets = activeContent.filter(
    item => item.model_type === 'biolinkWidget' && item.type === 'shop',
  ) as BiolinkWidget[];
  const shopWidget = shopWidgets.at(-1);

  if (!shopWidget) {
    return (
      <DefaultLayout
        biolink={biolink}
        appearance={appearance}
        content={content}
        showAds={showAds}
      />
    );
  }

  return (
    <main className="relative z-4 px-4 py-5 sm:px-6 sm:py-7 @2xl:px-8 @2xl:py-8">
      <div className="mx-auto grid w-full max-w-[92rem] gap-8 @2xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] @2xl:items-start @2xl:gap-10">
        <section
          className="min-w-0 overflow-hidden rounded-card bg-background/45 p-4 text-foreground shadow-lg shadow-black/10 ring-1 ring-white/15 backdrop-blur-sm sm:p-5"
          aria-label="Biolink profile and links"
        >
          <ProfileCard
            biolink={biolink}
            socialsWidget={socialsWidget}
          />

          {showAds && <AdHost slot="biolink_top" className="mt-6" />}

          <div className="mt-6 flex w-full flex-col gap-3.5 @2xl:gap-4">
            {nonShopContent.map(item => {
              const key = `${item.model_type}-${item.id}`;
              let renderedItem: ReactElement;
              if (item.model_type === 'link') {
                renderedItem = (
                  <LinkButton appearance={appearance} link={item} />
                );
              } else {
                const Widget = WidgetRenderers[item.type];
                renderedItem = (
                  <Widget
                    widget={item}
                    variant="biolinkPage"
                    biolink={biolink}
                  />
                );
              }
              return (
                <div className="w-full" key={key}>
                  {renderedItem}
                </div>
              );
            })}
          </div>

          <div className="pt-8">
            <Branding appearance={appearance} />
          </div>
        </section>

        <section
          className="min-w-0 @2xl:pt-1"
          aria-label="Digital products"
        >
          <ShopColumn widget={shopWidget} biolink={biolink} />
        </section>
      </div>
    </main>
  );
}

function ShopColumn({
  widget,
  biolink,
}: {
  widget: BiolinkWidget;
  biolink: Biolink;
}) {
  const Widget = WidgetRenderers[widget.type];

  return (
    <Widget
      key={`${widget.model_type}-${widget.id}`}
      widget={{
        ...widget,
        config: {
          ...widget.config,
          title: 'Digital Products',
        },
      }}
      variant="biolinkPage"
      biolink={biolink}
    />
  );
}

interface DefaultLayoutProps {
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
  content: NonNullable<Biolink['content']>;
  showAds: boolean | undefined;
}

function DefaultLayout({
  biolink,
  appearance,
  content,
  showAds,
}: DefaultLayoutProps) {
  return (
    <div className="relative z-4 flex flex-col p-6">
      <div className="flex-auto">
        {showAds && <AdHost slot="biolink_top" className="mb-15" />}
        {content.map(item => {
          if (!item.active) {
            return null;
          }

          const key = `${item.model_type}-${item.id}`;
          let renderedItem: ReactElement;
          if (item.model_type === 'link') {
            renderedItem = (
              <LinkButton appearance={appearance} link={item} />
            );
          } else {
            const Widget = WidgetRenderers[item.type];
            renderedItem = (
              <Widget
                widget={item}
                variant="biolinkPage"
                biolink={biolink}
              />
            );
          }

          return (
            <div className="mb-3.5 w-full" key={key}>
              {renderedItem}
            </div>
          );
        })}
      </div>
      <Branding appearance={appearance} />
    </div>
  );
}

interface ProfileCardProps {
  biolink: Biolink;
  socialsWidget?: BiolinkWidget;
}

function ProfileCard({biolink, socialsWidget}: ProfileCardProps) {
  const displayName = biolink.user?.name || biolink.name;
  const avatar = biolink.user?.image;

  return (
    <div className="flex flex-col items-center text-center">
      <Avatar.Root size="lg" className="size-20 ring-2 ring-background">
        {avatar ? (
          <Avatar.Image src={avatar} alt={displayName} />
        ) : (
          <Avatar.ColorFallback className="text-3xl">
            {displayName?.charAt(0)?.toUpperCase() ?? <UserIcon />}
          </Avatar.ColorFallback>
        )}
      </Avatar.Root>

      <h1 className="mt-4 text-xl font-semibold leading-tight">{displayName}</h1>
      {biolink.name && biolink.name !== displayName && (
        <p className="mt-1 text-sm opacity-70">@{biolink.name}</p>
      )}

      {socialsWidget && (
        <div className="mt-4 w-full">
          {(() => {
            const Widget = WidgetRenderers[socialsWidget.type];
            return (
              <Widget
                widget={socialsWidget}
                variant="biolinkPage"
                biolink={biolink}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

interface LinkButtonProps {
  link: BiolinkLink;
  appearance?: BiolinkAppearanceConfig | null;
}
function LinkButton({link, appearance}: LinkButtonProps) {
  const variant = appearance?.btnConfig?.variant ?? 'solid';
  const radius: BiolinkAppearanceConfigBtnConfig['radius'] =
    appearance?.btnConfig?.radius ?? 'rounded-sm';
  const shadow: BiolinkAppearanceConfigBtnConfig['shadow'] =
    appearance?.btnConfig?.shadow ?? undefined;
  const buttonColor: BiolinkAppearanceConfigBtnConfig['color'] =
    appearance?.btnConfig?.color ?? undefined;
  const buttonTextColor = appearance?.btnConfig?.textColor ?? undefined;

  return (
    <a
      className={cn(
        'relative flex h-14 w-full appearance-none items-center justify-center rounded border py-4 align-middle text-sm font-semibold wrap-break-word hyphens-auto whitespace-normal no-underline transition-button duration-200 outline-none select-none focus-visible:ring',
        link.animation &&
          `animate__animated animate__repeat-3 animate__${link.animation}`,
        radius,
        link.image ? 'px-16.5' : 'px-4.5',
        !buttonColor &&
          (variant === 'outline'
            ? 'border-primary'
            : 'border-primary bg-primary'),
        !buttonTextColor &&
          (variant === 'outline' ? 'text-primary' : 'text-primary-foreground'),
      )}
      style={{
        boxShadow: shadow ? availableShadows[shadow] : undefined,
        borderColor:
          variant === 'solid' || variant === 'outline'
            ? buttonColor
            : variant === 'glass'
              ? 'transparent'
              : undefined,
        color: buttonTextColor,
        backdropFilter:
          appearance?.btnConfig?.variant === 'glass'
            ? 'blur(20px) brightness(1.1) contrast(0.9)'
            : undefined,
        background:
          appearance?.btnConfig?.variant === 'glass'
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%), rgba(255, 255, 255, 0.1)'
            : variant === 'solid'
              ? buttonColor
              : undefined,
      }}
      target="_blank"
      href={link.short_url}
    >
      {link.image ? (
        <img
          className={cn(
            'absolute top-1/2 left-2.5 aspect-square h-[calc(100%-18px)] -translate-y-1/2 object-cover',
            radius,
          )}
          src={link.image}
          alt=""
          loading="lazy"
        />
      ) : null}
      {link.name}
    </a>
  );
}

const availableShadows: Record<BiolinkAppearanceConfigBtnConfigShadow, string> =
  {
    none: '',
    soft: 'rgb(0 0 0 / 20%) 0.2rem 0.2rem 0.4rem 0px',
    strong: 'rgb(0 0 0 / 30%) 0.3rem 0.3rem 0.4rem 0px',
    hard: 'rgb(0 0 0 / 75%) 0.3rem 0.4rem 0px',
  } as const;

function Branding({appearance}: {appearance?: BiolinkAppearanceConfig | null}) {
  const {branding, biolink} = useSettings();
  let src = biolink?.branding_img;
  const {trans} = useTrans();
  let isDarkMode = useIsDarkMode();

  const isContrastDarkMode = useMemo(() => {
    if (!appearance?.bgConfig?.color) {
      return isDarkMode;
    }
    const color = new Color(appearance?.bgConfig?.color);
    return color.luminance > 0.5;
  }, [isDarkMode, appearance?.bgConfig?.color]);

  if (appearance?.hideBranding) {
    return null;
  }

  if (!src) {
    src = isContrastDarkMode ? branding.logo_light : branding.logo_dark;
  }

  return (
    <div className="shrink-0">
      <Link to="/">
        <img
          className="mx-auto h-6 w-auto"
          src={src}
          alt={trans(
            message(':site logo', {values: {site: branding.site_name}}),
          )}
        />
      </Link>
    </div>
  );
}

function Background({
  appearance,
  className,
}: {
  appearance: BiolinkAppearanceConfig | null;
  className?: string;
}) {
  const bgTintStyle = getBgTintStyle(appearance?.bgConfig?.tint);
  const bgEffectStyle = getImageBackgroundEffectStyle(
    appearance?.bgConfig?.imageEffect,
    appearance?.bgConfig?.noise,
  );

  return (
    <div
      className={cn(
        'pointer-events-none absolute size-full overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute inset-0 mx-auto"
        style={{
          ...cssPropsFromBgConfig(appearance?.bgConfig),
          ...bgEffectStyle,
        }}
      />
      <ImageBackgroundEffectOverlay
        effect={appearance?.bgConfig?.imageEffect}
      />
      {bgTintStyle && (
        <div className="absolute inset-0 mx-auto" style={bgTintStyle} />
      )}
      {appearance?.bgConfig?.noise && <NoiseFilter />}
    </div>
  );
}

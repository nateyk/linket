import {WidgetRenderers} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderers';
import {
  CreatorProfileConfig,
  isCreatorProfileBiolink,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {
  CreatorProfileLayout,
  CreatorProfilePreview,
} from '@app/short-links/renderers/biolink-renderer/creator-profile-layout';
import {
  resolveBiolinkButtonAppearance,
  resolveBiolinkThemeVariables,
  shouldUseLightBiolinkLogo,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
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
import {cn} from '@ui/utils/cn';
import {ReactElement, useEffect} from 'react';
import {Link} from 'react-router';

interface BiolinkLayoutProps {
  biolink: Biolink;
  appearance?: BiolinkAppearanceConfig | null;
  content?: Biolink['content'];
  className?: string;
  enableLinkAnimations?: boolean;
  showAds?: boolean;
  isPreview?: boolean;
  creatorProfileOnly?: boolean;
  profileConfig?: CreatorProfileConfig;
}
export function BiolinkLayout({
  biolink,
  className,
  appearance,
  content,
  enableLinkAnimations,
  showAds,
  isPreview,
  creatorProfileOnly,
  profileConfig,
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
      import('@app/dashboard/stores/store-editor/content/link-content-item/animate.min.css');
    }
  }, [enableLinkAnimations, content]);

  const isSidebar = true;

  return (
    <div className={cn('@container', isPreview && 'h-full')}>
      <div
        className={cn(
          'isolate',
          isPreview && 'relative h-full overflow-hidden',
          !isPreview && !isSidebar && '@2xl:pt-10',
          className,
        )}
        style={{
          fontFamily: appearance?.fontConfig?.family,
        }}
      >
        {!isPreview && (
          <div
            className={cn(
              'fixed inset-0 z-1',
              !isSidebar && 'hidden @2xl:block',
            )}
          >
            <Background appearance={appearance} />
          </div>
        )}

        <div
          className={cn(
            isPreview
              ? 'relative z-2 h-full min-h-full overflow-x-hidden'
              : isSidebar
                ? 'relative z-2 min-h-screen overflow-hidden'
                : 'relative z-2 mx-auto min-h-screen max-w-2xl overflow-hidden @2xl:min-h-[calc(100vh-2.5rem)] @2xl:rounded-t-card @2xl:shadow-2xl',
          )}
          style={{
            ...resolveBiolinkThemeVariables(appearance),
            color: 'var(--biolink-text)',
          }}
        >
          {(!isSidebar || isPreview) && (
            <Background
              className={cn('z-3', isPreview && 'inset-0 size-auto')}
              appearance={appearance}
            />
          )}

          {isCreatorProfileBiolink(biolink) && creatorProfileOnly ? (
            <CreatorProfilePreview
              biolink={biolink}
              appearance={appearance}
              profileConfig={profileConfig}
              content={content}
            />
          ) : isCreatorProfileBiolink(biolink) ? (
            <CreatorProfileLayout
              biolink={biolink}
              appearance={appearance}
              content={content}
              profileConfig={profileConfig}
              showAds={showAds}
            />
          ) : isSidebar ? (
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

  const nonShopContent = activeContent.filter(item => {
    if (item.model_type === 'biolinkWidget' && item.type === 'shop')
      return false;
    return true;
  });

  const shopWidgets = activeContent.filter(
    item => item.model_type === 'biolinkWidget' && item.type === 'shop',
  ) as BiolinkWidget[];
  const shopWidget = shopWidgets.at(-1);

  return (
    <main className="relative z-4 px-4 py-5 sm:px-6 sm:py-7 @2xl:px-8 @2xl:py-8">
      <div
        className={cn(
          'mx-auto grid w-full max-w-[92rem] gap-8 @2xl:items-start @2xl:gap-10',
          shopWidget && '@2xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]',
          !shopWidget && '@2xl:max-w-[420px]',
        )}
      >
        <section
          className="min-w-0 overflow-hidden rounded-card bg-background/45 p-4 text-foreground shadow-lg ring-1 shadow-black/10 ring-white/15 backdrop-blur-sm sm:p-5"
          aria-label="Biolink profile and links"
        >
          {showAds && <AdHost slot="biolink_top" className="mb-6" />}

          <div className="flex w-full flex-col gap-3.5 @2xl:gap-4">
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

        {shopWidget && (
          <section className="min-w-0 @2xl:pt-1" aria-label="Digital products">
            <ShopColumn widget={shopWidget} biolink={biolink} />
          </section>
        )}
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
      widget={widget}
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
            renderedItem = <LinkButton appearance={appearance} link={item} />;
          } else {
            const Widget = WidgetRenderers[item.type];
            renderedItem = (
              <Widget widget={item} variant="biolinkPage" biolink={biolink} />
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

interface LinkButtonProps {
  link: BiolinkLink;
  appearance?: BiolinkAppearanceConfig | null;
}
function LinkButton({link, appearance}: LinkButtonProps) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  return (
    <a
      className={cn(
        'relative flex h-14 w-full appearance-none items-center justify-center py-4 align-middle text-sm font-semibold wrap-break-word hyphens-auto whitespace-normal no-underline outline-none select-none',
        link.animation &&
          `animate__animated animate__repeat-3 animate__${link.animation}`,
        buttonAppearance.className,
        link.image ? 'px-16.5' : 'px-4.5',
      )}
      style={buttonAppearance.style}
      target="_blank"
      href={link.short_url}
    >
      {link.image ? (
        <img
          className={cn(
            'absolute top-1/2 left-2.5 aspect-square h-[calc(100%-18px)] -translate-y-1/2 object-cover',
            buttonAppearance.radius,
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

function Branding({appearance}: {appearance?: BiolinkAppearanceConfig | null}) {
  const {branding, biolink} = useSettings();
  let src = biolink?.branding_img;
  const {trans} = useTrans();
  let isDarkMode = useIsDarkMode();

  const useLightLogo = shouldUseLightBiolinkLogo(appearance, isDarkMode);

  if (appearance?.hideBranding) {
    return null;
  }

  if (!src) {
    src = useLightLogo ? branding.logo_light : branding.logo_dark;
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

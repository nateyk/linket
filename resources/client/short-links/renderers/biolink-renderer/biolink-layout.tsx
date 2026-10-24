import {WidgetRenderers} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderers';
import {
  CreatorProfileConfig,
  isCreatorProfileBiolink,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {StorePreviewSection} from '@app/dashboard/stores/store-editor/store-preview-protocol';
import {CreatorProfileLayout} from '@app/short-links/renderers/biolink-renderer/creator-profile-layout';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
  resolveBiolinkThemeVariables,
  shouldUseLightBiolinkLogo,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
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
  profileConfig?: CreatorProfileConfig;
  /** Section the editor's current tab maps to; only set in preview mode. */
  previewSection?: StorePreviewSection;
}
export function BiolinkLayout({
  biolink,
  className,
  appearance,
  content,
  enableLinkAnimations,
  showAds,
  profileConfig,
  previewSection,
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
      loadFonts([appearance?.fontConfig], {
        id,
        weights: [400, 500, 600, 700],
      });
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

  return (
    <div className="@container">
      <div
        className={cn('isolate', className)}
        style={{
          fontFamily: appearance?.fontConfig?.family,
        }}
      >
        <div className="fixed inset-0 z-1">
          {/* Creator profiles paint the same background again inside the
              sticky tab strip, so both copies anchor to the viewport
              instead of their (differently sized) boxes. */}
          <Background
            appearance={appearance}
            viewportFixed={isCreatorProfileBiolink(biolink)}
          />
        </div>

        {/* overflow-x-clip (NOT overflow-x-hidden) keeps the background
            from painting past the edges without creating a scroll container
            — a hidden axis computes the other to `auto` and silently kills
            the sticky CreatorCard inside. */}
        <div
          className="relative z-2 min-h-screen overflow-x-clip"
          style={{
            ...resolveBiolinkThemeVariables(appearance),
            color: 'var(--biolink-text)',
          }}
        >
          {isCreatorProfileBiolink(biolink) ? (
            <CreatorProfileLayout
              biolink={biolink}
              appearance={appearance}
              content={content}
              profileConfig={profileConfig}
              showAds={showAds}
              previewSection={previewSection}
            />
          ) : (
            <SidebarLayout
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
          className={cn(
            'min-w-0 overflow-hidden rounded-card bg-[var(--biolink-surface)] p-4 text-[var(--biolink-text)] backdrop-blur-sm sm:p-5',
            biolinkSurfaceEdgeClassName,
          )}
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
            <ShopColumn
              widget={shopWidget}
              biolink={biolink}
              appearance={appearance}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function ShopColumn({
  widget,
  biolink,
  appearance,
}: {
  widget: BiolinkWidget;
  biolink: Biolink;
  appearance: BiolinkAppearanceConfig | null;
}) {
  const Widget = WidgetRenderers[widget.type];

  return (
    <Widget
      key={`${widget.model_type}-${widget.id}`}
      widget={widget}
      variant="biolinkPage"
      biolink={biolink}
      appearance={appearance}
    />
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
      aria-label={link.name || link.short_url}
    >
      {link.image ? (
        <img
          className="absolute top-1/2 left-2.5 aspect-square h-[calc(100%-18px)] -translate-y-1/2 rounded-button object-cover"
          src={link.image}
          alt=""
          loading="lazy"
        />
      ) : null}
      {link.name || link.short_url}
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
    // The branding lockup renders at 24px (h-6) — use the small cut files
    // (<=24px rule), falling back to the full-size slot when unset.
    src = useLightLogo
      ? branding.logo_light_mobile || branding.logo_light
      : branding.logo_dark_mobile || branding.logo_dark;
  }

  return (
    <div className="shrink-0">
      <Link to="/" className="flex items-center justify-center gap-1.5">
        <img
          className="h-6 w-auto"
          src={src}
          alt={trans(
            message(':site logo', {values: {site: branding.site_name}}),
          )}
        />
      </Link>
    </div>
  );
}

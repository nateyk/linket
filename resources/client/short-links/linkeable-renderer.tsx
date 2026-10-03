import {CreatorProfileConfig} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {PasswordPage} from '@app/short-links/password-page';
import {BiolinkRenderer} from '@app/short-links/renderers/biolink-renderer/biolink-renderer';
import {FolderRenderer} from '@app/short-links/renderers/folder-renderer';
import {LinkIframeRenderer} from '@app/short-links/renderers/link-iframe-renderer';
import {LinkOverlayRenderer} from '@app/short-links/renderers/link-overlay-renderer';
import {LinkPageRenderer} from '@app/short-links/renderers/link-page-renderer';
import {LinkSplashRenderer} from '@app/short-links/renderers/link-splash-renderer';
import {
  PublicDigitalProductOrderSuccessPage,
  PublicDigitalProductPage,
} from '@app/digital-products/public/digital-product-public-pages';
import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {useEffect, useState} from 'react';

type Linkeable = LinkType | Folder | Biolink;

/**
 * The editor frames this route in the phone preview (`?preview=1`) and
 * streams draft edits over postMessage; the frame never reloads.
 */
const PREVIEW_PARAM = 'preview';
const PREVIEW_MESSAGE = 'linket:store-preview';
const PREVIEW_READY_MESSAGE = 'linket:store-preview-ready';
/* iPhone 14 Pro: status bar + Dynamic Island / home indicator zone. */
const PREVIEW_SAFE_TOP = '59px';
const PREVIEW_SAFE_BOTTOM = '34px';

interface PreviewSyncPayload {
  biolink: Partial<Biolink>;
  appearance: BiolinkAppearanceConfig;
  content: NonNullable<Biolink['content']>;
  profileConfig: CreatorProfileConfig;
}

interface PreviewState {
  biolink: Linkeable;
  appearance?: BiolinkAppearanceConfig;
  content?: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  isPreview: boolean;
}

/**
 * Preview mode only: publishes the device safe-area insets as CSS
 * variables and merges the editor's draft state as it changes. Outside
 * `?preview=1` this is a no-op and the page renders exactly as live.
 */
function usePreviewSync(initial: Linkeable | undefined): PreviewState {
  const isPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has(PREVIEW_PARAM);

  const [biolink, setBiolink] = useState<Linkeable | undefined>(initial);
  const [overrides, setOverrides] = useState<
    Omit<PreviewState, 'biolink' | 'isPreview'>
  >({});

  useEffect(() => {
    if (!isPreview) return;

    const root = document.documentElement;
    root.style.setProperty('--safe-top', PREVIEW_SAFE_TOP);
    root.style.setProperty('--safe-bottom', PREVIEW_SAFE_BOTTOM);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as
        | {type?: string; payload?: PreviewSyncPayload}
        | undefined;
      if (msg?.type !== PREVIEW_MESSAGE || !msg.payload) return;
      const payload = msg.payload;
      setBiolink(prev =>
        prev
          ? ({
              ...prev,
              ...payload.biolink,
              // The editor entity is a Store (`model_type: 'store'`), but
              // this route resolved as a biolink page — keep the type the
              // server rendered so the renderer switch stays on biolink.
              model_type: prev.model_type,
            } as Linkeable)
          : prev,
      );
      setOverrides({
        appearance: payload.appearance,
        content: payload.content,
        profileConfig: payload.profileConfig,
      });
    };
    window.addEventListener('message', onMessage);
    // The editor may have posted before this listener attached — ask it
    // for the current draft so the frame never shows stale server data.
    window.parent.postMessage(
      {type: PREVIEW_READY_MESSAGE},
      window.location.origin,
    );

    return () => {
      window.removeEventListener('message', onMessage);
      root.style.removeProperty('--safe-top');
      root.style.removeProperty('--safe-bottom');
    };
  }, [isPreview]);

  return {
    biolink: (biolink ?? initial) as Linkeable,
    ...overrides,
    isPreview,
  };
}

export function Component() {
  const loaders = getBootstrapData().loaders;
  const linkeablePage = loaders?.linkeablePage;
  const preview = usePreviewSync(linkeablePage?.data);

  if (loaders?.digitalProductPage) {
    return <PublicDigitalProductPage data={loaders.digitalProductPage.data} />;
  }

  if (loaders?.digitalProductOrderSuccessPage) {
    return (
      <PublicDigitalProductOrderSuccessPage
        data={loaders.digitalProductOrderSuccessPage.data}
      />
    );
  }

  if (!linkeablePage) {
    return <NotFoundPage />;
  }

  return (
    <LinkeableRenderer
      linkeable={preview.biolink ?? linkeablePage.data}
      appearance={preview.appearance}
      content={preview.content}
      profileConfig={preview.profileConfig}
      preview={preview.isPreview}
    />
  );
}

export function LinkeableRenderer({
  linkeable,
  appearance,
  content,
  profileConfig,
  preview = false,
}: {
  linkeable: Linkeable;
  appearance?: BiolinkAppearanceConfig;
  content?: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  preview?: boolean;
}) {
  const [passwordValid, setPasswordValid] = useState(!linkeable.password);
  if (linkeable.password && !passwordValid) {
    return (
      <PasswordPage
        linkeable={linkeable}
        onPasswordValid={() => setPasswordValid(true)}
      />
    );
  }

  switch (linkeable.model_type) {
    case 'link':
      return getLinkRenderer(linkeable);
    case 'folder':
      return <FolderRenderer folder={linkeable} />;
    case 'biolink':
      return (
        <BiolinkRenderer
          biolink={linkeable}
          appearance={appearance}
          content={content}
          profileConfig={profileConfig}
          preview={preview}
        />
      );
    default:
      return <NotFoundPage />;
  }
}

function getLinkRenderer(link: LinkType) {
  switch (link.type) {
    case 'frame':
      return <LinkIframeRenderer link={link} />;
    case 'overlay':
      return <LinkOverlayRenderer link={link} />;
    case 'splash':
      return <LinkSplashRenderer link={link} />;
    case 'page':
      return <LinkPageRenderer link={link} />;
    case 'direct':
      window.location.replace(link.final_destination_url ?? link.long_url);
      return null;
    default:
      return <NotFoundPage />;
  }
}
